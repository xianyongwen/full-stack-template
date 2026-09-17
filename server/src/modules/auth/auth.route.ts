import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { authController } from "./auth.controller.ts";
import { loginSchema } from "./auth.schema.ts";

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /** POST /auth/login */
  app.post("/auth/login", { schema: loginSchema }, authController.login);

  /** GET /auth/userinfo —— 需登录 */
  app.get(
    "/auth/userinfo",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "获取当前登录用户信息（含角色、权限点、菜单树）",
      },
    },
    authController.userinfo
  );

  /** POST /auth/logout */
  app.post(
    "/auth/logout",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "退出登录",
      },
    },
    authController.logout
  );
};
