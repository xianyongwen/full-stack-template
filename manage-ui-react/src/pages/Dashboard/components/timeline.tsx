import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  PhoneOutlined,
  MessageOutlined,
  MailOutlined,
  CarOutlined,
  VideoCameraOutlined,
  DollarOutlined,
  FileTextOutlined,
  EditOutlined,
  CheckSquareOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import {
  INTERACTION_TYPES,
  type InteractionType,
  type InteractionTimelineVO,
} from '../mock/types'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/** 互动类型 -> 图标 */
export const TYPE_ICON: Record<InteractionType, React.ReactNode> = {
  CALL: <PhoneOutlined />,
  CHAT: <MessageOutlined />,
  EMAIL: <MailOutlined />,
  VISIT: <CarOutlined />,
  MEETING: <VideoCameraOutlined />,
  QUOTE: <DollarOutlined />,
  CONTRACT: <FileTextOutlined />,
  REMARK: <EditOutlined />,
  TASK: <CheckSquareOutlined />,
}

/** 互动类型 -> 元信息（label / color） */
export const TYPE_META = Object.fromEntries(
  INTERACTION_TYPES.map(t => [t.value, t])
) as Record<InteractionType, (typeof INTERACTION_TYPES)[number]>

export function formatCurrency(n: number | null | undefined) {
  if (n == null) return ''
  return `¥${n.toLocaleString('zh-CN')}`
}

export function getFileIcon(type?: string) {
  if (!type) return <FileOutlined />
  if (type.includes('pdf')) return <FilePdfOutlined />
  if (type.includes('image') || type.includes('jpg') || type.includes('png'))
    return <FileImageOutlined />
  if (type.includes('audio') || type.includes('mp3')) return <SoundOutlined />
  return <FileOutlined />
}

export function formatEventTime(time: string) {
  const d = dayjs(time)
  return {
    time: d.format('HH:mm'),
    relative: d.fromNow(),
  }
}

export interface TimelineGroup {
  date: string
  weekday: string
  count: number
  items: InteractionTimelineVO[]
}

/** 按日期分组时间轴事件（今天 / 昨天 / 其余日期） */
export function groupTimelineByDate(
  list: InteractionTimelineVO[]
): TimelineGroup[] {
  const groups: TimelineGroup[] = []
  const today = dayjs().startOf('day')
  for (const item of list) {
    const d = dayjs(item.eventTime).startOf('day')
    const dateKey = d.format('YYYY-MM-DD')
    let label = d.format('MM-DD')
    let weekday = d.format('ddd')
    if (d.isSame(today, 'day')) {
      label = '今天'
      weekday = d.format('YYYY-MM-DD · ddd')
    } else if (d.isSame(today.subtract(1, 'day'), 'day')) {
      label = '昨天'
      weekday = d.format('YYYY-MM-DD · ddd')
    } else {
      weekday = d.format('YYYY-MM-DD · ddd')
    }
    const last = groups[groups.length - 1]
    if (last && last.date === dateKey) {
      last.items.push(item)
    } else {
      groups.push({
        date: dateKey,
        weekday: `${label} ${weekday}`,
        count: 1,
        items: [item],
      })
    }
  }
  for (const g of groups) g.count = g.items.length
  return groups
}
