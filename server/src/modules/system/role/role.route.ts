import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { roleController } from "./role.controller.ts";
import {
  assignPermissionsSchema,
  createRoleSchema,
  listRoleSchema,
  roleIdSchema,
  updateRoleSchema,
} from "./role.schema.ts";

export const roleRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/role", { schema: listRoleSchema }, roleController.list);
  app.get("/role/options", { schema: listRoleSchema }, roleController.options);
  app.get("/role/:id", { schema: roleIdSchema }, roleController.detail);

  app.post(
    "/role",
    { schema: createRoleSchema, config: { permission: ["system:role:add"] } },
    roleController.create
  );
  app.put(
    "/role/:id",
    {
      schema: updateRoleSchema,
      config: { permission: ["system:role:edit"] },
    },
    roleController.update
  );
  app.delete(
    "/role/:id",
    {
      schema: roleIdSchema,
      config: { permission: ["system:role:delete"] },
    },
    roleController.remove
  );

  app.put(
    "/role/:id/permissions",
    {
      schema: assignPermissionsSchema,
      config: { permission: ["system:role:edit"] },
    },
    roleController.assignPermissions
  );
};
