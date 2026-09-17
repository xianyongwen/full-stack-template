/**
 * Dashboard mock 面板所需的类型定义。
 *
 * 本文件随 mock 数据层一同使用：Dashboard 各面板的数据源为前端模拟，
 * 不再依赖后端 CRM API；这里保留了面板渲染所需的 VO 形状（与原
 * 后端契约保持一致，便于将来接入真实接口时无缝替换）。
 */

// ────────────────────────────────────────────────
// 客户
// ────────────────────────────────────────────────

/** 客户列表项 VO */
export interface CustomerVO {
  id: string
  name: string
  industry: string | null
  scale: string | null
  owner: { id: string; nickname: string | null } | null
  contacts: { id: string; name: string }[]
  contactCount: number
  opportunityCount: number
  contractAmount: number
  status: string | null
  address: string | null
  createTime: string
}

/** 客户价值趋势 VO（合同金额/数量/成交率按月） */
export interface CustomerValueTrendsData {
  /** 连续月份 YYYY-MM（含两端） */
  months: string[]
  /** 合同金额（元）按月 */
  amounts: number[]
  /** 合同数量按月 */
  counts: number[]
  /** 成交率 0-1 按月（截至当月末累积，无结案商机为 null） */
  closeRates: (number | null)[]
}

// ────────────────────────────────────────────────
// 商机
// ────────────────────────────────────────────────

/** 商机阶段枚举 */
export type OpportunityStage =
  | 'INITIAL_CONTACT'
  | 'NEED_CONFIRM'
  | 'POC'
  | 'QUOTATION'
  | 'NEGOTIATION'
  | 'CONTRACT_REVIEW'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'

/** 商机阶段展示元信息 */
export const OPPORTUNITY_STAGES: {
  value: OpportunityStage
  label: string
  color: string
  defaultProbability: number
}[] = [
  {
    value: 'INITIAL_CONTACT',
    label: '初步接触',
    color: 'gray',
    defaultProbability: 10,
  },
  {
    value: 'NEED_CONFIRM',
    label: '需求确认',
    color: 'blue',
    defaultProbability: 25,
  },
  { value: 'POC', label: 'POC', color: 'purple', defaultProbability: 40 },
  {
    value: 'QUOTATION',
    label: '报价',
    color: 'orange',
    defaultProbability: 60,
  },
  {
    value: 'NEGOTIATION',
    label: '商务谈判',
    color: 'cyan',
    defaultProbability: 75,
  },
  {
    value: 'CONTRACT_REVIEW',
    label: '合同审批',
    color: 'geekblue',
    defaultProbability: 90,
  },
  {
    value: 'CLOSED_WON',
    label: '成交',
    color: 'green',
    defaultProbability: 100,
  },
  { value: 'CLOSED_LOST', label: '丢单', color: 'red', defaultProbability: 0 },
]

/** 商机 VO */
export interface OpportunityVO {
  id: string
  name: string
  customer: { id: string; name: string } | null
  stage: OpportunityStage
  amount: number
  probability: number
  owner: {
    id: string
    username: string
    nickname: string | null
  } | null
  predictDate: string | null
  contractCount: number
  createTime: string
}

// ────────────────────────────────────────────────
// 事件互动
// ────────────────────────────────────────────────

/** 互动类型 */
export type InteractionType =
  | 'CALL'
  | 'CHAT'
  | 'EMAIL'
  | 'VISIT'
  | 'MEETING'
  | 'QUOTE'
  | 'CONTRACT'
  | 'REMARK'
  | 'TASK'

/** 互动类型元信息 */
export const INTERACTION_TYPES: {
  value: InteractionType
  label: string
  color: string
  icon: string
}[] = [
  { value: 'CALL', label: '电话', color: '#1677ff', icon: 'PhoneOutlined' },
  { value: 'CHAT', label: '微信', color: '#52c41a', icon: 'MessageOutlined' },
  { value: 'EMAIL', label: '邮件', color: '#faad14', icon: 'MailOutlined' },
  { value: 'VISIT', label: '拜访', color: '#a0d911', icon: 'CarOutlined' },
  {
    value: 'MEETING',
    label: '会议',
    color: '#722ed1',
    icon: 'VideoCameraOutlined',
  },
  { value: 'QUOTE', label: '报价', color: '#fa8c16', icon: 'DollarOutlined' },
  {
    value: 'CONTRACT',
    label: '合同',
    color: '#13c2c2',
    icon: 'FileTextOutlined',
  },
  { value: 'REMARK', label: '备注', color: '#8c8c8c', icon: 'EditOutlined' },
  {
    value: 'TASK',
    label: '任务',
    color: '#eb2f96',
    icon: 'CheckSquareOutlined',
  },
]

/** 互动状态 */
export type InteractionStatus = 'PENDING' | 'DONE' | 'TRANSCRIBED'

