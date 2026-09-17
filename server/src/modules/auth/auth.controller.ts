import type { FastifyReply, FastifyRequest } from "fastify";
import { authService } from "./auth.service.ts";
import type { LoginDTO } from "./auth.schema.ts";

export const authController = {
  /** POST /auth/login */
  async login(req: FastifyRequest<{ Body: LoginDTO }>, reply: FastifyReply) {
    const { username, password } = req.body;
    const result = await authService.login(username, password, (payload) =>
      reply.jwtSign({ userId: payload.userId })
    );
    return {
      code: "ok",
      message: "登录成功",
      data: {
        token: result.token,
        userId: result.userId,
        username: result.username,
        nickname: result.nickname,
      },
    };
  },

  /** GET /auth/userinfo —— 当前用户信息 + 权限点 */
  async userinfo(req: FastifyRequest) {
    const user = req.currentUser!;
    const menuTree = await authService.getMenuTree(user);
    return {
      code: "ok",
      message: "ok",
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        deptId: user.deptId,
        roles: user.roleCodes,
        permissions: authService.getPermissions(user),
        menus: menuTree,
      },
    };
  },

  /** POST /auth/logout —— 无状态 JWT，前端丢弃 token 即可；此接口仅占位 */
  async logout() {
    return { code: "ok", message: "已退出", data: null };
  },
};
