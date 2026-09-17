import { getClient } from "../../prisma/transaction-context.ts";
import { authRepository } from "./auth.repository.ts";
import { verifyPassword } from "../../common/utils/password.ts";
import {
  BusinessError,
  UnauthorizedError,
} from "../../common/errors/index.ts";
import { ROLE_CODES, PERM_TYPE } from "../../common/constants/system.ts";
import { buildTree } from "../../common/utils/tree.ts";
import type { CurrentUser } from "../../types/fastify.d.ts";
import type { MenuTreeNode } from "./auth.schema.ts";

/** 登录结果 */
export interface LoginResult {
  token: string;
  userId: string;
  username: string;
  nickname: string | null;
}

export const authService = {
  /**
   * 账号密码登录。
   * @param signJwt 由 controller 注入：把 userId 签进 JWT。
   */
  async login(
    username: string,
    password: string,
    signJwt: (payload: { userId: string }) => Promise<string>
  ): Promise<LoginResult> {
    const user = await authRepository.findByUsername(username);
    if (!user) throw new UnauthorizedError("用户名或密码错误");
    if (user.status !== 1) throw new BusinessError("账号已被停用", "ACCOUNT_DISABLED");

    const ok = await verifyPassword(password, user.password);
    if (!ok) throw new UnauthorizedError("用户名或密码错误");

    const token = await signJwt({ userId: user.id });
    return {
      token,
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
    };
  },

  /** 当前用户的可访问菜单树（目录 + 菜单，不含按钮/API） */
  async getMenuTree(user: CurrentUser): Promise<MenuTreeNode[]> {
    const db = getClient();
    // 超管拿全部目录/菜单；普通用户按角色聚合
    let permIds: Set<string> | null = null;
    if (!user.isSuperAdmin) {
      const roleIds = (
        await db.sysRole.findMany({
          where: { roleCode: { in: user.roleCodes }, deleted: 0 },
          select: { id: true },
        })
      ).map((r) => r.id);
      const rels = await db.sysRolePermission.findMany({
        where: { roleId: { in: roleIds } },
        select: { permissionId: true },
      });
      permIds = new Set(rels.map((r) => r.permissionId));
    }

    const list = await db.sysPermission.findMany({
      where: {
        deleted: 0,
        status: 1,
        type: { in: [PERM_TYPE.DIRECTORY, PERM_TYPE.MENU] },
        ...(permIds ? { id: { in: [...permIds] } } : {}),
      },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
    });

    const nodes: MenuTreeNode[] = list.map((p) => ({
      id: p.id,
      parentId: p.parentId,
      permName: p.permName,
      permCode: p.permCode,
      type: p.type,
      path: p.code,
      component: p.component,
      icon: p.icon,
      sort: p.sort,
    }));

    return buildTree(nodes) as MenuTreeNode[];
  },

  /** 当前用户的权限点 code 列表（前端用于按钮显隐） */
  getPermissions(user: CurrentUser): string[] {
    return user.isSuperAdmin ? ["*"] : user.permissions;
  },
};
