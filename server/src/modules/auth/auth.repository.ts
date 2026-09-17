import { getClient } from "../../prisma/transaction-context.ts";

/**
 * Auth 模块的数据访问。
 * 登录需要带上角色，所以这里独立一条带 include 的查询，
 * 不复用 user.repository（避免 auth ↔ user 互相依赖）。
 */
export const authRepository = {
  /** 按用户名查询（含角色），登录用 */
  findByUsername(username: string) {
    return getClient().sysUser.findFirst({
      where: { username, deleted: 0 },
      include: {
        roles: { include: { role: true } },
      },
    });
  },
};
