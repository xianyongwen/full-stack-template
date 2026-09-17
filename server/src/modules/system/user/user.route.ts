import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { userController } from "./user.controller.ts";
import {
  assignRolesSchema,
  changePasswordSchema,
  createUserSchema,
  listUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdSchema,
} from "./user.schema.ts";

export const userRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    "/user",
    { schema: listUserSchema, config: { permission: ["system:user:list"] } },
    userController.list
  );
  app.get(
    "/user/:id",
    { schema: userIdSchema, config: { permission: ["system:user:list"] } },
    userController.detail
  );

  // 用户下拉选项（按昵称/用户名升序）
  app.get(
    "/user/options",
    { config: { permission: ["system:user:list"] } },
    userController.options
  );
  app.post(
    "/user",
    {
      schema: createUserSchema,
      config: { permission: ["system:user:add"] },
    },
    userController.create
  );
  app.put(
    "/user/:id",
    {
      schema: updateUserSchema,
      config: { permission: ["system:user:edit"] },
    },
    userController.update
  );
  app.delete(
    "/user/:id",
    {
      schema: userIdSchema,
      config: { permission: ["system:user:delete"] },
    },
    userController.remove
  );
  app.put(
    "/user/:id/roles",
    {
      schema: assignRolesSchema,
      config: { permission: ["system:user:edit"] },
    },
    userController.assignRoles
  );
  app.put(
    "/user/:id/password",
    {
      schema: resetPasswordSchema,
      config: { permission: ["system:user:reset"] },
    },
    userController.resetPassword
  );
  app.put(
    "/user/:id/status",
    {
      schema: updateUserStatusSchema,
      config: { permission: ["system:user:edit"] },
    },
    userController.updateStatus
  );

  /** 修改自己的密码（仅需登录） */
  app.put(
    "/user/password",
    { schema: changePasswordSchema },
    userController.changePassword
  );
};
