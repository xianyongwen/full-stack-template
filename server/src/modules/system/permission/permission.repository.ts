import { getClient } from "@/prisma/transaction-context";
import type {
  CreatePermissionDTO,
  UpdatePermissionDTO,
} from "./permission.schema.ts";

export const permissionRepository = {
  findMany() {
    return getClient().sysPermission.findMany({
      where: { deleted: 0 },
      orderBy: [{ sort: "asc" }, { createTime: "asc" }],
    });
  },

  findById(id: string) {
    return getClient().sysPermission.findFirst({
      where: { id, deleted: 0 },
    });
  },

  countChildren(parentId: string) {
    return getClient().sysPermission.count({
      where: { parentId, deleted: 0 },
    });
  },

  /** 是否被角色引用 */
  countRoleRefs(permissionId: string) {
    return getClient().sysRolePermission.count({
      where: { permissionId },
    });
  },

  create(data: CreatePermissionDTO) {
    return getClient().sysPermission.create({ data });
  },

  update(id: string, data: UpdatePermissionDTO) {
    return getClient().sysPermission.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return getClient().sysPermission.update({
      where: { id },
      data: { deleted: 1 },
    });
  },
};
