import { Alert, Empty } from 'antd'
import Container from '@/components/Container'
import ContainerHeader from '@/components/Container/ContainerHeader'
import { customerSummaryStream } from '../mock/api'
import type { CustomerSummaryVO, CustomerSummaryItem } from '../mock/types'
import { useAnalysisStream } from './useAnalysisStream'
import AnalysisUpdateTime from './AnalysisUpdateTime'
import AiTips, { BasisTips } from '@/components/AiTips'
import cardStyles from '../cards.module.scss'
import { cname } from '@/utils'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-medium text-gray-500 mb-2 mt-1">{children}</div>
)

/** 把可能为旧缓存字符串的条目归一化为 {text, basis} */
const normalizeItem = (item: CustomerSummaryItem): { text: string; basis?: string[] } =>
  typeof item === 'string' ? { text: item } : item

/** 列表型条目的合并依据工具提示：把所有条目的依据集中到标题右侧。 */
const ListBasisTips = ({ items }: { items: CustomerSummaryItem[] }) => {
  const entries = items
    .map(normalizeItem)
    .filter((i) => i.basis && i.basis.length > 0)
  if (entries.length === 0) return null
  return (
    <AiTips
      placement="left"
      text={
        <div className="flex flex-col gap-1">
          {entries.map((e, i) => (
            <Alert
              key={i}
              title={e.text}
              description={e.basis!.join('；')}
              type="info"
            />
          ))}
        </div>
      }
    />
  )
}

/** 带图标的条目列表（每条前缀一个有色小方块） */
const ItemList = ({
  items,
  color,
}: {
  items: CustomerSummaryItem[]
  color: string
}) =>
  items.length ? (
    <ul className="space-y-1 list-none p-0 m-0">
      {items.map((t, i) => (
        <li
          key={i}
          className="text-xs text-gray-600 leading-relaxed flex gap-1.5"
        >
          <span
            className="w-1 h-1 rounded-full mt-[7px] shrink-0"
            style={{ background: color }}
          />
          <span>{typeof t === 'string' ? t : t.text}</span>
        </li>
      ))}
    </ul>
  ) : (
    <div className="text-xs text-gray-400">暂无</div>
  )

const AISummary = () => {
  const { customer, data, generatedAt, thinking, error, loading, run } =
    useAnalysisStream<CustomerSummaryVO>(customerSummaryStream, {
      autoRun: true,
      cacheType: 'customer_summary',
    })

  return (
    <Container thinking={thinking} className="flex flex-col flex-1 p-0! relative">
      <ContainerHeader title="AI智能总结">
        <div className="flex gap-2 items-center">
          <div className="min-w-0">
            <AnalysisUpdateTime at={generatedAt} />
          </div>
          <button
            className="pretty-btn h-[32px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={run}
            disabled={!customer || loading}
            title="重新生成"
          >
            {loading ? '分析中…' : 'AI生成'}
          </button>
        </div>
      </ContainerHeader>

      <div className="flex-1 overflow-y-auto p-4 [scrollbar-color:transparent_transparent] hover:[scrollbar-color:var(--theme-scrollbar-thumb)_transparent]">
        {!customer ? (
          <Empty description="请在关系图谱中选择客户" className="mt-16" />
        ) : error ? (
          <Empty description={error} className="mt-16" />
        ) : data ? (
          <div className="flex flex-col gap-4">
            {/* 本次总结 */}
            {data.summary && (
              <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <SectionTitle>本次总结</SectionTitle>
                  <BasisTips basis={data.summaryBasis} />
                </div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {data.summary}
                </div>
              </div>
            )}

            {/* 客户需求 */}
            <div className={cname("rounded-lg p-3", cardStyles['infoCard'])}>
              <div className="flex items-center justify-between gap-2">
                <SectionTitle>客户需求</SectionTitle>
                <ListBasisTips items={data.requirements} />
              </div>
              <ItemList items={data.requirements} color="#4f46e5" />
            </div>

            {/* 风险 */}
            {/* <div className={cname("rounded-lg p-3", cardStyles['riskCard'])}>
              <div className="flex items-center justify-between gap-2">
                <SectionTitle>风险</SectionTitle>
                <ListBasisTips items={data.risks} />
              </div>
              <ItemList items={data.risks} color="#ef4444" />
            </div> */}

            {/* 下一步计划 */}
            <div className={cname('rounded-lg p-3', cardStyles['planCard'])}>
              <div className="flex items-center justify-between gap-2">
                <SectionTitle>下一步计划</SectionTitle>
                <ListBasisTips items={data.nextSteps} />
              </div>
              {data.nextSteps.length ? (
                <ol className="space-y-1 list-none p-0 m-0">
                  {data.nextSteps.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm leading-relaxed flex gap-1.5"
                    >
                      <span className="text-gray-400 tabular-nums shrink-0">
                        {i + 1}.
                      </span>
                      <span>{typeof s === 'string' ? s : s.text}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-xs text-gray-400">暂无</div>
              )}
            </div>
          </div>
        ) : (
          <Empty description="分析中…" className="mt-16" />
        )}
      </div>
    </Container>
  )
}

export default AISummary
