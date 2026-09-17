import type { SysUser } from "@/generated/prisma/client";

/** 用户列表/详情 VO（不含密码） */
export interface UserVO {
  id: string;
  username: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  deptId: string | null;
  deptName: string | null;
  status: number;
  createTime: string;
  roles?: { id: string; roleName: string; roleCode: string }[];
  roleIds?: string[];
}

type UserWithRelations = SysUser & {
  dept?: { deptName: string } | null;
  roles?: { role: { id: string; roleName: string; roleCode: string } }[];
};

export function toUserVO(u: UserWithRelations): UserVO {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    email: u.email,
    phone: u.phone,
    deptId: u.deptId ?? null,
    deptName: u.dept?.deptName ?? null,
    status: u.status,
    createTime: u.createTime.toISOString(),
    roles: u.roles?.map((ur) => ({
      id: ur.role.id,
      roleName: ur.role.roleName,
      roleCode: ur.role.roleCode,
    })),
    roleIds: u.roles?.map((ur) => ur.role.id),
  };
}
