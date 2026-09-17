import type { FastifyRequest } from "fastify";
import { dictService } from "./dict.service.ts";
import type {
  CreateDictDataDTO,
  CreateDictTypeDTO,
  ListDictDataQuery,
  ListDictTypeQuery,
  UpdateDictDataDTO,
  UpdateDictTypeDTO,
} from "./dict.schema.ts";

export const dictController = {
  // ── 字典类型 ──

  async typeList(req: FastifyRequest<{ Querystring: ListDictTypeQuery }>) {
    const data = await dictService.typeList(req.query);
    return { code: "ok", message: "ok", data };
  },

  async typeOptions() {
    const data = await dictService.typeOptions();
    return { code: "ok", message: "ok", data };
  },

  async typeDetail(req: FastifyRequest<{ Params: { id: string } }>) {
    const data = await dictService.typeDetail(req.params.id);
    return { code: "ok", message: "ok", data };
  },

  async typeCreate(req: FastifyRequest<{ Body: CreateDictTypeDTO }>) {
    const data = await dictService.typeCreate(req.body);
    return { code: "ok", message: "创建成功", data };
  },

  async typeUpdate(
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateDictTypeDTO }>
  ) {
    const data = await dictService.typeUpdate(req.params.id, req.body);
    return { code: "ok", message: "更新成功", data };
  },

  async typeRemove(req: FastifyRequest<{ Params: { id: string } }>) {
    await dictService.typeRemove(req.params.id);
    return { code: "ok", message: "删除成功", data: null };
  },

  // ── 字典数据 ──

  async dataList(req: FastifyRequest<{ Querystring: ListDictDataQuery }>) {
    const data = await dictService.dataList(req.query);
    return { code: "ok", message: "ok", data };
  },

  async dataDetail(req: FastifyRequest<{ Params: { id: string } }>) {
    const data = await dictService.dataDetail(req.params.id);
    return { code: "ok", message: "ok", data };
  },

  async dataCreate(req: FastifyRequest<{ Body: CreateDictDataDTO }>) {
    const data = await dictService.dataCreate(req.body);
    return { code: "ok", message: "创建成功", data };
  },

  async dataUpdate(
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateDictDataDTO }>
  ) {
    const data = await dictService.dataUpdate(req.params.id, req.body);
    return { code: "ok", message: "更新成功", data };
  },

  async dataRemove(req: FastifyRequest<{ Params: { id: string } }>) {
    await dictService.dataRemove(req.params.id);
    return { code: "ok", message: "删除成功", data: null };
  },
};
