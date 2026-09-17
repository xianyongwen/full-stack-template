import { Progress, Skeleton, Tag } from 'antd'
import type { CustomerMetrics, HealthLevel } from './useCustomerMetrics'
import { cname } from '@/utils'
import styles from '../cards.module.scss'

const HEALTH_META: Record<
  HealthLevel,
  { label: string; color: string; stroke: string }
> = {
  good: { label: '良好', color: 'green', stroke: '#52c41a' },
  warning: { label: '关注', color: 'orange', stroke: '#faad14' },
  danger: { label: '危险', color: 'red', stroke: '#ff4d4f' },
}

/** 客户健康度 + 成交率：纯展示，数据由父组件通过 useCustomerMetrics 注入 */
const CustomerMetricsCards = ({
  metrics,
  loading,
}: {
  metrics: CustomerMetrics | null
  loading: boolean
}) => {
  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className={cname('rounded-lg p-3', styles['summaryCard'])}>
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ))}
      </div>
    )
  }

  if (!metrics) return null

  const health = HEALTH_META[metrics.level]

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 客户健康度 */}
      <div
        className={cname(
          'rounded-lg p-3 flex flex-col min-w-0',
          styles['summaryCard'],
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-400">客户健康度</span>
          <Tag bordered={false} color={health.color} className="m-0">
            {health.label}
          </Tag>
        </div>
        <div className="flex-1 flex items-center justify-center py-1">
          <Progress
            type="dashboard"
            percent={metrics.healthScore}
            size={104}
            railColor="rgba(0, 0, 0, 0.06)"
            strokeColor={health.stroke}
            strokeWidth={8}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
          <Metric
            label="回款"
            value={`${Math.round(metrics.paymentProgress * 100)}%`}
          />
          <Metric label="新合同" value={metrics.hasNewContract ? '有' : '无'} />
          <Metric label="互动" value={`${metrics.interactionCount}次`} />
          <Metric label="商机" value={`${metrics.opportunityCount}个`} />
        </div>
      </div>

      {/* 成交率 */}
      <div
        className={cname(
          'rounded-lg p-3 flex flex-col min-w-0',
          styles['summaryCard'],
        )}
      >
        <span className="text-xs text-gray-400">成交率</span>
        <div className="flex-1 flex items-center justify-center py-1">
          <Progress
            type="dashboard"
            percent={Math.round(metrics.closeRate * 100)}
            size={104}
            railColor="rgba(0, 0, 0, 0.06)"
            strokeColor={{
              '0%': '#8A5BFF',
              '50%': '#6E6DFF',
              '100%': '#5A8CFF',
            }}
            strokeWidth={8}
          />
        </div>
        <div className="text-[11px] text-gray-500 text-center">
          成交 {metrics.closedWon} · 丢单 {metrics.closedLost}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-1 min-w-0">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-700 truncate">{value}</span>
    </div>
  )
}

export default CustomerMetricsCards
