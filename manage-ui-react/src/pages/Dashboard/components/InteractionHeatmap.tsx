import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { HeatmapChart } from 'echarts/charts'
import {
  CalendarComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { interactionApi } from '../mock/api'
import type { InteractionTimelineVO } from '../mock/types'

// 按需注册 ECharts 模块（calendar 热力图）
echarts.use([
  HeatmapChart,
  CalendarComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
])

// 互动强度色阶：少(#FFB84D) -> 多(#FF7B1C)
const HEAT_COLORS = ['#FFB84D', '#FF7B1C']

interface InteractionHeatmapProps {
  customerId: string
  /** 联系人筛选：对取到的月度事件按联系人过滤 */
  contactFilter: { id: string; name: string } | null
}

const InteractionHeatmap = ({
  customerId,
  contactFilter,
}: InteractionHeatmapProps) => {
  const [month, setMonth] = useState(() => dayjs())
  const [events, setEvents] = useState<InteractionTimelineVO[]>([])
  const [loading, setLoading] = useState(false)

  const loadMonth = useCallback(async (cid: string, m: dayjs.Dayjs) => {
    setLoading(true)
    setEvents([])
    try {
      const from = m.startOf('month').toISOString()
      const to = m.endOf('month').toISOString()
      // 翻页取完该月事件（单客户单月通常远小于上限，最多取 500 条兜底）
      let list: InteractionTimelineVO[] = []
      let cursor: string | undefined
      let safety = 0
      for (;;) {
        const data = await interactionApi.timeline({
          customerId: cid,
          eventTimeFrom: from,
          eventTimeTo: to,
          cursor,
          limit: 100,
        })
        list = list.concat(data.list)
        if (!data.hasMore || !data.nextCursor) break
        cursor = data.nextCursor
        if (++safety >= 5) break
      }
      setEvents(list)
    } catch {
      // 错误提示由请求拦截器统一处理
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMonth(customerId, month)
  }, [customerId, month, loadMonth])

  // 按联系人过滤（与时间轴逻辑一致）
  const filtered = useMemo(() => {
    if (!contactFilter) return events
    return events.filter(
      (item) =>
        item.contactId === contactFilter.id ||
        item.contact?.id === contactFilter.id,
    )
  }, [events, contactFilter])

  // 日期 -> 互动数
  const countByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of filtered) {
      const key = dayjs(item.eventTime).format('YYYY-MM-DD')
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [filtered])

  const maxCount = useMemo(
    () => Math.max(0, ...countByDay.values()),
    [countByDay],
  )

  const todayKey = dayjs().format('YYYY-MM-DD')

  const option = useMemo(() => {
    const daysInMonth = month.daysInMonth() ?? 0
    const monthStart = month.startOf('month')
    // 仅为有互动的日期生成数据点；0 互动的日期不进数据，由日历占位色显示
    const data: Array<{
      value: [string, number]
      itemStyle?: { borderColor: string; borderWidth: number }
    }> = []
    for (let i = 0; i < daysInMonth; i++) {
      const d = monthStart.add(i, 'day')
      const key = d.format('YYYY-MM-DD')
      const count = countByDay.get(key) ?? 0
      if (count === 0) continue
      const item: {
        value: [string, number]
        itemStyle?: { borderColor: string; borderWidth: number }
      } = { value: [key, count] }
      if (key === todayKey) {
        item.itemStyle = { borderColor: '#1677ff', borderWidth: 2 }
      }
      data.push(item)
    }

    return {
      tooltip: {
        formatter: (p: { value: [string, number] }) =>
          `${p.value[0]} · ${p.value[1]} 条互动`,
      },
      visualMap: {
        // 从 1 起映射橙色渐变；0 互动日期不入数据，由日历占位色显示
        min: 1,
        max: maxCount > 0 ? maxCount : 1,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 14,
        itemHeight: 14,
        inRange: { color: HEAT_COLORS },
        text: ['多', '少'],
        textStyle: { color: '#9ca3af', fontSize: 12 },
      },
      calendar: {
        range: month.format('YYYY-MM'),
        orient: 'vertical',
        cellSize: 'auto',
        left: 20,
        right: 20,
        top: 35,
        bottom: 45,
        splitLine: { show: false },
        dayLabel: {
          firstDay: 1,
          nameMap: ['日', '一', '二', '三', '四', '五', '六'],
          color: '#9ca3af',
          fontSize: 12,
        },
        monthLabel: { show: false },
        yearLabel: { show: false },
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff',
          // 0 互动日期（无数据点）的占位色
          color: '#f3f4f6',
        },
      },
      series: {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data,
      },
    }
  }, [month, countByDay, maxCount, todayKey])

  const total = filtered.length
  const canGoNext = month.isBefore(dayjs(), 'month')

  return (
    <div className="flex h-full flex-col px-5 py-4">
      {/* 月份导航 */}
      <div className="mb-1 flex items-center justify-between">
        <Button
          size="small"
          type="text"
          icon={<LeftOutlined />}
          onClick={() => setMonth((m) => m.subtract(1, 'month'))}
        />
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-900">
            {month.format('YYYY年M月')}
          </span>
          <span className="text-xs text-gray-400">共 {total} 条互动</span>
        </div>
        <Button
          size="small"
          type="text"
          disabled={!canGoNext}
          icon={<RightOutlined />}
          onClick={() => setMonth((m) => m.add(1, 'month'))}
        />
      </div>

      <ReactEChartsCore
        echarts={echarts}
        option={option}
        notMerge
        showLoading={loading}
        loadingOption={{ text: '加载中...', color: '#1677ff' }}
        className="min-h-0 flex-1"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  )
}

export default InteractionHeatmap
