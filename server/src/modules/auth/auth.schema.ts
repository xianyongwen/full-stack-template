import { z } from "zod";

/** POST /auth/login */
export const loginSchema = {
  tags: ["auth"],
  summary: "账号密码登录，返回 JWT",
  security: [],
  body: z.object({
    username: z.string().trim().min(1, "用户名不能为空"),
    password: z.string().trim().min(1, "密码不能为空"),
  }),
  response: {
    200: z.object({
      code: z.string(),
      message: z.string(),
      data: z.object({
        token: z.string(),
        userId: z.string(),
        username: z.string(),
        nickname: z.string().nullable(),
      }),
    }),
  },
};

export type LoginDTO = z.infer<(typeof loginSchema)["body"]>;

/** GET /auth/userinfo 响应里的菜单树节点 */
export interface MenuTreeNode {
  id: string;
  parentId: string;
  permName: string;
  permCode: string | null;
  type: number;
  path: string | null;
  component: string | null;
  icon: string | null;
  sort: number;
  children?: MenuTreeNode[];
  [key: string]: unknown;
}
export const menuTreeNodeSchema: z.ZodType<MenuTreeNode> = z.object({
  id: z.string(),
  parentId: z.string(),
  permName: z.string(),
  permCode: z.string().nullable(),
  type: z.number(),
  path: z.string().nullable(),
  component: z.string().nullable(),
  icon: z.string().nullable(),
  sort: z.number(),
  children: z.array(z.lazy(() => menuTreeNodeSchema)).optional(),
});
