import type { FastifyRequest } from "fastify";
import { userService } from "./user.service.ts";
import type {
  AssignRolesDTO,
  ChangePasswordDTO,
  CreateUserDTO,
  ListUserQuery,
  ResetPasswordDTO,
  UpdateStatusDTO,
  UpdateUserDTO,
} from "./user.schema.ts";

export const userController = {
  async list(req: FastifyRequest<{ Querystring: ListUserQuery }>) {
    const data = await userService.list(req.query);
    return { code: "ok", message: "ok", data };
  },

  async detail(req: FastifyRequest<{ Params: { id: string } }>) {
    const data = await userService.detail(req.params.id);
    return { code: "ok", message: "ok", data };
  },

  /** 用户下拉选项：仅返回启用状态用户 { id, name } */
  async options() {
    const data = await userService.options();
    return { code: "ok", message: "ok", data };
  },

  async create(req: FastifyRequest<{ Body: CreateUserDTO }>) {
    const data = await userService.create(req.body);
    return { code: "ok", message: "创建成功", data };
  },

  async update(
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateUserDTO }>
  ) {
    const data = await userService.update(req.params.id, req.body);
    return { code: "ok", message: "更新成功", data };
  },

  async remove(req: FastifyRequest<{ Params: { id: string } }>) {
    await userService.remove(
      req.params.id,
      req.currentUser!.id
    );
    return { code: "ok", message: "删除成功", data: null };
  },

  async assignRoles(
    req: FastifyRequest<{ Params: { id: string }; Body: AssignRolesDTO }>
  ) {
    await userService.assignRoles(req.params.id, req.body);
    return { code: "ok", message: "分配成功", data: null };
  },

  async resetPassword(
    req: FastifyRequest<{
      Params: { id: string };
      Body: ResetPasswordDTO;
    }>
  ) {
    await userService.resetPassword(req.params.id, req.body);
    return { code: "ok", message: "重置成功", data: null };
  },

  async updateStatus(
    req: FastifyRequest<{
      Params: { id: string };
      Body: UpdateStatusDTO;
    }>
  ) {
    await userService.updateStatus(
      req.params.id,
      req.body,
      req.currentUser!.id
    );
    return { code: "ok", message: "ok", data: null };
  },

  /** 修改自己的密码 */
  async changePassword(req: FastifyRequest<{ Body: ChangePasswordDTO }>) {
    await userService.changePassword(req.currentUser!.id, req.body);
    return { code: "ok", message: "修改成功", data: null };
  },
};