/** 互动时间轴 VO */
export interface InteractionTimelineVO {
  id: string
  customerId: string
  contactId: string | null
  type: InteractionType
  title: string
  content: string | null
  summary: string | null
  ownerId: string | null
  operatorId: string | null
  eventTime: string
  duration: number | null
  dueDate: string | null
  amount: number | null
  participants: Array<{ name: string; role?: string; userId?: string }> | null
  attachments: Array<{ fileId: string; name: string; type?: string }> | null
  opportunityId: string | null
  status: InteractionStatus | null
  customer: { id: string; name: string } | null
  contact: { id: string; name: string; position?: string | null } | null
  owner: { id: string; nickname: string | null } | null
  operator: { id: string; nickname: string | null } | null
}

/** 互动统计 VO */
export type InteractionStatsVO = Record<InteractionType, number>

/** 互动时间轴查询参数 */
export interface InteractionTimelineQuery extends Record<string, unknown> {
  customerId?: string
  type?: InteractionType
  cursor?: string
  limit?: number
  /** 事件时间范围（含端点，ISO 字符串），用于热力图按月取数 */
  eventTimeFrom?: string
  eventTimeTo?: string
}

// ────────────────────────────────────────────────
// 联系人
// ────────────────────────────────────────────────

/** 联系人 VO */
export interface ContactVO {
  id: string
  customerId: string
  customer?: { id: string; name: string }
  name: string
  gender: string | null
  position: string | null
  phone: string | null
  email: string | null
  tags: string[]
  status: string
  lastContactTime: string | null
  createTime: string
}

// ────────────────────────────────────────────────
// 客户关系图谱
// ────────────────────────────────────────────────

export type GraphNodeKind =
  'customer' | 'contact' | 'partner' | 'competitor' | 'supplier' | 'internal'

/** 图谱节点 VO（结构兼容组件内 GraphNodeData） */
export interface GraphNodeVO {
  id: string
  kind: GraphNodeKind
  name: string
  position: string | null
  company: string | null
  avatar: string | null
  tags: string[]
  isCenter: boolean
  /** 引用实体 id：contact 为联系人 id、internal 为系统用户 id；自由节点为 null */
  sourceId: string | null
  x: number
  y: number
  /** 记录最近更新时间 */
  updatedAt: string
}

/** 新建节点 DTO（customer 节点由系统维护，不在此列） */
export interface CreateGraphNodeDTO {
  kind: Exclude<GraphNodeKind, 'customer'>
  name: string
  position?: string
  company?: string
  avatar?: string
  tags?: string[]
  sourceId?: string
  x?: number
  y?: number
}

/** 编辑节点 DTO（仅展示字段与坐标可改） */
export interface UpdateGraphNodeDTO {
  name?: string
  position?: string
  company?: string
  avatar?: string
  tags?: string[]
  x?: number
  y?: number
}

/** 新建关系（边）DTO */
export interface CreateGraphEdgeDTO {
  source: string
  target: string
  /** 关系类型，对应 RELATION_TYPES 的 value */
  relationType: string
  /** 影响力 1-5 */
  influence?: number
  description?: string
}

/** 编辑关系（边）DTO（仅关系属性可改；两端节点不可变更） */
export interface UpdateGraphEdgeDTO {
  relationType?: string
  influence?: number
  description?: string
}

/** 图谱边 VO（结构兼容组件内 GraphEdgeData） */
export interface GraphEdgeVO {
  id: string
  source: string
  target: string
  /** 关系类型，对应 RELATION_TYPES 的 value */
  relationType: string | null
  /** 影响力 1-5 */
  influence: number
  lastContactTime: string | null
  /** 记录最近更新时间 */
  updatedAt: string
}

/** 客户关系图谱（节点 + 边） */
export interface GraphDataVO {
  nodes: GraphNodeVO[]
  edges: GraphEdgeVO[]
  /** 图谱最近更新时间（节点与边 updateTime 的最大值 ISO 字符串；空图谱为 null） */
  updatedAt: string | null
}

/** 删除节点结果：被删除的节点 id 与涉及的关系 id */
export interface DeleteNodeResultVO {
  deletedNodeIds: string[]
  deletedEdgeIds: string[]
  /** 本次删除时间 */
  updatedAt: string
}

/** 删除关系（边）结果 */
export interface DeleteGraphEdgeResultVO {
  id: string
  /** 本次删除时间 */
  updatedAt: string
}

// ────────────────────────────────────────────────
// AI 关系分析
// ────────────────────────────────────────────────

/** 影响力排行项 */
export interface RelationRankingItem {
  contactId: string
  name: string
  position: string | null
  /** 图谱边影响力 1-5 */
  influence: number
  /** 关系类型（角色） */
  relationType: string | null
  /** 综合影响力评分 0-100 */
  score: number
  /** 评分依据 */
  reasons: string[]
}

/** 关键决策人 */
export interface RelationDecisionMaker {
  name: string
  position: string | null
  reason: string
}

