/**
 * Dashboard mock API 层。
 *
 * 函数签名与原后端 API 保持一致（返回 Promise / AbortController），
 * 面板组件仅需把 import 源从 '@/api/crm'、'@/api/ai' 换成本文件，
 * 数据全部来自 mock/data.ts，图表 CRUD 与 AI 流式效果在本地模拟。
 */
import type { PageResult } from '@/types/common'
import {
  buildCustomerInsight,
  buildCustomerSummary,
  buildGraph,
  buildInsightMarkdown,
  buildRelationAnalysis,
  buildRelationMarkdown,
  buildSummaryMarkdown,
  buildValueTrends,
  contactsByCustomer,
  contractsByCustomer,
  customers,
  graphsByCustomer,
  interactions,
  opportunitiesByCustomer,
} from './data'
import type {
  AiBuildEvent,
  AnalysisEvent,
  CachedAnalysisType,
  CachedAnalysisVO,
  ContactVO,
  ContractVO,
  CreateGraphEdgeDTO,
  CreateGraphNodeDTO,
  CustomerInsightVO,
  CustomerSummaryVO,
  CustomerVO,
  DeleteGraphEdgeResultVO,
  DeleteNodeResultVO,
  GraphDataVO,
  GraphEdgeVO,
  GraphNodeVO,
  InteractionStatsVO,
  InteractionTimelineQuery,
  InteractionTimelineVO,
  OpportunityVO,
  RelationAnalysisVO,
  UpdateGraphEdgeDTO,
  UpdateGraphNodeDTO,
} from './types'

/** 模拟网络延迟 */
const delay = (ms = 240) => new Promise<void>(r => setTimeout(r, ms))

const stamp = () => new Date().toISOString()

/** 让同一客户每次取到的数组互不影响 */
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

// ────────────────────────────────────────────────
// 客户 / 联系人 / 商机 / 合同
// ────────────────────────────────────────────────

export const customerApi = {
  /** 排行榜分页（图谱面板选客户用） */
  async ranking(params: {
    page: number
    pageSize: number
  }): Promise<PageResult<CustomerVO>> {
    await delay()
    const start = (params.page - 1) * params.pageSize
    return {
      list: clone(customers.slice(start, start + params.pageSize)),
      total: customers.length,
      page: params.page,
      pageSize: params.pageSize,
    }
  },

  /** 客户合同列表（健康度统计用） */
  async contracts(customerId: string): Promise<ContractVO[]> {
    await delay()
    return clone(contractsByCustomer[customerId] ?? [])
  },

  /** 客户下拉 */
  async options(): Promise<Array<{ id: string; name: string }>> {
    await delay()
    return customers.map(c => ({ id: c.id, name: c.name }))
  },

  /** 客户价值趋势（签名与原 API 一致：起止日期仅作占位） */
  async valueTrends(
    customerId: string,
    _startDate?: string,
    _endDate?: string
  ) {
    await delay()
    const c = customers.find(x => x.id === customerId)
    return buildValueTrends(c ?? customers[0])
  },
}

export const contactApi = {
  /** 某客户下的联系人列表 */
  async listByCustomer(customerId: string): Promise<ContactVO[]> {
    await delay()
    return clone(contactsByCustomer[customerId] ?? [])
  },
}

export const opportunityApi = {
  /** 分页列表（按客户过滤） */
  async list(params: {
    customerId?: string
    page: number
    pageSize: number
  }): Promise<PageResult<OpportunityVO>> {
    await delay()
    const all = params.customerId
      ? (opportunitiesByCustomer[params.customerId] ?? [])
      : customers.flatMap(c => opportunitiesByCustomer[c.id] ?? [])
    const start = (params.page - 1) * params.pageSize
    return {
      list: clone(all.slice(start, start + params.pageSize)),
      total: all.length,
      page: params.page,
      pageSize: params.pageSize,
    }
  },

  /** 阶段计数（健康度统计用） */
  async stageCount(params?: {
    customerId?: string
  }): Promise<Record<string, number>> {
    await delay()
    const all = params?.customerId
      ? (opportunitiesByCustomer[params.customerId] ?? [])
      : customers.flatMap(c => opportunitiesByCustomer[c.id] ?? [])
    const counts: Record<string, number> = {}
    for (const o of all) counts[o.stage] = (counts[o.stage] ?? 0) + 1
    return counts
  },
}

// ────────────────────────────────────────────────
// 互动
// ────────────────────────────────────────────────

