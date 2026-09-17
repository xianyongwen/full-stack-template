import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { customerApi, interactionApi, opportunityApi } from '../mock/api'
import type { ContractVO } from '../mock/types'

export type HealthLevel = 'good' | 'warning' | 'danger'

export interface CustomerMetrics {
  /** 健康度评分 0-100 */
  healthScore: number
  level: HealthLevel
  /** 合同回款进度 0-1 */
  paymentProgress: number
  /** 近一年是否有新合同 */
  hasNewContract: boolean
  /** 互动频次（全类型合计） */
  interactionCount: number
  /** 商机数量 */
  opportunityCount: number
  /** 成交商机数 */
  closedWon: number
  /** 丢单商机数 */
  closedLost: number
  /** 成交率 0-1 */
  closeRate: number
}

/**
 * 客户健康度评分（0-100）：四因子各 25 分
 * - 合同回款进度：receivedAmount / amount（无合同记 0 分）
 * - 近一年是否有新合同：有 25 / 无 0
 * - 互动频次：min(count, 6) / 6 × 25
 * - 商机数量：min(count, 3) / 3 × 25
 */
function computeMetrics(
  contracts: ContractVO[],
  stats: Record<string, number>,
  stageCounts: Record<string, number>,
): CustomerMetrics {
  const totalAmount = contracts.reduce((s, c) => s + c.amount, 0)
  const totalReceived = contracts.reduce((s, c) => s + c.receivedAmount, 0)
  const paymentProgress = totalAmount > 0 ? totalReceived / totalAmount : 0

  const oneYearAgo = dayjs().subtract(1, 'year')
  const hasNewContract = contracts.some(
    (c) => c.signDate && dayjs(c.signDate).isAfter(oneYearAgo),
  )

  const interactionCount = Object.values(stats).reduce((s, n) => s + (n ?? 0), 0)
  const opportunityCount = Object.values(stageCounts).reduce(
    (s, n) => s + (n ?? 0),
    0,
  )
  const closedWon = stageCounts.CLOSED_WON ?? 0
  const closedLost = stageCounts.CLOSED_LOST ?? 0
  const closedTotal = closedWon + closedLost
  const closeRate = closedTotal > 0 ? closedWon / closedTotal : 0

  const paymentScore = totalAmount > 0 ? paymentProgress * 25 : 0
  const newContractScore = hasNewContract ? 25 : 0
  const interactionScore = (Math.min(interactionCount, 6) / 6) * 25
  const opportunityScore = (Math.min(opportunityCount, 3) / 3) * 25
  const healthScore = Math.round(
    paymentScore + newContractScore + interactionScore + opportunityScore,
  )
  const level: HealthLevel =
    healthScore >= 75 ? 'good' : healthScore >= 40 ? 'warning' : 'danger'

  return {
    healthScore,
    level,
    paymentProgress,
    hasNewContract,
    interactionCount,
    opportunityCount,
    closedWon,
    closedLost,
    closeRate,
  }
}

/**
 * 客户健康度 + 成交率指标：基于 mock 数据（合同 / 互动 / 商机），独立于 AI 分析。
 * 切换客户时旧数据立即失效，重新拉取期间视为加载中（避免残留上一客户的数据）。
 */
export function useCustomerMetrics(customerId: string | null) {
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!customerId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      customerApi.contracts(customerId),
      interactionApi.stats(customerId),
      opportunityApi.stageCount({ customerId }),
    ])
      .then(([contracts, stats, stageCounts]) => {
        if (cancelled) return
        setMetrics(computeMetrics(contracts, stats, stageCounts))
        setLoadedId(customerId)
      })
      .catch(() => {
        if (cancelled) return
        setMetrics(null)
        setLoadedId(customerId)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  // 数据仅在对应当前客户时才有效；切换客户期间（loadedId 未同步）视为加载中
  const valid = loadedId === customerId
  return {
    metrics: valid ? metrics : null,
    loading: customerId ? !valid || loading : false,
  }
}
