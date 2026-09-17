import "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";

/** JWT payload：只存 userId，保持 token 小 */
export interface JwtPayload {
  userId: string;
}

/**
 * 当前登录用户上下文，由 auth plugin 注入到 request.currentUser。
 * 已包含其角色、权限标识、部门，Service 可直接用于权限判断。
 */
export interface CurrentUser {
  id: string;
  username: string;
  nickname: string | null;
  deptId: string | null;
  /** 角色 code 集合（如 ['admin', 'editor']） */
  roleCodes: string[];
  /** 权限点 code 集合（如 ['user:add', 'user:list']） */
  permissions: string[];
  /** 是否超管，超管跳过所有权限点校验 */
  isSuperAdmin: boolean;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** 解析 JWT 并加载 currentUser，用于需要登录的路由 */
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }

  interface FastifyRequest {
    /** 当前登录用户，authenticate 之后才存在 */
    currentUser?: CurrentUser;
  }

  /** 路由级配置：声明该路由需要的权限点 */
  interface FastifyContextConfig {
    /** 路由级权限点，如 ['user:add']；为空或省略表示仅需登录 */
    permission?: string[];
  }
}
