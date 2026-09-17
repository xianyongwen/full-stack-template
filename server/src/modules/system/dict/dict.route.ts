import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { dictController } from "./dict.controller.ts";
import {
  createDictDataSchema,
  createDictTypeSchema,
  dictDataIdSchema,
  dictTypeIdSchema,
  listDictDataSchema,
  listDictTypeSchema,
  updateDictDataSchema,
  updateDictTypeSchema,
} from "./dict.schema.ts";

export const dictRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // ── 字典类型 ──
  app.get("/dict/type", { schema: listDictTypeSchema }, dictController.typeList);
  app.get(
    "/dict/type/options",
    { schema: { tags: ["system/dict"], summary: "字典类型（启用，下拉用）" } },
    dictController.typeOptions
  );
  app.get("/dict/type/:id", { schema: dictTypeIdSchema }, dictController.typeDetail);

  app.post(
    "/dict/type",
    { schema: createDictTypeSchema, config: { permission: ["system:dict:add"] } },
    dictController.typeCreate
  );
  app.put(
    "/dict/type/:id",
    { schema: updateDictTypeSchema, config: { permission: ["system:dict:edit"] } },
    dictController.typeUpdate
  );
  app.delete(
    "/dict/type/:id",
    { schema: dictTypeIdSchema, config: { permission: ["system:dict:delete"] } },
    dictController.typeRemove
  );

  // ── 字典数据 ──
  app.get("/dict/data", { schema: listDictDataSchema }, dictController.dataList);
  app.get("/dict/data/:id", { schema: dictDataIdSchema }, dictController.dataDetail);

  app.post(
    "/dict/data",
    { schema: createDictDataSchema, config: { permission: ["system:dict:add"] } },
    dictController.dataCreate
  );
  app.put(
    "/dict/data/:id",
    { schema: updateDictDataSchema, config: { permission: ["system:dict:edit"] } },
    dictController.dataUpdate
  );
  app.delete(
    "/dict/data/:id",
    { schema: dictDataIdSchema, config: { permission: ["system:dict:delete"] } },
    dictController.dataRemove
  );
};
