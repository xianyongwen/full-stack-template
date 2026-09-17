import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { fileController } from "./file.controller.ts";
import {
  batchFilesSchema,
  fileParamsSchema,
  presignBodySchema,
} from "./file.schema.ts";

export const fileRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    "/uploads/presign",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["uploads"],
        summary: "获取上传预签名（返回 fileId，不再暴露 publicUrl）",
        body: presignBodySchema,
      },
    },
    fileController.presign as any
  );

  app.post(
    "/uploads/proxy",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["uploads"],
        summary: "代理上传文件到 OSS（返回 fileId）",
        consumes: ["multipart/form-data"],
      },
    },
    fileController.proxyUpload
  );

  app.get(
    "/files/:id",
    {
      schema: {
        tags: ["files"],
        summary: "根据文件 ID 重定向到 OSS 预签名链接（Redis 缓存）",
        params: fileParamsSchema,
        security: [],
      },
      config: { rateLimit: { max: 200, timeWindow: "1 minute" } },
    },
    fileController.redirect
  );

  app.post(
    "/files/batch",
    {
      schema: {
        tags: ["files"],
        summary: "批量获取文件预签名链接（Redis 缓存）",
        body: batchFilesSchema,
        security: [],
      },
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    fileController.batch
  );
};
