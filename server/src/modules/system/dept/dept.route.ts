import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { deptController } from "./dept.controller.ts";
import {
  createDeptSchema,
  deptIdSchema,
  deptTreeSchema,
  updateDeptSchema,
} from "./dept.schema.ts";

export const deptRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/dept/tree", { schema: deptTreeSchema }, deptController.tree);

  app.get("/dept/:id", { schema: deptIdSchema }, deptController.detail);

  app.post(
    "/dept",
    {
      schema: createDeptSchema,
      config: { permission: ["system:dept:add"] },
    },
    deptController.create
  );

  app.put(
    "/dept/:id",
    {
      schema: updateDeptSchema,
      config: { permission: ["system:dept:edit"] },
    },
    deptController.update
  );

  app.delete(
    "/dept/:id",
    {
      schema: deptIdSchema,
      config: { permission: ["system:dept:delete"] },
    },
    deptController.remove
  );
};
