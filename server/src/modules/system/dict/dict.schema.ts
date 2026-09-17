import { z } from "zod";
import { pageQuerySchema } from "@/common/types/page";

// ── 字典类型 ──

/** 字典类型新建 */
export const createDictTypeSchemaObj = z.object({
  dictName: z.string().trim().min(1, "字典名称不能为空").max(100),
  dictType: z
    .string()
    .trim()
    .min(1, "字典类型不能为空")
    .max(100)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "字典类型只允许字母开头、字母数字下划线"),
  status: z.union([z.literal(0), z.literal(1)]).default(1),
  sort: z.number().int().default(0),
  remark: z.string().max(255).optional(),
});
export type CreateDictTypeDTO = z.infer<typeof createDictTypeSchemaObj>;

/** 字典类型更新（dictType 不可改） */
export const updateDictTypeSchemaObj = createDictTypeSchemaObj
  .partial()
  .omit({ dictType: true });
export type UpdateDictTypeDTO = z.infer<typeof updateDictTypeSchemaObj>;

/** 字典类型分页查询 */
export const listDictTypeSchemaObj = pageQuerySchema.extend({
  dictName: z.string().trim().optional(),
  dictType: z.string().trim().optional(),
  status: z.coerce.number().int().optional(),
});
export type ListDictTypeQuery = z.infer<typeof listDictTypeSchemaObj>;

// ── 字典数据 ──

/** 字典数据新建 */
export const createDictDataSchemaObj = z.object({
  dictType: z.string().trim().min(1, "字典类型不能为空").max(100),
  dictLabel: z.string().trim().min(1, "数据标签不能为空").max(100),
  dictValue: z.string().trim().min(1, "数据键值不能为空").max(100),
  cssClass: z.string().trim().max(50).optional(),
  isDefault: z.union([z.literal(0), z.literal(1)]).default(0),
  sort: z.number().int().default(0),
  status: z.union([z.literal(0), z.literal(1)]).default(1),
  remark: z.string().max(255).optional(),
});
export type CreateDictDataDTO = z.infer<typeof createDictDataSchemaObj>;

/** 字典数据更新 */
export const updateDictDataSchemaObj = createDictDataSchemaObj.partial();
export type UpdateDictDataDTO = z.infer<typeof updateDictDataSchemaObj>;

/** 字典数据列表查询（按 dictType 拉取，不分页） */
export const listDictDataSchemaObj = z.object({
  dictType: z.string().trim().min(1),
  dictLabel: z.string().trim().optional(),
  status: z.coerce.number().int().optional(),
});
export type ListDictDataQuery = z.infer<typeof listDictDataSchemaObj>;

// ── 路由 schema ──

export const createDictTypeSchema = {
  tags: ["system/dict"],
  summary: "新建字典类型",
  body: createDictTypeSchemaObj,
};
export const updateDictTypeSchema = {
  tags: ["system/dict"],
  summary: "更新字典类型",
  params: z.object({ id: z.string() }),
  body: updateDictTypeSchemaObj,
};
export const listDictTypeSchema = {
  tags: ["system/dict"],
  summary: "字典类型分页列表",
  querystring: listDictTypeSchemaObj,
};
export const dictTypeIdSchema = {
  tags: ["system/dict"],
  summary: "",
  params: z.object({ id: z.string() }),
};

export const createDictDataSchema = {
  tags: ["system/dict"],
  summary: "新建字典数据",
  body: createDictDataSchemaObj,
};
export const updateDictDataSchema = {
  tags: ["system/dict"],
  summary: "更新字典数据",
  params: z.object({ id: z.string() }),
  body: updateDictDataSchemaObj,
};
export const listDictDataSchema = {
  tags: ["system/dict"],
  summary: "按字典类型获取数据列表",
  querystring: listDictDataSchemaObj,
};
export const dictDataIdSchema = {
  tags: ["system/dict"],
  summary: "",
  params: z.object({ id: z.string() }),
};
