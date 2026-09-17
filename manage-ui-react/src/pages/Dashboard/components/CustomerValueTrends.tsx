import { useMemo, useState } from 'react'
import { DatePicker, Empty } from 'antd'
import dayjs from 'dayjs'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  useCustomerValueTrends,
  type CustomerDateRange,
} from './useCustomerValueTrends'

// 按需注册 ECharts 模块（折线图）
echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

/** 日期范围快捷选项（点击时取当前时间计算） */
const RANGE_PRESETS: { label: string; value: () => CustomerDateRange }[] = [
  { label: '近半年', value: () => [dayjs().subtract(6, 'month'), dayjs()] },
  { label: '近一年', value: () => [dayjs().subtract(1, 'year'), dayjs()] },
  { label: '近三年', value: () => [dayjs().subtract(3, 'year'), dayjs()] },
]

/** 金额紧凑格式：亿 / 万 */
function formatAmount(v: number): string {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}亿`
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`
  return `${v}`
}

interface AxisParam {
  axisValue: string
  value: number | null
}

function buildLineOption(opts: {
  months: string[]
  data: (number | null)[]
  color: string
  min?: number
  max?: number
  yFormatter: (v: number) => string
  tooltipLabel: string
  tooltipFormatter: (v: number) => string
}) {
  const {
    months,
    data,
    color,
    min,
    max,
    yFormatter,
    tooltipLabel,
    tooltipFormatter,
  } = opts
  return {
    grid: { left: 4, right: 16, top: 14, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (params: AxisParam[]) => {
        const p = params[0]
        const label = dayjs(p.axisValue, 'YYYY-MM').format('YYYY年M月')
        if (p.value == null) return `${label}<br/>${tooltipLabel}：暂无`
        return `${label}<br/>${tooltipLabel}：${tooltipFormatter(p.value)}`
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: months,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: {
        color: '#9ca3af',
        fontSize: 10,
        // 1 月显示年份，其余显示月份
        formatter: (val: string) => {
          const d = dayjs(val, 'YYYY-MM')
          return d.month() === 0 ? d.format('YYYY年') : d.format('M月')
        },
      },
    },
    yAxis: {
      type: 'value',
      min,
      max,
      axisLabel: { color: '#9ca3af', fontSize: 10, formatter: yFormatter },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
    },
    series: [
      {
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        connectNulls: false,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}40` },
              { offset: 1, color: `${color}05` },
            ],
          },
        },
      },
    ],
  }
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-medium text-gray-500 mb-1">{children}</div>
)

const TrendChart = ({
  option,
  loading,
}: {
  option: ReturnType<typeof buildLineOption>
  loading: boolean
}) => (
  <ReactEChartsCore
    echarts={echarts}
    option={option}
    notMerge
    showLoading={loading}
    loadingOption={{ text: '', color: '#8A5BFF', lineWidth: 2 }}
    style={{ height: 160, width: '100%' }}
  />
)

interface CustomerValueTrendsProps {
  customerId: string
}

const CustomerValueTrends = ({ customerId }: CustomerValueTrendsProps) => {
  const [dateRange, setDateRange] = useState<CustomerDateRange>(
    () => [dayjs().subtract(1, 'year'), dayjs()] as CustomerDateRange
  )
  const { data, loading } = useCustomerValueTrends(customerId, dateRange)

  const amountOption = useMemo(
    () =>
      data &&
      buildLineOption({
        months: data.months,
        data: data.amounts,
        color: '#5A8CFF',
        yFormatter: v => formatAmount(v),
        tooltipLabel: '合同金额',
        tooltipFormatter: v => `¥${v.toLocaleString()}`,
      }),
    [data]
  )

  const countOption = useMemo(
    () =>
      data &&
      buildLineOption({
        months: data.months,
        data: data.counts,
        color: '#8A5BFF',
        yFormatter: v => `${v}`,
        tooltipLabel: '合同数量',
        tooltipFormatter: v => `${v} 份`,
      }),
    [data]
  )

  const rateOption = useMemo(
    () =>
      data &&
      buildLineOption({
        months: data.months,
        data: data.closeRates,
        color: '#FF7B1C',
        min: 0,
        yFormatter: v => `${Math.round(v * 100)}%`,
        tooltipLabel: '成交率',
        tooltipFormatter: v => `${(v * 100).toFixed(1)}%`,
      }),
    [data]
  )

  if (!data) {
    return (
      <Empty
        description={loading ? '加载中...' : '暂无数据'}
        className="my-10"
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col gap-2">
      <DatePicker.RangePicker
        value={dateRange}
        onChange={dates => {
          const [s, e] = dates ?? []
          if (s && e) setDateRange([s, e])
        }}
        presets={RANGE_PRESETS}
        allowClear={false}
        size="small"
        className="w-full"
      />

      <div>
        <SectionTitle>合同金额趋势</SectionTitle>
        {amountOption && <TrendChart option={amountOption} loading={loading} />}
      </div>

      <div>
        <SectionTitle>合同数量趋势</SectionTitle>
        {countOption && <TrendChart option={countOption} loading={loading} />}
      </div>

      <div>
        <SectionTitle>成交率趋势</SectionTitle>
        {rateOption && <TrendChart option={rateOption} loading={loading} />}
      </div>
    </div>
  )
}

export default CustomerValueTrends
