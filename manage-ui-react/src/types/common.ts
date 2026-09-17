/** 统一分页查询参数 */
export interface PageQuery {
  page: number
  pageSize: number
}

/** 统一分页响应结构 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