export const interactionApi = {
  /** 顶部类型统计（可按客户筛选） */
  async stats(customerId?: string): Promise<InteractionStatsVO> {
    await delay()
    const scoped = customerId
      ? interactions.filter(i => i.customerId === customerId)
      : interactions
    const stats = {} as InteractionStatsVO
    for (const i of scoped) stats[i.type] = (stats[i.type] ?? 0) + 1
    return stats
  },

  /**
   * 时间轴事件列表：按 eventTime 倒序 + 游标分页。
   * 游标即已取到的条数（offset），支持按客户 / 时间范围过滤。
   */
  async timeline(params: InteractionTimelineQuery): Promise<{
    list: InteractionTimelineVO[]
    hasMore: boolean
    nextCursor: string | null
  }> {
    await delay()
    let scoped = interactions
    if (params.customerId) {
      scoped = scoped.filter(i => i.customerId === params.customerId)
    }
    if (params.eventTimeFrom) {
      scoped = scoped.filter(i => i.eventTime >= params.eventTimeFrom!)
    }
    if (params.eventTimeTo) {
      scoped = scoped.filter(i => i.eventTime <= params.eventTimeTo!)
    }
    const offset = params.cursor ? parseInt(params.cursor, 10) || 0 : 0
    const limit = params.limit ?? 20
    const page = scoped.slice(offset, offset + limit)
    const hasMore = offset + limit < scoped.length
    return {
      list: clone(page),
      hasMore,
      nextCursor: hasMore ? String(offset + limit) : null,
    }
  },
}

// ────────────────────────────────────────────────
// 客户关系图谱（内存 CRUD，交互可回写）
// ────────────────────────────────────────────────

let nodeSeq = graphsByCustomer
  ? Object.values(graphsByCustomer).reduce(
      (max, g) =>
        Math.max(
          max,
          ...g.nodes.map(n => parseInt(n.id.replace('node-', ''), 10) || 0)
        ),
      0
    )
  : 0
let edgeSeq = graphsByCustomer
  ? Object.values(graphsByCustomer).reduce(
      (max, g) =>
        Math.max(
          max,
          ...g.edges.map(e => parseInt(e.id.replace('edge-', ''), 10) || 0)
        ),
      0
    )
  : 0

const nextNodeId = () => `node-${++nodeSeq}`
const nextEdgeId = () => `edge-${++edgeSeq}`

export const graphApi = {
  /** 获取客户关系图谱（节点 + 边） */
  async getGraph(customerId: string): Promise<GraphDataVO> {
    await delay()
    const g = graphsByCustomer[customerId]
    if (g) return clone(g)
    // 未预置的客户现场生成一份
    const c = customers.find(x => x.id === customerId) ?? customers[0]
    const built = buildGraph(c)
    graphsByCustomer[customerId] = built
    return clone(built)
  },

  /** 添加图谱节点，返回生成的节点（含 id） */
  async createNode(
    customerId: string,
    data: CreateGraphNodeDTO
  ): Promise<GraphNodeVO> {
    await delay()
    const node: GraphNodeVO = {
      id: nextNodeId(),
      kind: data.kind,
      name: data.name,
      position: data.position ?? null,
      company: data.company ?? null,
      avatar: data.avatar ?? null,
      tags: data.tags ?? [],
      isCenter: false,
      sourceId: data.sourceId ?? null,
      x: data.x ?? 0,
      y: data.y ?? 0,
      updatedAt: stamp(),
    }
    graphsByCustomer[customerId].nodes.push(node)
    graphsByCustomer[customerId].updatedAt = node.updatedAt
    return clone(node)
  },

  /** 编辑图谱节点 */
  async updateNode(id: string, data: UpdateGraphNodeDTO): Promise<GraphNodeVO> {
    await delay()
    for (const g of Object.values(graphsByCustomer)) {
      const node = g.nodes.find(n => n.id === id)
      if (node) {
        Object.assign(node, data, { updatedAt: stamp() })
        g.updatedAt = node.updatedAt
        return clone(node)
      }
    }
    throw new Error('节点不存在')
  },

  /** 删除图谱节点（沿出边递归清理下级节点与相关边） */
  async deleteNode(id: string): Promise<DeleteNodeResultVO> {
    await delay()
    const deletedNodeIds: string[] = []
    const deletedEdgeIds: string[] = []
    for (const g of Object.values(graphsByCustomer)) {
      if (!g.nodes.some(n => n.id === id)) continue
      // 以该节点为起点的边（出边）所指向的节点一并删除
      const outbound = g.edges.filter(e => e.source === id)
      const cascadeIds = outbound.map(e => e.target)
      g.edges = g.edges.filter(
        e =>
          e.source !== id && e.target !== id && !cascadeIds.includes(e.source)
      )
      g.nodes = g.nodes.filter(n => n.id !== id && !cascadeIds.includes(n.id))
      deletedNodeIds.push(id, ...cascadeIds)
    }
    const updatedAt = stamp()
    return { deletedNodeIds, deletedEdgeIds, updatedAt }
  },

  /** 添加图谱关系（边） */
  async createEdge(
    customerId: string,
    data: CreateGraphEdgeDTO
  ): Promise<GraphEdgeVO> {
    await delay()
    const edge: GraphEdgeVO = {
      id: nextEdgeId(),
      source: data.source,
      target: data.target,
      relationType: data.relationType,
      influence: data.influence ?? 3,
      lastContactTime: null,
      updatedAt: stamp(),
    }
    graphsByCustomer[customerId].edges.push(edge)
    graphsByCustomer[customerId].updatedAt = edge.updatedAt
    return clone(edge)
  },

  /** 编辑图谱关系（边） */
  async updateEdge(id: string, data: UpdateGraphEdgeDTO): Promise<GraphEdgeVO> {
    await delay()
    for (const g of Object.values(graphsByCustomer)) {
      const edge = g.edges.find(e => e.id === id)
      if (edge) {
        Object.assign(edge, data, { updatedAt: stamp() })
        g.updatedAt = edge.updatedAt
        return clone(edge)
      }
    }
    throw new Error('关系不存在')
  },

  /** 删除图谱关系（边） */
  async deleteEdge(id: string): Promise<DeleteGraphEdgeResultVO> {
    await delay()
    for (const g of Object.values(graphsByCustomer)) {
      const idx = g.edges.findIndex(e => e.id === id)
      if (idx >= 0) {
        g.edges.splice(idx, 1)
        g.updatedAt = stamp()
        return { id, updatedAt: g.updatedAt }
      }
    }
    throw new Error('关系不存在')
  },
}

