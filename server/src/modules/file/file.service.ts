import { randomUUID } from "node:crypto";
import { fileRepository } from "./file.repository.ts";
import {
  presignedPutObject,
  presignedGetObject,
  putObjectBuffer,
  removeObject,
} from "../../lib/oss.ts";
import { newObjectId } from "../../lib/id.ts";
import { getRedis } from "../../lib/redis.ts";
import { NotFoundError } from "../../common/errors/index.ts";

/** OSS 预签名 URL 有效期（秒） */
const PRESIGNED_EXPIRES_IN = 3600;
/** Redis 缓存 TTL，比签名有效期少 60 秒作为安全边界 */
const CACHE_TTL = PRESIGNED_EXPIRES_IN - 60;
const CACHE_KEY_PREFIX = "file:presigned:";

export interface PresignResult {
  fileId: string;
  uploadUrl: string;
}

export const fileService = {
  /** 预签名上传，并落 files 记录，只返回 fileId */
  async presign(input: {
    contentType?: string;
    ext?: string;
  }): Promise<PresignResult> {
    const contentType = input.contentType?.trim() || "application/octet-stream";
    const ext = (input.ext ?? "jpg").replace(/^\./, "");
    const key = `files/${newObjectId()}.${ext}`;

    const result = await presignedPutObject(key, contentType);
    const fileId = randomUUID();
    await fileRepository.create({
      id: fileId,
      bucket: "attachments",
      minioKey: key,
      mimeType: contentType,
    });
    return { fileId, uploadUrl: result.uploadUrl };
  },

  /** 代理上传：客户端直传服务端，转发到 OSS */
  async proxyUpload(input: {
    filename: string;
    mimetype?: string;
    stream: NodeJS.ReadableStream;
  }): Promise<{ fileId: string }> {
    const { filename, mimetype, stream } = input;
    const ext = filename.split(".").pop() || "jpg";
    const contentType = mimetype || "application/octet-stream";
    const key = `files/${newObjectId()}.${ext}`;

    // 缓冲到内存后一次性上传 OSS
    const chunks: Buffer[] = [];
    for await (const c of stream as any) {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    }
    const buffer = Buffer.concat(chunks);
    await putObjectBuffer(key, buffer, contentType);

    const fileId = randomUUID();
    await fileRepository.create({
      id: fileId,
      bucket: "attachments",
      minioKey: key,
      mimeType: contentType,
    });

    return { fileId };
  },

  /** 删除文件：删 MinIO 对象 + 删 files 表记录（任一失败仅记日志，不抛错，便于清理孤儿） */
  async deleteFile(id: string): Promise<void> {
    // 先取记录拿 minioKey；记录不存在视为已清理
    const file = await fileRepository.findById(id).catch(() => null);
    if (file) {
      try {
        await removeObject(file.minioKey);
      } catch (e) {
        // MinIO 对象不存在等情况忽略，继续清理表记录
      }
      await fileRepository.delete(id).catch(() => {});
    }
    // 清掉可能存在的预签名缓存
    try {
      await getRedis().del(`${CACHE_KEY_PREFIX}${id}`);
    } catch {
      // Redis 不可用时忽略
    }
  },

  /** 批量删除文件（串行调用 deleteFile，互不影响） */
  async deleteFiles(ids: string[]): Promise<void> {
    for (const id of [...new Set(ids)]) {
      await this.deleteFile(id);
    }
  },

  /** 取单个文件预签名下载 URL（带 Redis 缓存） */
  async getPresignedUrl(id: string): Promise<string> {
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    try {
      const cached = await getRedis().get(cacheKey);
      if (cached) return cached;
    } catch {
      // Redis 不可用时降级
    }

    const file = await fileRepository.findById(id);
    if (!file) throw new NotFoundError("文件不存在");

    const url = await presignedGetObject(file.minioKey, PRESIGNED_EXPIRES_IN);
    try {
      await getRedis().set(cacheKey, url, "EX", CACHE_TTL);
    } catch {
      // 缓存写入失败不影响主流程
    }
    return url;
  },

  /** 批量取预签名 URL */
  async getPresignedUrls(ids: string[]): Promise<Record<string, string>> {
    const uniqueIds = [...new Set(ids)];
    const entries = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          return [id, await this.getPresignedUrl(id)] as const;
        } catch {
          return [id, ""] as const;
        }
      })
    );
    const data: Record<string, string> = {};
    for (const [id, url] of entries) if (url) data[id] = url;
    return data;
  },
};
