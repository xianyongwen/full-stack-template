import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { permissionController } from "./permission.controller.ts";
import {
  createPermissionSchema,
  permissionIdSchema,
  updatePermissionSchema,
} from "./permission.schema.ts";

export const permissionRoutes: FastifyPluginAsync = async (
  app: FastifyInstance
) => {
  app.get(
    "/menu/tree",
    { schema: { tags: ["system/menu"], summary: "菜单/权限树" } },
    permissionController.tree
  );

  app.get(
    "/menu/:id",
    { schema: permissionIdSchema },
    permissionController.detail
  );

  app.post(
    "/menu",
    {
      schema: createPermissionSchema,
      config: { permission: ["system:menu:add"] },
    },
    permissionController.create
  );

  app.put(
    "/menu/:id",
    {
      schema: updatePermissionSchema,
      config: { permission: ["system:menu:edit"] },
    },
    permissionController.update
  );

  app.delete(
    "/menu/:id",
    {
      schema: permissionIdSchema,
      config: { permission: ["system:menu:delete"] },
    },
    permissionController.remove
  );
};
