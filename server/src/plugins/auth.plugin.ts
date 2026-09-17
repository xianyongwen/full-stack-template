import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getClient } from "../prisma/transaction-context.ts";
import { ROLE_CODES } from "../common/constants/system.ts";
import type { CurrentUser, JwtPayload } from "../types/fastify.d.ts";
import { userCache } from "../lib/user-cache.ts";

/**
 * 加载当前用户的角色与权限点（优先从 Redis 缓存读取）。
 * 用于：authenticate 注入 currentUser、登录后签发 token 前校验状态。
 */
export async function loadCurrentUser(
  userId: string
): Promise<CurrentUser | null> {
  const cached = await userCache.get(userId);
  if (cached) return cached;

  const db = getClient();
  const user = await db.sysUser.findFirst({
    where: { id: userId, deleted: 0 },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });
  if (!user || user.status !== 1) return null;

  const roles = user.roles.map((ur) => ur.role);
  const roleCodes = roles.map((r) => r.roleCode);
  const isSuperAdmin = roleCodes.includes(ROLE_CODES.SUPER_ADMIN);

  // 超管不需要具体权限点；普通用户聚合其所有角色的权限点
  const permissions = isSuperAdmin
    ? ["*"]
    : [
        ...new Set(
          roles
            .flatMap((r) => r.permissions)
            .map((rp) => rp.permission.permCode)
            .filter((c): c is string => Boolean(c))
        ),
      ];

  const current: CurrentUser = {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    deptId: user.deptId,
    roleCodes,
    permissions,
    isSuperAdmin,
  };

  await userCache.set(userId, current);
  return current;
}

/**
 * 注册鉴权能力：decorate authenticate。
 *  - 解析 JWT
 *  - 加载 currentUser（角色 + 权限点）
 *  - 路由级权限点校验（config.permission）
 */
export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      let payload;
      try {
        payload = await request.jwtVerify();
      } catch {
        return reply.code(401).send({ code: "UNAUTHORIZED", message: "登录已失效", data: null });
      }
      const userId = (payload as JwtPayload).userId;
      const current = await loadCurrentUser(userId);
      if (!current) {
        return reply
          .code(401)
          .send({ code: "UNAUTHORIZED", message: "用户不存在或已停用", data: null });
      }
      request.currentUser = current;

      // 路由级权限点（粗粒度授权）。细粒度数据归属判断在 Service 里做。
      const required = request.routeOptions.config?.permission;
      if (required && required.length > 0 && !current.isSuperAdmin) {
        const ok = required.every((p) => current.permissions.includes(p));
        if (!ok) {
          return reply
            .code(403)
            .send({ code: "FORBIDDEN", message: "无权限", data: null });
        }
      }
    }
  );
}

export type { CurrentUser };
