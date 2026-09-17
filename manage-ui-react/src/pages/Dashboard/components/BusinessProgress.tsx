import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Empty,
  Progress,
  Skeleton,
  Steps,
  Tag,
} from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import Container from '@/components/Container'
import ContainerHeader from '@/components/Container/ContainerHeader'
import { opportunityApi } from '../mock/api'
import {
  OPPORTUNITY_STAGES,
  type OpportunityStage,
  type OpportunityVO,
} from '../mock/types'
import { dashboardBus } from '@/pages/Dashboard/bus'
import cardStyles from '../cards.module.scss'
import { cname } from '@/utils'

/** 商机推进管线阶段（剔除成交 / 丢单），顺序即推进深度 */
const PIPELINE_STAGES = OPPORTUNITY_STAGES.filter(
  (s) => s.value !== 'CLOSED_WON' && s.value !== 'CLOSED_LOST',
)

/** 阶段 -> 推进深度（索引越大越深，用于排序） */
const STAGE_DEPTH: Record<OpportunityStage, number> = Object.fromEntries(
  OPPORTUNITY_STAGES.map((s, i) => [s.value, i]),
) as Record<OpportunityStage, number>

const STAGE_META = Object.fromEntries(
  OPPORTUNITY_STAGES.map((s) => [s.value, s]),
) as Record<OpportunityStage, (typeof OPPORTUNITY_STAGES)[number]>

/** 一次拉足该客户进行中的商机（仪表盘小窗，100 足够覆盖） */
const PAGE_SIZE = 100