// ────────────────────────────────────────────────
// AI 分析缓存与流式模拟
// ────────────────────────────────────────────────

export const analysisResultApi = {
  /** mock 场景不返回缓存：每次选中客户都播放模拟流，观感更完整 */
  async get<T = unknown>(
    _customerId: string,
    _type: CachedAnalysisType
  ): Promise<CachedAnalysisVO<T> | null> {
    await delay(120)
    return null
  },
}

/** 把文本切成小块逐段推送（模拟 LLM 增量输出） */
function chunkText(text: string, size = 12): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

interface SimulateOptions<T> {
  /** 管线步骤（step 事件） */
  steps: Array<{ title: string; body: string }>
  /** 思考过程文本（thinking 事件） */
  thinking: string
  /** 结果 markdown（result 事件，逐块推送） */
  result: string
  /** 最终数据（data 事件） */
  data: T
}

/**
 * 模拟一次 SSE 分析：step -> thinking -> result -> data -> onDone。
 * 返回 AbortController；abort 后停止推送且不触发 onDone / onError。
 */
function simulateAnalysisStream<T>(
  opts: SimulateOptions<T>,
  onEvent: (ev: AnalysisEvent<T>) => void,
  onDone: () => void,
  onError?: (msg: string) => void
): AbortController {
  const controller = new AbortController()
  const timers: ReturnType<typeof setTimeout>[] = []
  let at = 200

  const schedule = (fn: () => void, gap: number) => {
    at += gap
    timers.push(setTimeout(fn, at))
  }

  let cancelled = false
  controller.signal.addEventListener('abort', () => {
    cancelled = true
    timers.forEach(clearTimeout)
  })

  opts.steps.forEach(s => {
    schedule(() => {
      if (!cancelled) onEvent({ type: 'step', title: s.title, body: s.body })
    }, 500)
  })

  chunkText(opts.thinking, 24).forEach(delta => {
    schedule(() => {
      if (!cancelled) onEvent({ type: 'thinking', delta })
    }, 60)
  })

  chunkText(opts.result, 16).forEach(delta => {
    schedule(() => {
      if (!cancelled) onEvent({ type: 'result', delta })
    }, 60)
  })

  schedule(() => {
    if (cancelled) return
    onEvent({ type: 'data', data: opts.data })
    onDone()
  }, 400)

  // onError 保留参数以对齐真实 API 签名；mock 流不产生错误
  void onError

  return controller
}

/** AI 关系分析（模拟流式） */
export function relationAnalysisStream(
  customerId: string,
  onEvent: (ev: AnalysisEvent<RelationAnalysisVO>) => void,
  onDone: () => void,
  onError?: (msg: string) => void
): AbortController {
  const customer = customers.find(c => c.id === customerId) ?? customers[0]
  return simulateAnalysisStream(
    {
      steps: [
        { title: '读取图谱数据', body: `加载 ${customer.name} 的节点与关系边` },
        { title: '计算影响力', body: '按关系边影响力与互动频次综合评分' },
      ],
      thinking: `正在梳理${customer.name}的关系网络，识别关键决策人与影响力分布……`,
      result: buildRelationMarkdown(customer),
      data: buildRelationAnalysis(customer),
    },
    onEvent,
    onDone,
    onError
  )
}