/** 关系网络统计 */
export interface RelationNetworkStats {
  nodeCount: number
  contactCount: number
  edgeCount: number
  /** 网络密度 0-1 */
  density: number
  /** 辐射边平均影响力 1-5 */
  avgInfluence: number
}

/** 关系强度项 */
export interface RelationStrengthItem {
  /** 联系人 id（与图谱 contact 节点 sourceId 一致；旧缓存可能缺失） */
  contactId?: string
  name: string
  position: string | null
  /** 关系强度 0-100 */
  strength: number
  /** 强度因子描述 */
  factors: string[]
}

/** AI 关系分析结果 VO */
export interface RelationAnalysisVO {
  /** 总体结论 */
  summary: string
  /** 总体结论依据 */
  summaryBasis?: string[]
  influenceRanking: RelationRankingItem[]
  keyDecisionMakers: RelationDecisionMaker[]
  networkStats: RelationNetworkStats
  relationStrength: RelationStrengthItem[]
}

// ────────────────────────────────────────────────
// AI 客户洞察
// ────────────────────────────────────────────────

export type HealthLevel = 'good' | 'warning' | 'danger'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface CustomerInsightHealth {
  level: HealthLevel
  reasons: string[]
}

export interface CustomerInsightRisk {
  level: RiskLevel
  reasons: string[]
}

/** 客户画像 */
export interface CustomerInsightProfile {
  industry?: string
  scale?: string
  techDirection?: string
  purchaseHabit?: string
  budget?: string
  riskPreference?: string
}

export interface CustomerInsightNextAction {
  suggestion: string
  reason: string
}

/** AI 客户洞察结果 VO */
export interface CustomerInsightVO {
  health: CustomerInsightHealth
  risk: CustomerInsightRisk
  profile: CustomerInsightProfile
  /** 客户画像各字段 AI 分析依据（与 profile 字段一一对应） */
  profileBasis?: Partial<Record<keyof CustomerInsightProfile, string[]>>
  nextAction: CustomerInsightNextAction
}

// ────────────────────────────────────────────────
// AI 智能总结
// ────────────────────────────────────────────────

/** AI 智能总结条目（兼容旧缓存：旧数据为字符串，新数据为对象） */
export type CustomerSummaryItem = string | { text: string; basis?: string[] }

/** AI 智能总结结果 VO */
export interface CustomerSummaryVO {
  /** 本次总结 */
  summary: string
  /** 本次总结依据 */
  summaryBasis?: string[]
  /** 客户需求 */
  requirements: CustomerSummaryItem[]
  /** 风险 */
  risks: CustomerSummaryItem[]
  /** 下一步计划 */
  nextSteps: CustomerSummaryItem[]
}

// ────────────────────────────────────────────────
// 合同
// ────────────────────────────────────────────────

export type ContractStatus =
  'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'

/** 回款状态 */
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'

/** 合同 VO */
export interface ContractVO {
  id: string
  contractNo: string
  name: string
  customer: { id: string; name: string } | null
  opportunity: { id: string; name: string } | null
  amount: number
  receivedAmount: number
  paymentStatus: PaymentStatus
  /** 回款进度 0-100 */
  paymentProgress: number
  signDate: string | null
  startDate: string | null
  endDate: string | null
  status: ContractStatus
  owner: { id: string; nickname: string | null; username: string | null } | null
  attachment: string | null
  renewFromId: string | null
  /** 距到期天数（正数=未来，负数=已过期；无到期日为 null） */
  daysToExpire: number | null
  /** 是否即将到期（30 天内且未过期，且状态为生效） */
  expiringSoon: boolean
  createTime: string
}

// ────────────────────────────────────────────────
// AI 分析缓存与流式事件
// ────────────────────────────────────────────────

/** 只读分析类型（用于缓存的 3 类） */
export type CachedAnalysisType =
  'relation_analysis' | 'customer_insight' | 'customer_summary'

/** 缓存命中项：result 形状与对应分析输出一致 */
export interface CachedAnalysisVO<T = unknown> {
  result: T
  generatedAt: string
  expireAt: string
  fromCache: true
}

/** 分析 SSE 事件（与原后端 PipelineEvent 对应；data 为各分析的 VO） */
export type AnalysisEvent<T> =
  | { type: 'step'; title: string; body: string }
  | { type: 'thinking'; delta: string }
  | { type: 'result'; delta: string }
  | { type: 'data'; data: T }
  | { type: 'error'; message: string }

/** 关系分析事件（兼容旧引用） */
export type RelationAnalysisEvent = AnalysisEvent<RelationAnalysisVO>

/** AI 图谱构建 SSE 事件 */
export type AiBuildEvent =
  | { type: 'step'; title: string; body: string }
  | { type: 'thinking'; delta: string }
  | { type: 'result'; delta: string }
  | { type: 'data'; data: GraphDataVO }
  | { type: 'error'; message: string }
