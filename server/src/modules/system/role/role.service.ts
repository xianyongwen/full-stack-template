import type { SysRole } from "@/generated/prisma/client";
import { roleRepository } from "./role.repository.ts";
import { buildPageResult } from "@/common/types/page";
import {
  BusinessError,
  NotFoundError,
} from "@/common/errors/index";
import { runInTransaction } from "@/prisma/transaction-context";
import { ROLE_CODES } from "@/common/constants/system";
import { getClient } from "@/prisma/transaction-context";
import { userCache } from "@/lib/user-cache";
import type {
  AssignPermissionsDTO,
  CreateRoleDTO,
  ListRoleQuery,
  UpdateRoleDTO,
} from "./role.schema.ts";

/** 字段裁剪：SysRole → VO（去掉 deleted/updateTime） */
function toRoleVO(r: SysRole) {
  return {
    id: r.id,
    roleName: r.roleName,
    roleCode: r.roleCode,
    dataScope: r.dataScope,
    sort: r.sort,
    status: r.status,
    createTime: r.createTime.toISOString(),
  };
}

/** 失效某个角色下所有用户的缓存 */
async function invalidateUsersByRole(roleId: string) {
  const rels = await getClient().sysUserRole.findMany({
    where: { roleId },
    select: { userId: true },
  });
  await Promise.all(rels.map((r) => userCache.del(r.userId)));
}

export const roleService = {
  async list(query: ListRoleQuery) {
    const where = {
      deleted: 0,
      ...(query.roleName ? { roleName: { contains: query.roleName } } : {}),
      ...(query.roleCode ? { roleCode: { contains: query.roleCode } } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
    };
    const [rows, total] = await roleRepository.paginate({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return buildPageResult(rows.map(toRoleVO), total, query);
  },

  /** 全部启用角色（供下拉选择） */
  async options() {
    const [rows] = await roleRepository.paginate({
      where: { deleted: 0, status: 1 },
      skip: 0,
      take: 500,
    });
    return rows.map(toRoleVO);
  },

  async detail(id: string) {
    const role = await roleRepository.findById(id);
    if (!role) throw new NotFoundError("角色不存在");
    const permRels = await roleRepository.listPermissionIds(id);
    return {
      ...toRoleVO(role),
      permissionIds: permRels.map((r) => r.permissionId),
    };
  },

  async create(dto: CreateRoleDTO) {
    const exists = await roleRepository.findByCode(dto.roleCode);
    if (exists) throw new BusinessError("角色编码已存在", "ROLE_CODE_EXISTS");
    const created = await roleRepository.create(dto);
    return toRoleVO(created);
  },

  async update(id: string, dto: UpdateRoleDTO) {
    const role = await roleRepository.findById(id);
    if (!role) throw new NotFoundError("角色不存在");
    const updated = await roleRepository.update(id, dto);
    await invalidateUsersByRole(id);
    return toRoleVO(updated);
  },

  async remove(id: string) {
    const role = await roleRepository.findById(id);
    if (!role) throw new NotFoundError("角色不存在");
    if (role.roleCode === ROLE_CODES.SUPER_ADMIN) {
      throw new BusinessError("超级管理员角色不可删除");
    }
    const userCount = await roleRepository.countUsers(id);
    if (userCount > 0) throw new BusinessError("角色下仍有用户，无法删除");
    await roleRepository.softDelete(id);
    await invalidateUsersByRole(id);
  },

  /** 给角色分配权限（全量覆盖） */
  async assignPermissions(id: string, dto: AssignPermissionsDTO) {
    const role = await roleRepository.findById(id);
    if (!role) throw new NotFoundError("角色不存在");
    await runInTransaction(async () => {
      await roleRepository.replacePermissions(id, dto);
    });
    await invalidateUsersByRole(id);
  },
};