const BusinessProgress = () => {
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(
    null,
  )
  const [opportunities, setOpportunities] = useState<OpportunityVO[]>([])
  const [loading, setLoading] = useState(false)
  // 当前展示的商机下标，默认第一条
  const [current, setCurrent] = useState(0)

  const loadOpportunities = useCallback(async (customerId: string) => {
    setLoading(true)
    try {
      const data = await opportunityApi.list({
        customerId,
        page: 1,
        pageSize: PAGE_SIZE,
      })
      // 仅保留进行中的商机，并按推进阶段由深到浅排序
      const active = (data.list ?? [])
        .filter((o) => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST')
        .sort((a, b) => STAGE_DEPTH[b.stage] - STAGE_DEPTH[a.stage])
      setOpportunities(active)
    } catch {
      // 错误提示由请求拦截器统一处理
    } finally {
      setLoading(false)
    }
  }, [])

  // 监听图谱客户选中 -> 加载该客户进行中的商机
  useEffect(() => {
    const onCustomer = (c: { id: string; name: string }) => {
      setCustomer(c)
      setCurrent(0)
      loadOpportunities(c.id)
    }
    dashboardBus.on('customer:selected', onCustomer)
    return () => {
      dashboardBus.off('customer:selected', onCustomer)
    }
  }, [loadOpportunities])

  // 列表变化后保证下标不越界
  useEffect(() => {
    if (current > opportunities.length - 1) {
      setCurrent(0)
    }
  }, [opportunities, current])

  const active = opportunities[current] ?? null

  const emptyText = !customer
    ? '请在关系图谱中选择客户'
    : '该客户暂无进行中的商机'

  return (
    <Container
      loading={loading}
      className="flex flex-col flex-1 p-0! relative"
    >
      <ContainerHeader title="商机进展">
        {customer && (
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-gray-400 truncate max-w-[120px]">
              {customer.name}
            </span>
            {opportunities.length > 0 && (
              <div className="flex items-center gap-0.5">
                <Button
                  type="text"
                  size="small"
                  disabled={current === 0}
                  icon={<LeftOutlined />}
                  onClick={() => setCurrent((i) => Math.max(0, i - 1))}
                />
                <span className="text-xs text-gray-500 tabular-nums px-0.5">
                  {current + 1} / {opportunities.length}
                </span>
                <Button
                  type="text"
                  size="small"
                  disabled={current >= opportunities.length - 1}
                  icon={<RightOutlined />}
                  onClick={() =>
                    setCurrent((i) =>
                      Math.min(opportunities.length - 1, i + 1),
                    )
                  }
                />
              </div>
            )}
          </div>
        )}
      </ContainerHeader>
      <div className="flex-1 relative">
        {!customer ? (
          <Empty description={emptyText} className="mt-20" />
        ) : loading && opportunities.length === 0 ? (
          <div className="p-5">
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : !active ? (
          <Empty description={emptyText} className="mt-20" />
        ) : (
          <OpportunityContent opportunity={active} />
        )}
      </div>
    </Container>
  )
}

/** 单条商机内容：名称 / 阶段 + 推进管线 + 关键指标 */
function OpportunityContent({ opportunity }: { opportunity: OpportunityVO }) {
  const meta = STAGE_META[opportunity.stage]
  const currentIdx = PIPELINE_STAGES.findIndex(
    (s) => s.value === opportunity.stage,
  )

  return (
    <div className="flex flex-col h-full p-5 gap-5 overflow-y-auto [scrollbar-color:var(--theme-scrollbar-thumb)_transparent]">
      {/* 名称 + 阶段 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-base font-semibold text-gray-900 m-0 truncate"
            title={opportunity.name}
          >
            {opportunity.name}
          </h3>
          {opportunity.customer && (
            <span className="text-xs text-gray-400">
              {opportunity.customer.name}
            </span>
          )}
        </div>
        <Tag bordered={false} color={meta?.color ?? 'default'} className="m-0">
          {meta?.label ?? opportunity.stage}
        </Tag>
      </div>

      {/* 推进阶段进度：样式参考 OpportunityEditModal 的 StagePicker，已剔除成交 / 丢单阶段 */}
      <Steps
        type="panel"
        size="small"
        classNames={{
          item: 'flex'
        }}
        current={currentIdx}
        items={PIPELINE_STAGES.map((s) => ({
          title: s.label, classNames: {
            wrapper: 'items-center'
          }
        }))}
      />

      {/* 关键指标卡片：1+3 非对称布局 - 左侧仪表盘为视觉焦点，右侧堆叠三个指标 */}
      <div className="grid grid-cols-[auto_1fr] gap-3 mt-[10px]">
        {/* 成交概率：dashboard 仪表盘（占据整列高度，颜色分段：红 -> 橙 -> 绿） */}
        <div className={cname("rounded-lg p-3 flex flex-col min-w-0 row-span-3", cardStyles['summaryCard'])}>
          <div className="text-xs text-gray-400">成交概率</div>
          <div className="flex-1 flex items-center justify-center">
            <Progress
              type="dashboard"
              percent={opportunity.probability}
              size={120}
              railColor="rgba(0, 0, 0, 0.06)"
              strokeColor={{
                '0%': '#8A5BFF',
                '50%': '#6E6DFF',
                '100%': '#5A8CFF',
              }}
              strokeWidth={10}
            />
          </div>
        </div>
        {/* 商机金额：hero 指标，淡蓝渐变背景突出 */}
        <div className={cname("rounded-lg p-3 flex flex-col min-w-0", cardStyles['summaryCard'])}>
          <div className="text-xs text-gray-400">商机金额</div>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xl font-semibold text-[#5F55F6]">
              ¥{opportunity.amount.toLocaleString()}
            </span>
          </div>
        </div>
        <StatCard
          label="负责人"
          value={opportunity.owner?.nickname ?? opportunity.owner?.username ?? '-'}
        />
        <StatCard
          label="预计成交"
          value={
            opportunity.predictDate
              ? dayjs(opportunity.predictDate).format('YYYY-MM-DD')
              : '-'
          }
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className={cname("rounded-lg p-3 flex flex-col min-w-0", cardStyles['summaryCard'])}>
      <div className="text-xs text-gray-400">{label}</div>
      <div
        className={cname(
          'flex-1 flex items-center justify-center text-sm text-gray-900 truncate',
          valueClass,
        )}
      >
        {value}
      </div>
    </div>
  )
}

export default BusinessProgress
