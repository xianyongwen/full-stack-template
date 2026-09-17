import type { FastifyRequest } from "fastify";
import { roleService } from "./role.service.ts";
import type {
  AssignPermissionsDTO,
  CreateRoleDTO,
  ListRoleQuery,
  UpdateRoleDTO,
} from "./role.schema.ts";

export const roleController = {
  async list(req: FastifyRequest<{ Querystring: ListRoleQuery }>) {
    const data = await roleService.list(req.query);
    return { code: "ok", message: "ok", data };
  },

  async options() {
    const data = await roleService.options();
    return { code: "ok", message: "ok", data };
  },

  async detail(req: FastifyRequest<{ Params: { id: string } }>) {
    const data = await roleService.detail(req.params.id);
    return { code: "ok", message: "ok", data };
  },

  async create(req: FastifyRequest<{ Body: CreateRoleDTO }>) {
    const data = await roleService.create(req.body);
    return { code: "ok", message: "创建成功", data };
  },

  async update(
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateRoleDTO }>
  ) {
    const data = await roleService.update(req.params.id, req.body);
    return { code: "ok", message: "更新成功", data };
  },

  async remove(req: FastifyRequest<{ Params: { id: string } }>) {
    await roleService.remove(req.params.id);
    return { code: "ok", message: "删除成功", data: null };
  },

  async assignPermissions(
    req: FastifyRequest<{ Params: { id: string }; Body: AssignPermissionsDTO }>
  ) {
    await roleService.assignPermissions(req.params.id, req.body);
    return { code: "ok", message: "分配成功", data: null };
  },
};
