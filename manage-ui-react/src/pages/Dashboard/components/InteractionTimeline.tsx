import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Empty, Segmented, Skeleton, Tag } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import Container from '@/components/Container'
import ContainerHeader from '@/components/Container/ContainerHeader'
import { interactionApi } from '../mock/api'
import { fileApi } from '@/api/file'
import type { InteractionTimelineVO } from '../mock/types'
import { dashboardBus } from '@/pages/Dashboard/bus'
import InteractionHeatmap from './InteractionHeatmap'
import {
  TYPE_ICON,
  TYPE_META,
  formatCurrency,
  formatEventTime,
  getFileIcon,
  groupTimelineByDate,
} from './timeline'

type ViewMode = 'timeline' | 'heatmap'

const PAGE_SIZE = 20

const InteractionTimeline = () => {
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(
    null,
  )
  // 联系人筛选：选中联系人节点后，在已加载事件中按联系人过滤
  const [contactFilter, setContactFilter] = useState<{
    id: string
    name: string
  } | null>(null)
  const [timeline, setTimeline] = useState<InteractionTimelineVO[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')

  const loadTimeline = useCallback(
    async (customerId: string, cursor?: string, append = false) => {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      try {
        const data = await interactionApi.timeline({
          customerId,
          cursor,
          limit: PAGE_SIZE,
        })
        setTimeline((prev) => (append ? [...prev, ...data.list] : data.list))
        setHasMore(data.hasMore)
        setNextCursor(data.nextCursor)
      } catch {
        // 错误提示由请求拦截器统一处理
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [],
  )

  // 监听图谱节点选中：
  // - customer:selected -> 加载该客户的互动事件
  // - contact:selected  -> 在已加载事件中按联系人过滤
  useEffect(() => {
    const onCustomer = (c: { id: string; name: string }) => {
      console.log('res customer:selected')
      setContactFilter(null)
      setCustomer(c)
      setTimeline([])
      setHasMore(false)
      setNextCursor(null)
      loadTimeline(c.id)
    }
    const onContact = (c: { id: string; name: string }) => {
      console.log('res contact:selected')
      setContactFilter(c)
    }
    dashboardBus.on('customer:selected', onCustomer)
    dashboardBus.on('contact:selected', onContact)
    return () => {
      dashboardBus.off('customer:selected', onCustomer)
      dashboardBus.off('contact:selected', onContact)
    }
  }, [loadTimeline])

  const handleLoadMore = () => {
    if (customer && nextCursor && !loadingMore) {
      loadTimeline(customer.id, nextCursor, true)
    }
  }

  const filteredTimeline = useMemo(() => {
    if (!contactFilter) return timeline
    return timeline.filter(
      (item) =>
        item.contactId === contactFilter.id ||
        item.contact?.id === contactFilter.id,
    )
  }, [timeline, contactFilter])

  const groups = useMemo(
    () => groupTimelineByDate(filteredTimeline),
    [filteredTimeline],
  )

  const emptyText = !customer
    ? '请在关系图谱中选择客户'
    : contactFilter && filteredTimeline.length === 0
      ? '该联系人暂无互动记录'
      : '暂无互动记录'

  return (
    <Container loading={loading} className="flex flex-col flex-1 p-0! relative">
      <ContainerHeader title="互动时间轴">
        {customer && (
          <div className="flex items-center gap-2 min-w-0">
            <Segmented
              size="small"
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              options={[
                { label: '时间轴', value: 'timeline' },
                { label: '热力图', value: 'heatmap' },
              ]}
            />
            {contactFilter && (
              <Tag
                bordered={false}
                closable
                color="blue"
                className="m-0 text-xs"
                onClose={() => setContactFilter(null)}
              >
                {contactFilter.name}
              </Tag>
            )}
          </div>
        )}
      </ContainerHeader>

      {!customer ? (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Empty description={emptyText} className="mt-20" />
        </div>
      ) : viewMode === 'heatmap' ? (
        <InteractionHeatmap
          customerId={customer.id}
          contactFilter={contactFilter}
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-color:transparent_transparent] hover:[scrollbar-color:var(--theme-scrollbar-thumb)_transparent]">
          {loading && timeline.length === 0 ? (
            <div className="space-y-6 mt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} active avatar paragraph={{ rows: 2 }} />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Empty description={emptyText} className="mt-20" />
          ) : (
            <div className="relative pl-3">
            {/* 时间轴线 */}
            <div className="absolute left-[22px] top-2 bottom-2 w-px bg-gray-200" />

            {groups.map((group) => (
              <div key={group.date} className="mb-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-blue-500 bg-white">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {group.weekday.split(' ')[0]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {group.weekday.split(' ')[1]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {group.count} 条
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {group.items.map((item) => {
                    const meta = TYPE_META[item.type]
                    const { time } = formatEventTime(item.eventTime)
                    return (
                      <div key={item.id} className="relative flex gap-4 pl-18">
                        {/* 时间点 */}
                        <div
                          className="absolute left-4 top-1 flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 bg-white text-xs"
                          style={{ borderColor: meta.color }}
                        >
                          <span
                            className="font-semibold"
                            style={{ color: meta.color }}
                          >
                            {time}
                          </span>
                        </div>

                        {/* 内容卡片 */}
                        <div
                          className="flex-1 rounded-xl border border-gray-100 bg-white shadow-sm p-4 transition-colors"
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: meta.color,
                          }}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Tag
                              bordered={false}
                              className="m-0 flex items-center gap-1 px-2 py-0.5 text-xs"
                              style={{
                                backgroundColor: `${meta.color}15`,
                                color: meta.color,
                              }}
                            >
                              {TYPE_ICON[item.type]} {meta.label}
                            </Tag>
                            <span className="text-sm font-semibold text-gray-900">
                              {item.title}
                            </span>
                            {item.status && (
                              <Tag
                                bordered={false}
                                className="m-0 text-xs"
                                color={
                                  item.status === 'PENDING'
                                    ? 'blue'
                                    : item.status === 'DONE'
                                      ? 'green'
                                      : item.status === 'TRANSCRIBED'
                                        ? 'purple'
                                        : 'default'
                                }
                              >
                                {item.status === 'PENDING'
                                  ? '待办'
                                  : item.status === 'DONE'
                                    ? '已完成'
                                    : item.status === 'TRANSCRIBED'
                                      ? '已转写'
                                      : item.status}
                              </Tag>
                            )}
                          </div>
                          {/* 参与人 / 对方 / 负责人 */}
                          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {item.contact && (
                              <span>
                                对方：{item.contact.name}
                                {item.contact.position
                                  ? `（${item.contact.position}）`
                                  : ''}
                              </span>
                            )}
                            {item.duration != null && item.duration > 0 && (
                              <span>{item.duration} 分钟</span>
                            )}
                            {item.dueDate && (
                              <span>
                                截止 {dayjs(item.dueDate).format('MM-DD')}
                              </span>
                            )}
                            {item.amount != null && (
                              <span className="font-medium text-orange-500">
                                {formatCurrency(item.amount)}
                              </span>
                            )}
                          </div>
                          {/* 摘要 / 内容 */}
                          {item.summary && (
                            <p className="mb-2 text-sm text-gray-600">
                              {item.summary}
                            </p>
                          )}
                          {!item.summary && item.content && (
                            <p className="mb-2 line-clamp-3 text-sm text-gray-600">
                              {item.content}
                            </p>
                          )}
                          {/* 附件 */}
                          {item.attachments && item.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {item.attachments.map((file, idx) => (
                                <a
                                  key={idx}
                                  href={fileApi.downloadUrl(file.fileId)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600"
                                >
                                  {getFileIcon(file.type)}
                                  <span className="max-w-[120px] truncate">
                                    {file.name}
                                  </span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* 加载更多 */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  type="link"
                  loading={loadingMore}
                  onClick={handleLoadMore}
                  icon={<DownOutlined />}
                >
                  查看更多历史记录
                </Button>
              </div>
            )}
          </div>
        )}
        </div>
      )}
    </Container>
  )
}

export default InteractionTimeline
