import { useEffect, useState } from 'react'
import { Empty, Tag, message, Alert, Segmented } from 'antd'
import Container from '@/components/Container'
import ContainerHeader from '@/components/Container/ContainerHeader'
import { relationAnalysisStream } from '../mock/api'
import type { RelationAnalysisVO } from '../mock/types'
import { dashboardBus } from '@/pages/Dashboard/bus'
import { RELATION_TYPES } from './CustomerRelationGraph/GraphModals'
import { useAnalysisStream } from './useAnalysisStream'
import AnalysisUpdateTime from './AnalysisUpdateTime'
import AiTips, { BasisTips } from '@/components/AiTips'
import { cname } from '@/utils'
import styles from '../cards.module.scss'

/** 关系类型 label/色（与图谱边一致） */
const RELATION_META = Object.fromEntries(RELATION_TYPES.map(r => [r.value, r]))

/** 评分条（0-100） */
const ScoreBar = ({ value, color }: { value: number; color: string }) => (
  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
    <div
      className="h-full rounded-full transition-all"
      style={{
        width: `${Math.max(0, Math.min(100, value))}%`,
        background: color,
      }}
    />
  </div>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-medium text-gray-500 mb-2 mt-1">{children}</div>
)

const AIRelationAnalysis = ({
  bodyMaxHeight = '677px',
}: {
  bodyMaxHeight?: string
}) => {
  // 图谱选中联系人时，高亮排行榜中对应项（§4.1.7 联动）
  const [highlightContactId, setHighlightContactId] = useState<string | null>(
    null
  )

  // 影响力排行 / 关系强度 切换
  const [rankTab, setRankTab] = useState<'influence' | 'strength' | 'network'>(
    'influence'
  )

  const {
    customer,
    data: analysis,
    generatedAt,
    thinking,
    error,
    loading,
    run,
  } = useAnalysisStream<RelationAnalysisVO>(relationAnalysisStream, {
    autoRun: false,
    cacheType: 'relation_analysis',
  })

  // 监听图谱节点选中：contact:selected -> 高亮排行榜中对应联系人
  useEffect(() => {
    const onContact = (c: { id: string; name: string }) => {
      setHighlightContactId(c.id)
    }
    dashboardBus.on('contact:selected', onContact)
    return () => {
      dashboardBus.off('contact:selected', onContact)
    }
  }, [])

  // 出错时弹错误提示（hook 仅 setError）
  useEffect(() => {
    if (error) message.error(error)
  }, [error])

  // 当前 Tab 无数据时回退到另一项
  useEffect(() => {
    if (!analysis) return
    if (
      rankTab === 'influence' &&
      analysis.influenceRanking.length === 0 &&
      analysis.relationStrength.length > 0
    ) {
      setRankTab('strength')
    } else if (
      rankTab === 'strength' &&
      analysis.relationStrength.length === 0 &&
      analysis.influenceRanking.length > 0
    ) {
      setRankTab('influence')
    }
  }, [analysis, rankTab])

  const emptyText = customer
    ? '点击「AI生成」开始分析'
    : '请在关系图谱中选择客户'

  return (
    <Container
      thinking={thinking}
      className="flex flex-col flex-1 p-0! relative"
    >
      <ContainerHeader title="AI关系分析">
        <div className="flex gap-2 items-center">
          <div className="min-w-0">
            <AnalysisUpdateTime at={generatedAt} />
          </div>
          <button
            className="pretty-btn h-[32px] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={run}
            disabled={!customer || loading}
          >
            {loading ? '分析中…' : 'AI生成'}
          </button>
        </div>
      </ContainerHeader>

      <div
        className="flex-1 overflow-y-auto p-4 [scrollbar-color:transparent_transparent] hover:[scrollbar-color:var(--theme-scrollbar-thumb)_transparent]"
        style={{ maxHeight: bodyMaxHeight }}
      >
        {!analysis ? (
          <Empty description={emptyText} className="mt-20" />
        ) : (
          <div className="flex flex-col gap-4">
            {/* 影响力排行 / 关系强度（前五，Segmented 切换） */}
            {(analysis.influenceRanking.length > 0 ||
              analysis.relationStrength.length > 0) && (
              <div>
                <Segmented
                  value={rankTab}
                  onChange={v => setRankTab(v as 'influence' | 'strength')}
                  options={[
                    { label: '影响力排行', value: 'influence' },
                    { label: '关系强度', value: 'strength' },
                    { label: '关系网络统计', value: 'network' },
                  ]}
                  block
                  size="small"
                  className="mb-2"
                />
                <div className="flex flex-col gap-2">
                  {rankTab === 'influence' &&
                    analysis.influenceRanking.slice(0, 5).map((item, idx) => {
                      const meta = item.relationType
                        ? RELATION_META[item.relationType]
                        : undefined
                      return (
                        <div
                          key={item.contactId}
                          onClick={() => {
                            setHighlightContactId(item.contactId)
                            dashboardBus.emit('contact:selected', {
                              id: item.contactId,
                              name: item.name,
                            })
                          }}
                          className={`cursor-pointer rounded-lg px-3 py-1 transition-colors hover:bg-gray-50 ${
                            highlightContactId === item.contactId
                              ? 'border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-300'
                              : 'border-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-semibold text-gray-400 tabular-nums w-4 shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {item.name}
                              </span>
                              {meta && (
                                <Tag
                                  bordered={false}
                                  color={meta.color}
                                  className="m-0 text-[11px] leading-none"
                                >
                                  {meta.label}
                                </Tag>
                              )}
                            </div>
                            <div className="flex items-center gap-1 min-w-0">
                              <span
                                className="text-sm font-semibold tabular-nums shrink-0"
                                style={{ color: '#5A8CFF' }}
                              >
                                {item.score}
                              </span>
                              <AiTips
                                text={
                                  item.reasons.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                      {item.reasons.map((r, i) => (
                                        <Alert key={i} title={r} type="info" />
                                      ))}
                                    </div>
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1">
                              <ScoreBar
                                value={item.score}
                                color="linear-gradient(90deg, #8A5BFF 0%, #6E6DFF 50%, #5A8CFF 100%)"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  {rankTab === 'strength' &&
                    analysis.relationStrength.slice(0, 5).map((s, i) => (
                      <div
                        key={s.contactId ?? i}
                        onClick={() => {
                          if (!s.contactId) return
                          setHighlightContactId(s.contactId)
                          dashboardBus.emit('contact:selected', {
                            id: s.contactId,
                            name: s.name,
                          })
                        }}
                        className={`rounded-lg px-3 py-1 transition-colors ${
                          s.contactId ? 'cursor-pointer hover:bg-gray-50' : ''
                        } ${
                          s.contactId && highlightContactId === s.contactId
                            ? 'border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-300'
                            : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {s.name}
                            </span>
                            {s.position && (
                              <span className="text-xs text-gray-400 truncate">
                                {s.position}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className="text-sm font-semibold tabular-nums shrink-0"
                              style={{ color: '#FF7B1C' }}
                            >
                              {s.strength}
                            </span>
                            <AiTips
                              text={
                                s.factors.length > 0 && (
                                  <div className="flex flex-col gap-1">
                                    {s.factors.map((r, i) => (
                                      <Alert key={i} title={r} type="info" />
                                    ))}
                                  </div>
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="mt-1">
                          <ScoreBar
                            value={s.strength}
                            color="linear-gradient(90deg, #FFB84D, #FF9D2E, #FF7B1C)"
                          />
                        </div>
                      </div>
                    ))}
                </div>
                {/* 关系网络统计 */}
                {rankTab === 'network' && (
                  <div>
                    <SectionTitle>关系网络</SectionTitle>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          label: '联系人数',
                          value: analysis.networkStats.contactCount,
                        },
                        {
                          label: '关系数',
                          value: analysis.networkStats.edgeCount,
                        },
                        {
                          label: '网络密度',
                          value: analysis.networkStats.density.toFixed(2),
                          tips: (
                            <div className="flex flex-col gap-1">
                              <Alert
                                title="网络密度 = 2 × 关系数 / (节点数 × (节点数 - 1))"
                                type="info"
                              />
                              <Alert
                                title="反映关系网络中实际边数占理论最大可能边数的比例"
                                type="info"
                              />
                              <Alert
                                title="基于无向图计算，取值范围 0~1，值越大表示节点间联系越紧密"
                                type="info"
                              />
                            </div>
                          ),
                        },
                        {
                          label: '平均影响力',
                          value: `${analysis.networkStats.avgInfluence} / 5`,
                        },
                      ].map(s => (
                        <div
                          key={s.label}
                          className={cname(
                            'rounded-lg p-2.5 flex flex-col',
                            styles.whiteCard
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs text-gray-400">
                              {s.label}
                            </span>
                            {s.tips && <AiTips text={s.tips} />}
                          </div>
                          <span className="text-base text-center font-semibold  tabular-nums">
                            {s.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 关键决策人 */}
            {analysis.keyDecisionMakers.length > 0 && (
              <div>
                <SectionTitle>关键决策人</SectionTitle>
                <div className="flex flex-col gap-2">
                  {analysis.keyDecisionMakers.map((m, i) => (
                    <div
                      key={i}
                      className={cname('rounded-lg p-3', styles.infoCard)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {m.name}
                        </span>
                        {m.position && (
                          <span className="text-xs text-gray-400">
                            {m.position}
                          </span>
                        )}
                      </div>
                      {m.reason && (
                        <div className="mt-1 text text-gray-500 leading-relaxed">
                          {m.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 总体结论 */}
            {analysis.summary && (
              <div className={cname('rounded-lg p-3', styles.summaryCard)}>
                <div className="flex items-center justify-between gap-2">
                  <SectionTitle>总体结论</SectionTitle>
                  <BasisTips basis={analysis.summaryBasis} />
                </div>
                <div className="text-sm leading-relaxed">
                  {analysis.summary}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  )
}

export default AIRelationAnalysis
