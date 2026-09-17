import type { FastifyReply, FastifyRequest } from "fastify";
import { fileService } from "./file.service.ts";
import { NotFoundError } from "../../common/errors/index.ts";

export const fileController = {
  /** POST /uploads/presign */
  async presign(req: FastifyRequest) {
    const data = await fileService.presign(req.body as { contentType?: string; ext?: string });
    return { code: "ok", message: "ok", data };
  },

  /** POST /uploads/proxy (multipart) —— 上传并返回 fileId */
  async proxyUpload(req: FastifyRequest, reply: FastifyReply) {
    const data = await req.file();
    if (!data) throw new NotFoundError("缺少文件");
    const result = await fileService.proxyUpload({
      filename: data.filename,
      mimetype: data.mimetype,
      stream: data.file,
    });
    return { code: "ok", message: "ok", data: { fileId: result.fileId } };
  },

  /** GET /files/:id —— 重定向到 OSS 预签名链接 */
  async redirect(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const url = await fileService.getPresignedUrl(req.params.id);
    reply.header("Cache-Control", "public, max-age=300");
    return reply.redirect(url);
  },

  /** POST /files/batch */
  async batch(req: FastifyRequest<{ Body: { ids: string[] } }>, reply: FastifyReply) {
    const data = await fileService.getPresignedUrls(req.body.ids);
    reply.header("Cache-Control", "public, max-age=300");
    return { code: "ok", message: "ok", data };
  },
};
