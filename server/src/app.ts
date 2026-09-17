import "dotenv/config";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import Fastify from "fastify";
import { z } from "zod";
import { config } from "./config.ts";
import { createLoggerConfig } from "./lib/logger.ts";
import { connectRedis, disconnectRedis } from "./lib/redis.ts";
import { registerCronJobs } from "./cron.ts";
import {
  ensureSuperAdmin,
  ensureSeedPermissions,
  seedDictData,
} from "./seed.ts";

import { registerAuthPlugin } from "./plugins/auth.plugin.ts";
import { isBusinessError } from "./common/errors/index.ts";
import { ensureBucket } from "./lib/oss.ts";

import { authRoutes } from "./modules/auth/index.ts";
import { systemRoutes } from "./modules/system/index.ts";
import { fileRoutes } from "./modules/file/index.ts";

export async function buildApp() {
  const loggerConfig = await createLoggerConfig();
  const app = Fastify({ logger: loggerConfig });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(jwt, { secret: config.jwtSecret });

  // ── 鉴权能力：注入 authenticate ──
  await registerAuthPlugin(app);

  // ── 统一错误处理：把异常翻译成 HTTP 响应 ──
  app.setErrorHandler((err, req, reply) => {
    // 业务错误：保留 code/message，按其 httpStatus 返回
    if (isBusinessError(err)) {
      return reply.code(err.httpStatus).send({
        code: err.code,
        message: err.message,
        data: null,
      });
    }
    // Zod / Fastify 校验错误
    if (err instanceof Error && "validation" in err && (err as any).validation) {
      return reply.code(400).send({
        code: "VALIDATION_ERROR",
        message: err.message,
        data: null,
      });
    }
    // 兜底：记日志 + 500
    req.log.error(err);
    return reply.code(500).send({
      code: "INTERNAL_ERROR",
      message: "服务器内部错误",
      data: null,
    });
  });

  const port = Number(process.env.PORT ?? 8890);

  // ── Swagger 文档：仅非生产环境启用 ──
  if (config.nodeEnv !== "production") {
    await app.register(swagger, {
      transform: jsonSchemaTransform,
      openapi: {
        openapi: "3.0.3",
        info: {
          title: "API",
          description: "后端（Fastify + Prisma）",
          version: "1.0.0",
        },
        servers: [{ url: `http://127.0.0.1:${port}`, description: "本地开发" }],
        tags: [
          { name: "auth", description: "登录与鉴权" },
          { name: "system/user", description: "用户管理" },
          { name: "system/role", description: "角色管理" },
          { name: "system/menu", description: "菜单/权限管理" },
          { name: "system/dept", description: "部门管理" },
          { name: "uploads", description: "文件上传" },
          { name: "files", description: "文件访问" },
          { name: "system", description: "健康检查" },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description: "通过 /api/auth/login 获取 token，请求头：Authorization: Bearer <token>",
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    });
  }

  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    function (_req, body, done) {
      if (body === "") return done(null, {});
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        done(err as Error);
      }
    }
  );

  // ── 健康检查（无需鉴权）──
  app.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        description: "存活检查，无需鉴权",
        security: [],
        response: { 200: z.object({ ok: z.boolean() }).describe("服务正常") },
      },
    },
    async () => ({ ok: true })
  );

  // ── 业务路由，统一挂在 /api ──
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(systemRoutes, { prefix: "/api" });
  await app.register(fileRoutes, { prefix: "/api" });

  // ── Swagger UI：仅非生产环境启用 ──
  if (config.nodeEnv !== "production") {
    await app.register(swaggerUi, {
      routePrefix: "/apiDoc",
      uiConfig: { docExpansion: "list", deepLinking: true },
      staticCSP: false,
      transformStaticCSP: (header) => header,
    });
  }

  // ── 限流保护（按路由单独配置）──
  await app.register(rateLimit, { global: false });

  // ── 初始化：确保超级管理员用户存在 ──
  app.addHook("onReady", async () => {
    try {
      await ensureSuperAdmin(config.superAdminUsername, config.superAdminPassword);
      app.log.info("Super admin initialized");
    } catch (e) {
      app.log.warn(
        `Super admin initialization failed: ${(e as Error).message}`
      );
    }
  });

  // ── 初始化：确保菜单/权限种子数据存在 ──
  app.addHook("onReady", async () => {
    try {
      await ensureSeedPermissions();
      app.log.info("Seed permissions initialized");
    } catch (e) {
      app.log.warn(
        `Seed permissions initialization failed: ${(e as Error).message}`
      );
    }
  });

  // ── 初始化：确保系统字典种子数据存在（每次启动同步）──
  app.addHook("onReady", async () => {
    try {
      await seedDictData();
      app.log.info("Seed dict data initialized");
    } catch (e) {
      app.log.warn(
        `Seed dict data initialization failed: ${(e as Error).message}`
      );
    }
  });

  // ── Redis 生命周期 ──
  app.addHook("onReady", async () => {
    try {
      await connectRedis();
      app.log.info("Redis connected");
    } catch (e) {
      app.log.warn(
        `Redis connection failed, caching disabled: ${(e as Error).message}`
      );
    }
  });
  // ── MinIO bucket 初始化：缺失则自动创建 ──
  app.addHook("onReady", async () => {
    try {
      await ensureBucket();
      app.log.info(`MinIO bucket ready: ${config.minioBucket}`);
    } catch (e) {
      app.log.warn(
        `MinIO bucket init failed: ${(e as Error).message}`
      );
    }
  });
  app.addHook("onClose", async () => {
    await disconnectRedis();
  });

  // ── Cron 定时任务 ──
  if (config.enableCron) {
    registerCronJobs(app);
  }

  return app;
}
