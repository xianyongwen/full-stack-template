import { z } from "zod";

/** 统一分页查询参数 */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

export type PageQuery = z.infer<typeof pageQuerySchema>;

/** 统一分页响应结构 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function buildPageResult<T>(
  list: T[],
  total: number,
  query: PageQuery
): PageResult<T> {
  return { list, total, page: query.page, pageSize: query.pageSize };
}
