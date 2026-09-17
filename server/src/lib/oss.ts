import { Client } from "minio";
import { Readable } from "node:stream";
import { config } from "../config.js";

/** MinIO / S3 客户端单例（复用连接，避免每次 new Client()） */
let _client: Client | null = null;

function client(): Client {
  if (!_client) {
    _client = new Client({
      endPoint: config.minioEndpoint,
      port: config.minioPort,
      useSSL: config.minioUseSSL,
      accessKey: config.minioAccessKey,
      secretKey: config.minioSecretKey,
    });
  }
  return _client;
}

/** 根据 key 生成公开访问 URL（仅用于可公开读取的对象，预签名请用 presignedGetObject） */
export function publicUrlForKey(key: string): string {
  const base =
    config.publicObjectBaseUrl.replace(/\/$/, "") ||
    `${config.minioUseSSL ? "https" : "http"}://${config.minioEndpoint}:${config.minioPort}/${config.minioBucket}`;
  return `${base.replace(/\/$/, "")}/${key}`;
}

/** 生成预签名上传 URL */
export async function presignedPutObject(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const c = client();
  const uploadUrl = await c.presignedPutObject(
    config.minioBucket,
    key,
    expiresIn
  );
  if (contentType) {
    // 预签名 PUT URL 中带 Content-Type 约束，上传时需用相同值
    const u = new URL(uploadUrl);
    u.searchParams.set("Content-Type", encodeURIComponent(contentType));
    return {
      uploadUrl: u.toString(),
      key,
      publicUrl: publicUrlForKey(key),
    };
  }
  return { uploadUrl, key, publicUrl: publicUrlForKey(key) };
}

/** 上传 Buffer 到 MinIO */
export async function putObjectBuffer(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ publicUrl: string; key: string }> {
  const c = client();
  await c.putObject(config.minioBucket, key, body, body.length, {
    "Content-Type": contentType,
  });
  return { key, publicUrl: publicUrlForKey(key) };
}

/** 从 MinIO 获取文件流 */
export async function getObjectStream(key: string): Promise<Readable> {
  const c = client();
  const stream = await c.getObject(config.minioBucket, key);
  return stream as Readable;
}

/** 从 MinIO 删除对象（不存在时静默返回，便于清理孤儿引用） */
export async function removeObject(key: string): Promise<void> {
  const c = client();
  await c.removeObject(config.minioBucket, key);
}

/** 生成预签名下载 URL */
export async function presignedGetObject(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const c = client();
  return c.presignedGetObject(config.minioBucket, key, expiresIn);
}

/** 流式上传文件到 MinIO（分片上传，无需全量缓存到内存） */
export async function putObjectStream(
  key: string,
  body: Readable,
  contentType: string
): Promise<{ publicUrl: string; key: string }> {
  const c = client();
  await c.putObject(
    config.minioBucket,
    key,
    body,
    undefined,
    { "Content-Type": contentType }
  );
  return { key, publicUrl: publicUrlForKey(key) };
}

/** 启动时确保配置的 bucket 存在（不存在则自动创建），避免上传时报 NoSuchBucket */
export async function ensureBucket(): Promise<void> {
  const c = client();
  const exists = await c.bucketExists(config.minioBucket);
  if (!exists) {
    await c.makeBucket(config.minioBucket);
  }
}