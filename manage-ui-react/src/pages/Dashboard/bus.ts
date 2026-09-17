import mitt, { type Emitter } from 'mitt'

// Dashboard 面板间通信总线
// 图谱节点选中后，通过该总线广播给其它面板（如客户详情、联系人详情）
export type DashboardEvents = {
  // 选中客户节点（id 为客户原始 id，name 为客户名称）
  'customer:selected': { id: string; name: string }
  // 选中联系人节点（id 为联系人原始 id，name 为联系人名称）
  'contact:selected': { id: string; name: string }
  // 离开 Dashboard 时广播，清空总线去重缓存
  clear: undefined
}

const emitter = mitt<DashboardEvents>()

// 记录上一次发出的事件 key（事件类型 + 序列化参数），与上次完全相同时跳过本次发送
let lastKey: string | undefined

export const dashboardBus: Emitter<DashboardEvents> = {
  emit(type, payload?) {
    // clear 事件：重置去重缓存，本身不参与去重判断
    if (type === 'clear') {
      lastKey = undefined
      emitter.emit('clear')
      return
    }
    const key = `${String(type)}:${JSON.stringify(payload ?? null)}`
    if (key === lastKey) return
    lastKey = key
    emitter.emit(type, payload as DashboardEvents[typeof type])
  },
  on: emitter.on.bind(emitter),
  off: emitter.off.bind(emitter),
  all: emitter.all,
}
