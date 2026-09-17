import type { SysPermission } from "@/generated/prisma/client";
import { NIL_UUID } from "@/common/constants/system";
import { permissionRepository } from "./permission.repository.ts";
import { toPermissionTree } from "./permission.mapper.ts";
import {
  BusinessError,
  NotFoundError,
} from "@/common/errors/index";
import type {
  CreatePermissionDTO,
  UpdatePermissionDTO,
} from "./permission.schema.ts";

export const permissionService = {
  /** 菜单/权限树（管理用，含停用） */
  async tree() {
    const list = await permissionRepository.findMany();
    return toPermissionTree(list);
  },

  async detail(id: string) {
    const p = await permissionRepository.findById(id);
    if (!p) throw new NotFoundError("菜单不存在");
    return {
      id: p.id,
      parentId: p.parentId,
      permName: p.permName,
      permCode: p.permCode,
      type: p.type,
      code: p.code,
      component: p.component,
      icon: p.icon,
      apiUrl: p.apiUrl,
      apiMethod: p.apiMethod,
      sort: p.sort,
      visible: p.visible,
      status: p.status,
      createTime: p.createTime.toISOString(),
    };
  },

  async create(dto: CreatePermissionDTO) {
    if (dto.parentId !== NIL_UUID) {
      const parent = await permissionRepository.findById(dto.parentId);
      if (!parent) throw new NotFoundError("父级菜单不存在");
    }
    const created = await permissionRepository.create(dto);
    return {
      id: created.id,
      parentId: created.parentId,
      permName: created.permName,
      permCode: created.permCode,
      type: created.type,
      code: created.code,
      component: created.component,
      icon: created.icon,
      apiUrl: created.apiUrl,
      apiMethod: created.apiMethod,
      sort: created.sort,
      visible: created.visible,
      status: created.status,
      createTime: created.createTime.toISOString(),
    };
  },

  async update(id: string, dto: UpdatePermissionDTO) {
    const p = await permissionRepository.findById(id);
    if (!p) throw new NotFoundError("菜单不存在");
    if (dto.parentId !== undefined && dto.parentId === id) {
      throw new BusinessError("上级菜单不能是自己");
    }
    const updated = await permissionRepository.update(id, dto);
    return {
      id: updated.id,
      parentId: updated.parentId,
      permName: updated.permName,
      permCode: updated.permCode,
      type: updated.type,
      code: updated.code,
      component: updated.component,
      icon: updated.icon,
      apiUrl: updated.apiUrl,
      apiMethod: updated.apiMethod,
      sort: updated.sort,
      visible: updated.visible,
      status: updated.status,
      createTime: updated.createTime.toISOString(),
    };
  },

  async remove(id: string) {
    const p = await permissionRepository.findById(id);
    if (!p) throw new NotFoundError("菜单不存在");
    const childCount = await permissionRepository.countChildren(id);
    if (childCount > 0) throw new BusinessError("存在子菜单，无法删除");
    const refCount = await permissionRepository.countRoleRefs(id);
    if (refCount > 0) throw new BusinessError("菜单已被角色引用，请先取消分配");
    await permissionRepository.softDelete(id);
  },
};