/** AI 客户洞察（模拟流式） */
export function customerInsightStream(
  customerId: string,
  onEvent: (ev: AnalysisEvent<CustomerInsightVO>) => void,
  onDone: () => void,
  onError?: (msg: string) => void
): AbortController {
  const customer = customers.find(c => c.id === customerId) ?? customers[0]
  return simulateAnalysisStream(
    {
      steps: [
        { title: '聚合客户数据', body: '合同、商机、互动记录汇总' },
        { title: '生成洞察', body: '健康度 / 风险 / 画像 / 下一步建议' },
      ],
      thinking: `正在结合合同回款、互动频次与商机阶段评估${customer.name}的整体状态……`,
      result: buildInsightMarkdown(customer),
      data: buildCustomerInsight(customer),
    },
    onEvent,
    onDone,
    onError
  )
}

/** AI 智能总结（模拟流式） */
export function customerSummaryStream(
  customerId: string,
  onEvent: (ev: AnalysisEvent<CustomerSummaryVO>) => void,
  onDone: () => void,
  onError?: (msg: string) => void
): AbortController {
  const customer = customers.find(c => c.id === customerId) ?? customers[0]
  return simulateAnalysisStream(
    {
      steps: [{ title: '汇总近期互动', body: '梳理近 40 天的沟通与推进记录' }],
      thinking: `正在总结${customer.name}近期沟通要点与后续计划……`,
      result: buildSummaryMarkdown(customer),
      data: buildCustomerSummary(customer),
    },
    onEvent,
    onDone,
    onError
  )
}

/** AI 构建图谱（模拟流式）：increment 追加节点，rebuild 重建整图 */
export function aiBuildStream(
  customerId: string,
  mode: 'increment' | 'rebuild',
  onEvent: (ev: AiBuildEvent) => void,
  onDone: () => void,
  onError?: (msg: string) => void
): AbortController {
  const controller = new AbortController()
  const timers: ReturnType<typeof setTimeout>[] = []
  let cancelled = false
  controller.signal.addEventListener('abort', () => {
    cancelled = true
    timers.forEach(clearTimeout)
  })

  const customer = customers.find(c => c.id === customerId) ?? customers[0]
  let at = 200
  const schedule = (fn: () => void, gap: number) => {
    at += gap
    timers.push(setTimeout(fn, at))
  }

  // 管线步骤
  ;[
    {
      title: '收集客户资料',
      body: `读取 ${customer.name} 的档案、互动与合同记录`,
    },
    { title: '抽取实体', body: '识别联系人、合作方与竞争关系' },
    {
      title: mode === 'rebuild' ? '重建图谱' : '增量合并',
      body: '合并去重并生成关系边',
    },
  ].forEach(s => {
    schedule(() => {
      if (!cancelled) onEvent({ type: 'step', title: s.title, body: s.body })
    }, 600)
  })

  // 思考过程
  chunkText(
    `正在从近期互动记录中抽取${customer.name}的新联系人与合作实体……`,
    24
  ).forEach(delta =>
    schedule(() => !cancelled && onEvent({ type: 'thinking', delta }), 60)
  )

  // 结果文本
  const resultText =
    mode === 'rebuild'
      ? `已重建 ${customer.name} 图谱：识别出联系人、合作方、竞对与供应商节点并建立关系边。`
      : `已在 ${customer.name} 图谱中追加 1 个实体节点与 1 条关系边。`
  chunkText(resultText, 16).forEach(delta =>
    schedule(() => !cancelled && onEvent({ type: 'result', delta }), 60)
  )

  // 落地数据
  schedule(() => {
    if (cancelled) return
    const g = graphsByCustomer[customerId]
    if (mode === 'rebuild') {
      const rebuilt = buildGraph(customer)
      graphsByCustomer[customerId] = rebuilt
      onEvent({ type: 'data', data: clone(rebuilt) })
    } else {
      const center = g.nodes.find(n => n.isCenter) ?? g.nodes[0]
      const node: GraphNodeVO = {
        id: nextNodeId(),
        kind: 'partner',
        name: `${customer.name}·新生态伙伴`,
        position: null,
        company: '生态合作方',
        avatar: null,
        tags: ['渠道'],
        isCenter: false,
        sourceId: null,
        x: Math.round((Math.random() - 0.5) * 400),
        y: Math.round((Math.random() - 0.5) * 400),
        updatedAt: stamp(),
      }
      const edge: GraphEdgeVO = {
        id: nextEdgeId(),
        source: center.id,
        target: node.id,
        relationType: 'cooperation',
        influence: 3,
        lastContactTime: null,
        updatedAt: stamp(),
      }
      g.nodes.push(node)
      g.edges.push(edge)
      g.updatedAt = edge.updatedAt
      onEvent({ type: 'data', data: clone(g) })
    }
    onDone()
  }, 500)

  // onError 保留参数以对齐真实 API 签名；mock 流不产生错误
  void onError

  return controller
}
