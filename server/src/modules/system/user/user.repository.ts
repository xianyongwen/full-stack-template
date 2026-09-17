import { getClient } from "@/prisma/transaction-context";

/** 用户带部门、角色的标准 include */
const userInclude = {
  dept: { select: { deptName: true } },
  roles: { include: { role: { select: { id: true, roleName: true, roleCode: true } } } },
} as const;

export const userRepository = {
  paginate(args: { where: any; skip: number; take: number }) {
    return Promise.all([
      getClient().sysUser.findMany({
        where: args.where,
        skip: args.skip,
        take: args.take,
        orderBy: [{ createTime: "desc" }],
        include: userInclude,
      }),
      getClient().sysUser.count({ where: args.where }),
    ]);
  },

  findById(id: string) {
    return getClient().sysUser.findFirst({
      where: { id, deleted: 0 },
      include: userInclude,
    });
  },

  findByIdWithPassword(id: string) {
    return getClient().sysUser.findFirst({
      where: { id, deleted: 0 },
      select: { id: true, password: true },
    });
  },

  findByUsername(username: string) {
    return getClient().sysUser.findFirst({
      where: { username, deleted: 0 },
    });
  },

  /** 按部门（含子部门）查用户数，供数据权限使用 */
  countByDept(deptIds: string[]) {
    return getClient().sysUser.count({
      where: { deptId: { in: deptIds }, deleted: 0 },
    });
  },

  create(data: {
    username: string;
    password: string;
    nickname?: string;
    email?: string;
    phone?: string;
    deptId?: string;
    status?: number;
  }) {
    return getClient().sysUser.create({ data });
  },

  update(id: string, data: any) {
    return getClient().sysUser.update({
      where: { id },
      data,
      include: userInclude,
    });
  },

  updatePassword(id: string, password: string) {
    return getClient().sysUser.update({
      where: { id },
      data: { password },
    });
  },

  softDelete(id: string) {
    return getClient().sysUser.update({
      where: { id },
      data: { deleted: 1 },
    });
  },

  /** 用户当前角色 id */
  listRoleIds(userId: string) {
    return getClient().sysUserRole.findMany({
      where: { userId },
      select: { roleId: true },
    });
  },

  /** 全量覆盖用户的角色 */
  async replaceRoles(userId: string, roleIds: string[]) {
    const db = getClient();
    await db.sysUserRole.deleteMany({ where: { userId } });
    if (roleIds.length === 0) return;
    await db.sysUserRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  },

  /** 下拉选项：所有启用状态用户 { id, name, username } */
  findOptions() {
    return getClient().sysUser.findMany({
      where: { deleted: 0, status: 1 },
      select: { id: true, nickname: true, username: true },
      orderBy: [{ nickname: "asc" }, { username: "asc" }],
      take: 500,
    });
  },
};
