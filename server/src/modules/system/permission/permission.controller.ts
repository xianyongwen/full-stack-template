import type { FastifyRequest } from "fastify";
import { permissionService } from "./permission.service.ts";
import type {
  CreatePermissionDTO,
  UpdatePermissionDTO,
} from "./permission.schema.ts";

export const permissionController = {
  async tree() {
    const data = await permissionService.tree();
    return { code: "ok", message: "ok", data };
  },

  async detail(req: FastifyRequest<{ Params: { id: string } }>) {
    const data = await permissionService.detail(req.params.id);
    return { code: "ok", message: "ok", data };
  },

  async create(req: FastifyRequest<{ Body: CreatePermissionDTO }>) {
    const data = await permissionService.create(req.body);
    return { code: "ok", message: "创建成功", data };
  },

  async update(
    req: FastifyRequest<{ Params: { id: string }; Body: UpdatePermissionDTO }>
  ) {
    const data = await permissionService.update(req.params.id, req.body);
    return { code: "ok", message: "更新成功", data };
  },

  async remove(req: FastifyRequest<{ Params: { id: string } }>) {
    await permissionService.remove(req.params.id);
    return { code: "ok", message: "删除成功", data: null };
  },
};
