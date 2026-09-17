import type { FastifyReply, FastifyRequest } from "fastify";
import { deptService } from "./dept.service.ts";
import type {
  CreateDeptDTO,
  ListDeptQuery,
  UpdateDeptDTO,
} from "./dept.schema.ts";

export const deptController = {
  async tree(req: FastifyRequest<{ Querystring: ListDeptQuery }>) {
    const data = await deptService.tree(req.query);
    return { code: "ok", message: "ok", data };
  },

  async detail(req: FastifyRequest<{ Params: { id: string } }>) {
    const data = await deptService.detail(req.params.id);
    return { code: "ok", message: "ok", data };
  },

  async create(req: FastifyRequest<{ Body: CreateDeptDTO }>) {
    const data = await deptService.create(req.body);
    return { code: "ok", message: "创建成功", data };
  },

  async update(
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateDeptDTO }>
  ) {
    const data = await deptService.update(req.params.id, req.body);
    return { code: "ok", message: "更新成功", data };
  },

  async remove(
    req: FastifyRequest<{ Params: { id: string }}>,
    reply: FastifyReply
  ) {
    await deptService.remove(req.params.id);
    return { code: "ok", message: "删除成功", data: null };
  },
};
