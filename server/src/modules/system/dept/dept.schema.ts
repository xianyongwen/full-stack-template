import { z } from "zod";
import { NIL_UUID } from "@/common/constants/system";

/** 部门新建 */
export const createDeptSchemaObj = z.object({
  parentId: z.string().default(NIL_UUID),
  deptName: z.string().trim().min(1, "部门名称不能为空").max(50),
  sort: z.number().int().default(0),
  status: z.number().int().pipe(z.union([z.literal(0), z.literal(1)])).default(1),
});
export type CreateDeptDTO = z.infer<typeof createDeptSchemaObj>;

/** 部门更新 */
export const updateDeptSchemaObj = createDeptSchemaObj.partial();
export type UpdateDeptDTO = z.infer<typeof updateDeptSchemaObj>;

/** 路由 schema */
export const createDeptSchema = {
  tags: ["system/dept"],
  summary: "新建部门",
  body: createDeptSchemaObj,
};

export const updateDeptSchema = {
  tags: ["system/dept"],
  summary: "更新部门",
  params: z.object({ id: z.string() }),
  body: updateDeptSchemaObj,
};

export const deptIdSchema = {
  tags: ["system/dept"],
  summary: "",
  params: z.object({ id: z.string() }),
};

export const deptTreeQuerySchemaObj = z.object({
  deptName: z.string().trim().optional(),
  status: z.coerce.number().int().optional(),
});
export type ListDeptQuery = z.infer<typeof deptTreeQuerySchemaObj>;

export const deptTreeSchema = {
  tags: ["system/dept"],
  summary: "部门树（含停用，便于维护）",
  querystring: deptTreeQuerySchemaObj,
};
