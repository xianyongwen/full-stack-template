import { useState } from 'react'
import { Empty, Tag, Alert, Segmented } from 'antd'
import Container from '@/components/Container'
import ContainerHeader from '@/components/Container/ContainerHeader'
import { customerInsightStream } from '../mock/api'
import type {
  CustomerInsightVO,
  CustomerInsightProfile,
  RiskLevel,
} from '../mock/types'
import { useAnalysisStream } from './useAnalysisStream'
import AnalysisUpdateTime from './AnalysisUpdateTime'
import AiTips from '@/components/AiTips'
import CustomerMetricsCards from './CustomerMetricsCards'
import { useCustomerMetrics } from './useCustomerMetrics'
import CustomerValueTrends from './CustomerValueTrends'
import { cname } from '@/utils'
import styles from '../cards.module.scss'

const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: '低', color: 'green' },
  medium: { label: '中', color: 'orange' },
  high: { label: '高', color: 'red' },
}

const PROFILE_FIELDS: {
  key: keyof CustomerInsightVO['profile']
  label: string
}[] = [
  { key: 'industry', label: '行业' },
  { key: 'scale', label: '企业规模' },
  { key: 'techDirection', label: '技术方向' },
  { key: 'purchaseHabit', label: '采购习惯' },
  { key: 'budget', label: '预算' },
  { key: 'riskPreference', label: '风险偏好' },
]

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-medium text-gray-500 mb-2 mt-1">{children}</div>
)

const ReasonList = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul className="space-y-0.5 list-none p-0 m-0">
      {items.map((r, i) => (
        <li
          key={i}
          className="text-sm text-gray-500 leading-relaxed flex gap-1"
        >
          <span className="text-purple-400 text-base leading-none">·</span>
          <span>{r}</span>
        </li>
      ))}
    </ul>
  ) : null

/** 客户画像的合并依据工具提示：把所有字段的 Basis 集中到标题右侧。 */
const ProfileBasisTips = ({
  profile,
  basis,
}: {
  profile: CustomerInsightProfile
  basis?: Partial<Record<keyof CustomerInsightProfile, string[]>>
}) => {
  const entries = PROFILE_FIELDS.filter(
    f => basis?.[f.key]?.length && profile[f.key]
  ).map(f => ({
    ...f,
    value: profile[f.key] as string,
    basis: basis![f.key]!,
  }))
  if (entries.length === 0) return null
  return (
    <AiTips
      placement="left"
      text={
        <div className="flex flex-col gap-1">
          {entries.map(e => (
            <Alert
              key={e.key}
              title={`${e.label}：${e.value}`}
              description={e.basis.join('；')}
              type="info"
            />
          ))}
        </div>
      }
    />
  )
}

const AICustomerInsight = ({
  bodyMaxHeight = '677px',
}: {
  bodyMaxHeight?: string
}) => {
  const { customer, data, generatedAt, thinking, error, loading, run } =
    useAnalysisStream<CustomerInsightVO>(customerInsightStream, {
      autoRun: true,
      cacheType: 'customer_insight',
    })
  // 客户健康度 + 成交率：基于 mock 数据，随选中客户带出，独立于 AI 分析
  const { metrics, loading: metricsLoading } = useCustomerMetrics(
    customer?.id ?? null
  )
  // 客户信息（AI 洞察）/ 客户价值（趋势图）切换
  const [insightTab, setInsightTab] = useState<'info' | 'value'>('info')

  return (
    <Container
      thinking={thinking}
      className="flex flex-col flex-1 p-0! relative"
    >
      <ContainerHeader title="AI客户洞察">
        <div className="flex gap-2 items-center">
          <div className="min-w-0">
            <AnalysisUpdateTime at={generatedAt} />
          </div>
          <button
            className="pretty-btn h-[32px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={run}
            disabled={!customer || loading}
            title="重新分析"
          >
            {loading ? '分析中…' : 'AI生成'}
          </button>
        </div>
      </ContainerHeader>

      <div
        className="flex-1 overflow-y-auto p-4 [scrollbar-color:var(--theme-scrollbar-thumb)_transparent]"
        style={{ maxHeight: bodyMaxHeight }}
      >
        {!customer ? (
          <Empty description="请在关系图谱中选择客户" className="mt-20" />
        ) : (
          <div className="flex flex-col gap-2">
            {error && (
              <Alert
                type="error"
                title={error}
                showIcon
                className="!px-3 !py-2"
              />
            )}

            <Segmented
              value={insightTab}
              onChange={v => setInsightTab(v as 'info' | 'value')}
              options={[
                { label: '客户信息', value: 'info' },
                { label: '客户价值', value: 'value' },
              ]}
              block
              size="small"
              className="mb-1"
            />

            {insightTab === 'info' && (
              <>
                {/* 客户画像 */}
                {data && (
                  <div
                    className={cname('rounded-lg p-3', styles['purpleCard'])}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <SectionTitle>客户画像</SectionTitle>
                      <ProfileBasisTips
                        profile={data.profile}
                        basis={data.profileBasis}
                      />
                    </div>
                    {PROFILE_FIELDS.filter(f => data.profile[f.key]).length ? (
                      <div className="flex flex-col gap-x-3 gap-y-2">
                        {PROFILE_FIELDS.map(f => {
                          const v = data.profile[f.key]
                          if (!v) return null
                          return (
                            <div
                              key={f.key}
                              className="min-w-0 flex items-start gap-2"
                            >
                              <div className="shrink-0 text-sm text-gray-400 w-[60px]">
                                {f.label}
                              </div>
                              <div className="min-w-0 text-sm wrap">{v}</div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">暂无画像信息</div>
                    )}
                  </div>
                )}

                {/* 客户健康度 + 成交率：基于 mock 数据，独立于 AI 分析 */}
                <CustomerMetricsCards
                  metrics={metrics}
                  loading={metricsLoading}
                />

                {/* 风险提醒 */}
                {data && (
                  <div className={cname('rounded-lg p-3', styles['riskCard'])}>
                    <div className="flex items-center w-full justify-between gap-2 mb-2">
                      <SectionTitle>风险提醒</SectionTitle>
                      <Tag
                        bordered={false}
                        color={RISK_META[data.risk.level].color}
                        className="m-0"
                      >
                        {RISK_META[data.risk.level].label}
                      </Tag>
                    </div>
                    <ReasonList items={data.risk.reasons} />
                  </div>
                )}
              </>
            )}

            {insightTab === 'value' && (
              <CustomerValueTrends customerId={customer.id} />
            )}
          </div>
        )}
      </div>
    </Container>
  )
}

export default AICustomerInsight
