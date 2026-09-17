import { useEffect, useState } from 'react'
import type { Dayjs } from 'dayjs'
import { customerApi } from '../mock/api'
import type { CustomerValueTrendsData } from '../mock/types'

export type CustomerDateRange = [Dayjs, Dayjs]

/**
 * 客户价值趋势：合同金额 / 合同数量 / 成交率按月序列。
 * 统计由后端完成，前端仅按日期范围拉取。
 */
export function useCustomerValueTrends(
  customerId: string | null,
  dateRange: CustomerDateRange
) {
  const [start, end] = dateRange
  const [data, setData] = useState<CustomerValueTrendsData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!customerId) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    customerApi
      .valueTrends(
        customerId,
        start.format('YYYY-MM-DD'),
        end.format('YYYY-MM-DD')
      )
      .then(res => {
        if (cancelled) return
        setData(res)
      })
      .catch(() => {
        if (cancelled) return
        setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId, start, end])

  return { data, loading }
}
