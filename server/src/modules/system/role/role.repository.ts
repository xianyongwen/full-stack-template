import { getClient } from "@/prisma/transaction-context";
import type {
  AssignPermissionsDTO,
  CreateRoleDTO,
  ListRoleQuery,
  UpdateRoleDTO,
} from "./role.schema.ts";

export const roleRepository = {
  paginate(args: { where: any; skip: number; take: number }) {
    return Promise.all([
      getClient().sysRole.findMany({
        where: args.where,
        skip: args.skip,
        take: args.take,
        orderBy: [{ sort: "asc" }, { createTime: "desc" }],
      }),
      getClient().sysRole.count({ where: args.where }),
    ]);
  },

  findById(id: string) {
    return getClient().sysRole.findFirst({ where: { id, deleted: 0 } });
  },

  findByCode(roleCode: string) {
    return getClient().sysRole.findFirst({ where: { roleCode, deleted: 0 } });
  },

  countUsers(roleId: string) {
    return getClient().sysUserRole.count({ where: { roleId } });
  },

  create(data: CreateRoleDTO) {
    return getClient().sysRole.create({ data });
  },

  update(id: string, data: UpdateRoleDTO) {
    return getClient().sysRole.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return getClient().sysRole.update({ where: { id }, data: { deleted: 1 } });
  },

  /** 角色当前已分配的权限 id */
  listPermissionIds(roleId: string) {
    return getClient().sysRolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });
  },

  /** 全量覆盖角色的权限 */
  async replacePermissions(roleId: string, dto: AssignPermissionsDTO) {
    const db = getClient();
    await db.sysRolePermission.deleteMany({ where: { roleId } });
    if (dto.permissionIds.length === 0) return;
    await db.sysRolePermission.createMany({
      data: dto.permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    });
  },
};
