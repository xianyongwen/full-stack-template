import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/** AI 分析结果更新时间：相对时间为主，绝对时间作 tooltip */
const AnalysisUpdateTime = ({ at }: { at: string | null | undefined }) => {
  if (!at) return null
  const d = dayjs(at)
  return (
    <span
      className="text-[11px] text-gray-400 truncate"
      title={`更新时间：${d.format('YYYY-MM-DD HH:mm')}`}
    >
      更新于{d.fromNow()}
    </span>
  )
}

export default AnalysisUpdateTime
