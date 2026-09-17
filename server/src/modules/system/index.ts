import type { FastifyPluginAsync } from "fastify";
import { deptRoutes } from "./dept/index.ts";
import { dictRoutes } from "./dict/index.ts";
import { roleRoutes } from "./role/index.ts";
import { permissionRoutes } from "./permission/index.ts";
import { userRoutes } from "./user/index.ts";

/** system 领域聚合：用户、角色、菜单、部门、字典 */
export const systemRoutes: FastifyPluginAsync = async (app) => {
  // 统一鉴权：所有 system 子路由都需登录，并据此生效 config.permission 权限点校验
  app.addHook("preHandler", app.authenticate);
  await app.register(deptRoutes);
  await app.register(dictRoutes);
  await app.register(roleRoutes);
  await app.register(permissionRoutes);
  await app.register(userRoutes);
};
