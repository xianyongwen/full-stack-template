import { userRepository } from "./user.repository.ts";
import { toUserVO } from "./user.mapper.ts";
import { buildPageResult } from "@/common/types/page";
import {
  BusinessError,
  NotFoundError,
} from "@/common/errors/index";
import { runInTransaction } from "@/prisma/transaction-context";
import {
  hashPassword,
  verifyPassword,
} from "@/common/utils/password";
import { getClient } from "@/prisma/transaction-context";
import { ROLE_CODES } from "@/common/constants/system";
import { userCache } from "@/lib/user-cache";
import type {
  AssignRolesDTO,
  ChangePasswordDTO,
  CreateUserDTO,
  ListUserQuery,
  ResetPasswordDTO,
  UpdateStatusDTO,
  UpdateUserDTO,
} from "./user.schema.ts";

export const userService = {
  async list(query: ListUserQuery) {
    const where = {
      deleted: 0,
      ...(query.username ? { username: { contains: query.username } } : {}),
      ...(query.nickname ? { nickname: { contains: query.nickname } } : {}),
      ...(query.phone ? { phone: { contains: query.phone } } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.deptId ? { deptId: query.deptId } : {}),
    };
    const [rows, total] = await userRepository.paginate({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return buildPageResult(rows.map(toUserVO), total, query);
  },

  async detail(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("用户不存在");
    return toUserVO(user);
  },

  /** 下拉选项：返回 { id, name }[]（name 优先 nickname） */
  async options() {
    const rows = await userRepository.findOptions();
    return rows.map((u) => ({
      id: u.id,
      name: u.nickname || u.username,
    }));
  },

  async create(dto: CreateUserDTO) {
    const exists = await userRepository.findByUsername(dto.username);
    if (exists) throw new BusinessError("用户名已存在", "USERNAME_EXISTS");

    const password = await hashPassword(dto.password);
    const { roleIds, ...rest } = dto;

    // 校验部门存在
    if (rest.deptId) {
      const dept = await getClient().sysDept.findFirst({
        where: { id: rest.deptId, deleted: 0 },
      });
      if (!dept) throw new NotFoundError("所选部门不存在");
    }

    const created = await runInTransaction(async () => {
      const user = await userRepository.create({ ...rest, password });
      if (roleIds.length > 0) {
        await userRepository.replaceRoles(user.id, roleIds);
      }
      return userRepository.findById(user.id);
    });
    return toUserVO(created!);
  },

  async update(id: string, dto: UpdateUserDTO) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("用户不存在");

    const { roleIds, password, deptId, ...rest } = dto;
    if (deptId !== undefined) {
      if (deptId) {
        const dept = await getClient().sysDept.findFirst({
          where: { id: deptId, deleted: 0 },
        });
        if (!dept) throw new NotFoundError("所选部门不存在");
      }
      (rest as any).deptId = deptId;
    }

    return runInTransaction(async () => {
      if (roleIds !== undefined) {
        await userRepository.replaceRoles(id, roleIds);
      }
      const updated = await userRepository.update(id, rest);
      return toUserVO(updated);
    }).then(async (result) => {
      await userCache.del(id);
      return result;
    });
  },

  async remove(id: string, operatorId: string) {
    if (id === operatorId) {
      throw new BusinessError("不能删除自己");
    }
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("用户不存在");
    await userRepository.softDelete(id);
    await userCache.del(id);
  },

  /** 分配角色（全量覆盖） */
  async assignRoles(id: string, dto: AssignRolesDTO) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("用户不存在");
    // 校验角色都存在
    if (dto.roleIds.length > 0) {
      const valid = await getClient().sysRole.count({
        where: { id: { in: dto.roleIds }, deleted: 0 },
      });
      if (valid !== dto.roleIds.length) {
        throw new BusinessError("包含不存在或已删除的角色");
      }
    }
    await runInTransaction(async () => {
      await userRepository.replaceRoles(id, dto.roleIds);
    });
    await userCache.del(id);
  },

  /** 管理员重置用户密码 */
  async resetPassword(id: string, dto: ResetPasswordDTO) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("用户不存在");
    const hashed = await hashPassword(dto.newPassword);
    await userRepository.updatePassword(id, hashed);
  },

  /** 用户修改自己的密码（需要旧密码） */
  async changePassword(userId: string, dto: ChangePasswordDTO) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError("用户不存在");
    if (dto.oldPassword !== undefined) {
      const ok = await verifyPassword(dto.oldPassword, user.password);
      if (!ok) throw new BusinessError("旧密码错误", "OLD_PASSWORD_WRONG");
    }
    const hashed = await hashPassword(dto.newPassword);
    await userRepository.updatePassword(userId, hashed);
  },

  /** 改状态 */
  async updateStatus(id: string, dto: UpdateStatusDTO, operatorId: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("用户不存在");
    if (id === operatorId && dto.status === 0) {
      throw new BusinessError("不能停用自己");
    }
    // 保护超管不被误停用
    const roles = await userRepository.listRoleIds(id);
    const hasSuper = await getClient().sysRole.findFirst({
      where: {
        id: { in: roles.map((r) => r.roleId) },
        roleCode: ROLE_CODES.SUPER_ADMIN,
      },
      select: { id: true },
    });
    if (hasSuper && dto.status === 0) {
      throw new BusinessError("超级管理员账号不可停用");
    }
    return userRepository.update(id, { status: dto.status }).then(async (result) => {
      await userCache.del(id);
      return result;
    });
  },
};
