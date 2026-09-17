import { z } from "zod";
import { pageQuerySchema } from "@/common/types/page";

export const createUserSchemaObj = z.object({
  username: z
    .string()
    .trim()
    .min(3, "用户名至少 3 位")
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只允许字母数字下划线"),
  password: z.string().trim().min(6, "密码至少 6 位").max(64),
  nickname: z.string().trim().max(50).optional(),
  email: z.string().trim().email("邮箱格式错误").max(100).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^1[3-9]\d{9}$/, "手机号格式错误")
    .optional(),
  deptId: z.string().optional(),
  status: z.union([z.literal(0), z.literal(1)]).default(1),
  roleIds: z.array(z.string()).default([]),
});
export type CreateUserDTO = z.infer<typeof createUserSchemaObj>;

export const updateUserSchemaObj = createUserSchemaObj
  .partial()
  .omit({ username: true });
export type UpdateUserDTO = z.infer<typeof updateUserSchemaObj>;

export const listUserSchemaObj = pageQuerySchema.extend({
  username: z.string().trim().optional(),
  nickname: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  status: z.coerce.number().int().optional(),
  deptId: z.string().optional(),
});
export type ListUserQuery = z.infer<typeof listUserSchemaObj>;

/** 给用户分配角色（全量覆盖） */
export const assignRolesSchemaObj = z.object({
  roleIds: z.array(z.string()),
});
export type AssignRolesDTO = z.infer<typeof assignRolesSchemaObj>;

/** 改密码 */
export const changePasswordSchemaObj = z.object({
  oldPassword: z.string().min(1).optional(),
  newPassword: z.string().trim().min(6, "新密码至少 6 位").max(64),
});
export type ChangePasswordDTO = z.infer<typeof changePasswordSchemaObj>;

/** 管理员重置密码（不需要旧密码） */
export const resetPasswordSchemaObj = z.object({
  newPassword: z.string().trim().min(6).max(64),
});
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchemaObj>;

/** 改状态 */
export const updateStatusSchemaObj = z.object({
  status: z.union([z.literal(0), z.literal(1)]),
});
export type UpdateStatusDTO = z.infer<typeof updateStatusSchemaObj>;

/** 路由 schema */
export const createUserSchema = {
  tags: ["system/user"],
  summary: "新建用户",
  body: createUserSchemaObj,
};
export const updateUserSchema = {
  tags: ["system/user"],
  summary: "更新用户",
  params: z.object({ id: z.string() }),
  body: updateUserSchemaObj,
};
export const listUserSchema = {
  tags: ["system/user"],
  summary: "用户分页列表",
  querystring: listUserSchemaObj,
};
export const userIdSchema = {
  tags: ["system/user"],
  summary: "",
  params: z.object({ id: z.string() }),
};
export const assignRolesSchema = {
  tags: ["system/user"],
  summary: "给用户分配角色（全量覆盖）",
  params: z.object({ id: z.string() }),
  body: assignRolesSchemaObj,
};
export const changePasswordSchema = {
  tags: ["system/user"],
  summary: "修改自己的密码",
  body: changePasswordSchemaObj,
};
export const resetPasswordSchema = {
  tags: ["system/user"],
  summary: "管理员重置用户密码",
  params: z.object({ id: z.string() }),
  body: resetPasswordSchemaObj,
};
export const updateUserStatusSchema = {
  tags: ["system/user"],
  summary: "修改用户状态",
  params: z.object({ id: z.string() }),
  body: updateStatusSchemaObj,
};
