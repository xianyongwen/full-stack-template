import { z } from "zod";
import { pageQuerySchema } from "@/common/types/page";

export const createRoleSchemaObj = z.object({
  roleName: z.string().trim().min(1, "角色名称不能为空").max(50),
  roleCode: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "角色编码只允许字母开头、字母数字下划线"),
  dataScope: z.number().int().min(1).max(5).default(1),
  sort: z.number().int().default(0),
  status: z.union([z.literal(0), z.literal(1)]).default(1),
  remark: z.string().max(200).optional(),
});
export type CreateRoleDTO = z.infer<typeof createRoleSchemaObj>;

export const updateRoleSchemaObj = createRoleSchemaObj.partial().omit({ roleCode: true });
export type UpdateRoleDTO = z.infer<typeof updateRoleSchemaObj>;

export const listRoleSchemaObj = pageQuerySchema.extend({
  roleName: z.string().trim().optional(),
  roleCode: z.string().trim().optional(),
  status: z.coerce.number().int().optional(),
});
export type ListRoleQuery = z.infer<typeof listRoleSchemaObj>;

/** 分配权限：permissionId 数组 */
export const assignPermissionsSchemaObj = z.object({
  permissionIds: z.array(z.string()),
});
export type AssignPermissionsDTO = z.infer<typeof assignPermissionsSchemaObj>;

/** 路由 schema */
export const createRoleSchema = {
  tags: ["system/role"],
  summary: "新建角色",
  body: createRoleSchemaObj,
};
export const updateRoleSchema = {
  tags: ["system/role"],
  summary: "更新角色",
  params: z.object({ id: z.string() }),
  body: updateRoleSchemaObj,
};
export const listRoleSchema = {
  tags: ["system/role"],
  summary: "角色分页列表",
  querystring: listRoleSchemaObj,
};
export const roleIdSchema = {
  tags: ["system/role"],
  summary: "",
  params: z.object({ id: z.string() }),
};
export const assignPermissionsSchema = {
  tags: ["system/role"],
  summary: "给角色分配权限（全量覆盖）",
  params: z.object({ id: z.string() }),
  body: assignPermissionsSchemaObj,
};
