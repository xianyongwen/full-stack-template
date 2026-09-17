import { useCallback, useEffect, useRef, useState } from 'react'
import type { PageResult } from '@/types/common'

interface UseTableOptions<Q, T> {
  /** 数据请求函数，接收查询参数（含分页），返回 PageResult<T> */
  fetcher: (
    params: Q & { page: number; pageSize: number }
  ) => Promise<PageResult<T>>
  /** 初始查询条件（搜索表单默认值） */
  initialQuery?: Q
  /** 初始每页条数，默认 10 */
  initialPageSize?: number
}

interface UseTableReturn<Q, T> {
  /** 当前列表数据 */
  dataSource: T[]
  /** 加载中状态 */
  loading: boolean
  /** 分页配置（可直接传给 antd Table 的 pagination prop） */
  pagination: {
    current: number
    pageSize: number
    total: number
    showSizeChanger: boolean
    showTotal: (total: number) => string
    onChange: (page: number, pageSize: number) => void
  }
  /** 当前搜索条件 */
  query: Q
  /** 提交搜索（合并查询条件，重置到第 1 页） */
  onSearch: (values: Partial<Q>) => void
  /** 重置搜索条件到初始值，并回到第 1 页 */
  onReset: () => void
  /** 手动刷新当前列表（保持当前页和查询条件） */
  refresh: () => void
}

export function useTable<Q extends Record<string, unknown>, T>(
  options: UseTableOptions<Q, T>
): UseTableReturn<Q, T> {
  const { fetcher, initialQuery, initialPageSize = 10 } = options

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [query, setQuery] = useState<Q>((initialQuery ?? {}) as Q)
  const [dataSource, setDataSource] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // 防竞态：只保留最新一次请求的标记
  const reqIdRef = useRef(0)
  // 手动刷新计数器（refresh 不改变依赖，用计数触发 effect）
  const [refreshFlag, setRefreshFlag] = useState(0)

  useEffect(() => {
    let cancelled = false
    const reqId = ++reqIdRef.current
    setLoading(true)
    fetcher({ ...query, page, pageSize })
      .then(res => {
        if (cancelled || reqId !== reqIdRef.current) return
        setDataSource(res.list)
        setTotal(res.total)
      })
      .catch(err => {
        console.error('useTable fetch error:', err)
      })
      .finally(() => {
        if (!cancelled && reqId === reqIdRef.current) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, query, refreshFlag])

  const onSearch = useCallback((values: Partial<Q>) => {
    setQuery(prev => ({ ...prev, ...values }))
    setPage(1)
  }, [])

  const onReset = useCallback(() => {
    setQuery((initialQuery ?? {}) as Q)
    setPage(1)
  }, [initialQuery])

  const refresh = useCallback(() => {
    setRefreshFlag(n => n + 1)
  }, [])

  const pagination = {
    placement: ['bottomCenter'] as const,
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    showTotal: (t: number) => `共 ${t} 条`,
    onChange: (p: number, ps: number) => {
      setPage(p)
      setPageSize(ps)
    },
  }

  return { dataSource, loading, pagination, query, onSearch, onReset, refresh }
}
