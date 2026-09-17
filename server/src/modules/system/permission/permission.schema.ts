import { z } from "zod";
import { NIL_UUID } from "@/common/constants/system";

export const createPermissionSchemaObj = z.object({
  parentId: z.string().default(NIL_UUID),
  permName: z.string().trim().min(1, "名称不能为空").max(50),
  permCode: z.string().trim().max(100).optional(),
  type: z.number().int().min(1).max(4),
  code: z.string().trim().max(200).optional(), // 前端路由 path
  component: z.string().trim().max(255).optional(),
  icon: z.string().trim().optional(),
  apiUrl: z.string().trim().max(255).optional(),
  apiMethod: z.string().trim().max(10).optional(),
  sort: z.number().int().default(0),
  visible: z.union([z.literal(0), z.literal(1)]).default(1),
  status: z.union([z.literal(0), z.literal(1)]).default(1),
});
export type CreatePermissionDTO = z.infer<typeof createPermissionSchemaObj>;

export const updatePermissionSchemaObj =
  createPermissionSchemaObj.partial();
export type UpdatePermissionDTO = z.infer<typeof updatePermissionSchemaObj>;

export const createPermissionSchema = {
  tags: ["system/menu"],
  summary: "新建菜单/权限",
  body: createPermissionSchemaObj,
};
export const updatePermissionSchema = {
  tags: ["system/menu"],
  summary: "更新菜单/权限",
  params: z.object({ id: z.string() }),
  body: updatePermissionSchemaObj,
};
export const permissionIdSchema = {
  tags: ["system/menu"],
  summary: "",
  params: z.object({ id: z.string() }),
};
