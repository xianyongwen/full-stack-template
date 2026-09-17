/**
 * Dashboard mock 数据集。
 *
 * 数据完全在前端生成，围绕 6 家虚构客户构建图谱 / 互动 / 商机 / 合同 /
 * AI 分析素材，供 mock/api.ts 消费。时间均相对当前时刻生成，保证
 * 热力图（当前月）与时间轴（近几天）始终有数据可看。
 */
import dayjs from 'dayjs'
import type {
  ContactVO,
  ContractVO,
  CustomerInsightVO,
  CustomerSummaryVO,
  CustomerVO,
  GraphDataVO,
  GraphEdgeVO,
  GraphNodeVO,
  InteractionTimelineVO,
  OpportunityStage,
  OpportunityVO,
  RelationAnalysisVO,
} from './types'

const now = () => dayjs()
const iso = (d: dayjs.Dayjs) => d.toISOString()

/** 联系人种子（每客户复用模板，名称不同即可） */
const CONTACT_TEMPLATES = [
  { name: '陈志远', position: 'CTO', gender: '男' },
  { name: '刘颖', position: '采购总监', gender: '女' },
  { name: '王浩', position: '技术负责人', gender: '男' },
  { name: '赵敏', position: 'CEO 助理', gender: '女' },
  { name: '孙立', position: '运维经理', gender: '男' },
]

/** 客户种子 */
const CUSTOMER_SEEDS = [
  {
    name: '星辰智造',
    industry: '智能制造',
    scale: '500-1000人',
    amount: 860000,
  },
  {
    name: '云帆科技',
    industry: '互联网 / SaaS',
    scale: '100-500人',
    amount: 420000,
  },
  { name: '恒信金融', industry: '金融科技', scale: '1000+人', amount: 1250000 },
  { name: '绿联物流', industry: '企业服务', scale: '50-100人', amount: 180000 },
  {
    name: '启明教育',
    industry: '在线教育',
    scale: '100-500人',
    amount: 320000,
  },
  {
    name: '康泰医疗',
    industry: '医疗健康',
    scale: '500-1000人',
    amount: 640000,
  },
]

/** 互动事件模板（type / 标题 / 内容） */
const INTERACTION_TEMPLATES = [
  {
    type: 'CALL' as const,
    title: '电话沟通季度续约',
    content: '客户确认下季度续约意向，需要补充报价单。',
  },
  {
    type: 'MEETING' as const,
    title: '产品演示会议',
    content: '向技术团队演示新版数据看板，反馈积极。',
  },
  {
    type: 'VISIT' as const,
    title: '上门拜访交流',
    content: '拜访客户总部，与采购、技术两组人交流需求。',
  },
  {
    type: 'EMAIL' as const,
    title: '发送方案与报价',
    content: '邮件发送定制化实施阶段方案与报价明细。',
  },
  {
    type: 'CHAT' as const,
    title: '微信跟进部署进度',
    content: '确认 POC 环境部署进度，约下周联调。',
  },
  {
    type: 'QUOTE' as const,
    title: '提交新版报价',
    content: '按客户预算调整报价结构，突出 ROI。',
  },
  {
    type: 'TASK' as const,
    title: '准备合同文本',
    content: '法务评审合同条款，准备盖章文本。',
  },
  {
    type: 'REMARK' as const,
    title: '跟进备忘',
    content: '关键决策人倾向我方方案，注意竞品动作。',
  },
]

/** 商机模板（名称 / 阶段 / 金额） */
const OPPORTUNITY_SEEDS: Array<{
  name: (c: string) => string
  stage: OpportunityStage
  amount: number
  probability: number
}> = [
  {
    name: c => `${c}数据平台二期`,
    stage: 'NEGOTIATION',
    amount: 320000,
    probability: 75,
  },
  {
    name: c => `${c}智能看板采购`,
    stage: 'QUOTATION',
    amount: 180000,
    probability: 60,
  },
  {
    name: c => `${c}年度技术支持`,
    stage: 'CONTRACT_REVIEW',
    amount: 96000,
    probability: 90,
  },
  {
    name: c => `${c}POC 验证项目`,
    stage: 'POC',
    amount: 50000,
    probability: 40,
  },
  {
    name: c => `${c}移动端扩展`,
    stage: 'NEED_CONFIRM',
    amount: 150000,
    probability: 25,
  },
  {
    name: c => `${c}数据平台一期（已成交）`,
    stage: 'CLOSED_WON',
    amount: 420000,
    probability: 100,
  },
]

const OWNERS = [
  { id: 'u-01', username: 'admin', nickname: '管理员' },
  { id: 'u-02', username: 'zhang.san', nickname: '张三' },
  { id: 'u-03', username: 'li.si', nickname: '李四' },
]

/** 伪随机（固定种子，刷新后数据稳定） */
let seed = 42
function rnd() {
  seed = (seed * 9301 + 49297) % 233280
  return seed / 233280
}
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]

// ────────────────────────────────────────────────
// 客户 / 联系人 / 商机 / 合同
// ────────────────────────────────────────────────

export const customers: CustomerVO[] = CUSTOMER_SEEDS.map((s, i) => ({
  id: `cust-${i + 1}`,
  name: s.name,
  industry: s.industry,
  scale: s.scale,
  owner: OWNERS[i % OWNERS.length],
  contacts: [],
  contactCount: 3,
  opportunityCount: 4,
  contractAmount: s.amount,
  status: 'active',
  address: '北京市海淀区',
  createTime: iso(now().subtract(200 + i * 30, 'day')),
}))

export const contactsByCustomer: Record<string, ContactVO[]> = {}
customers.forEach((c, ci) => {
  contactsByCustomer[c.id] = CONTACT_TEMPLATES.slice(0, 3 + (ci % 2)).map(
    (t, i) => ({
      id: `contact-${ci + 1}-${i + 1}`,
      customerId: c.id,
      customer: { id: c.id, name: c.name },
      name: t.name,
      gender: t.gender,
      position: t.position,
      phone: `138${String(10000000 + ci * 100 + i).slice(0, 8)}`,
      email: `${t.name}@example.com`,
      tags: i === 0 ? ['VIP', '技术对接'] : ['重点跟进'],
      status: 'active',
      lastContactTime: iso(now().subtract(1 + rnd() * 10, 'day')),
      createTime: iso(now().subtract(150 - i * 10, 'day')),
    })
  )
  c.contacts = contactsByCustomer[c.id].map(ct => ({
    id: ct.id,
    name: ct.name,
  }))
})

export const opportunitiesByCustomer: Record<string, OpportunityVO[]> = {}
customers.forEach((c, ci) => {
  opportunitiesByCustomer[c.id] = OPPORTUNITY_SEEDS.map((o, i) => ({
    id: `opp-${ci + 1}-${i + 1}`,
    name: o.name(c.name),
    customer: { id: c.id, name: c.name },
    stage: o.stage,
    amount: o.amount,
    probability: o.probability,
    owner: OWNERS[(ci + i) % OWNERS.length],
    predictDate: iso(now().add(10 + i * 15, 'day')),
    contractCount: o.stage === 'CLOSED_WON' ? 1 : 0,
    createTime: iso(now().subtract(90 - i * 12, 'day')),
  }))
})

export const contractsByCustomer: Record<string, ContractVO[]> = {}
customers.forEach((c, ci) => {
  const amount = CUSTOMER_SEEDS[ci].amount
  contractsByCustomer[c.id] = [
    {
      id: `contract-${ci + 1}-1`,
      contractNo: `HT-2026-${1000 + ci}`,
      name: `${c.name}数据平台一期`,
      customer: { id: c.id, name: c.name },
      opportunity: null,
      amount,
      receivedAmount: Math.round(amount * (0.5 + rnd() * 0.5)),
      paymentStatus: 'PARTIAL',
      paymentProgress: Math.round(50 + rnd() * 50),
      signDate: iso(now().subtract(120 - ci * 8, 'day')),
      startDate: iso(now().subtract(110 - ci * 8, 'day')),
      endDate: iso(now().add(240 + ci * 15, 'day')),
      status: 'ACTIVE',
      owner: OWNERS[ci % OWNERS.length],
      attachment: null,
      renewFromId: null,
      daysToExpire: 240 + ci * 15,
      expiringSoon: false,
      createTime: iso(now().subtract(120 - ci * 8, 'day')),
    },
  ]
})

// ────────────────────────────────────────────────
// 互动时间轴（近 40 天滚动生成，保证当月有数据）
// ────────────────────────────────────────────────

function buildInteractions(): InteractionTimelineVO[] {
  const list: InteractionTimelineVO[] = []
  let n = 0
  customers.forEach((c, ci) => {
    const contacts = contactsByCustomer[c.id]
    const opps = opportunitiesByCustomer[c.id]
    for (let i = 0; i < 12; i++) {
      const contact = contacts[i % contacts.length]
      const t =
        INTERACTION_TEMPLATES[(ci * 3 + i) % INTERACTION_TEMPLATES.length]
      const d = now()
        .subtract(Math.floor(rnd() * 40), 'day')
        .hour(9 + Math.floor(rnd() * 9))
        .minute(Math.floor(rnd() * 60))
      list.push({
        id: `itl-${++n}`,
        customerId: c.id,
        contactId: contact.id,
        type: t.type,
        title: t.title,
        content: t.content,
        summary: t.content,
        ownerId: OWNERS[ci % OWNERS.length].id,
        operatorId: null,
        eventTime: iso(d),
        duration:
          t.type === 'CALL' || t.type === 'MEETING'
            ? 15 + Math.floor(rnd() * 45)
            : null,
        dueDate: t.type === 'TASK' ? iso(d.add(3, 'day')) : null,
        amount:
          t.type === 'QUOTE' ? 50000 + Math.floor(rnd() * 20) * 5000 : null,
        participants: null,
        attachments: null,
        opportunityId: rnd() > 0.5 ? opps[i % opps.length].id : null,
        status: 'DONE',
        customer: { id: c.id, name: c.name },
        contact: {
          id: contact.id,
          name: contact.name,
          position: contact.position,
        },
        owner: {
          id: OWNERS[ci % OWNERS.length].id,
          nickname: OWNERS[ci % OWNERS.length].nickname,
        },
        operator: null,
      })
    }
  })
  return list.sort((a, b) => (a.eventTime < b.eventTime ? 1 : -1))
}

export const interactions: InteractionTimelineVO[] = buildInteractions()

// ────────────────────────────────────────────────
// 客户关系图谱
// ────────────────────────────────────────────────

const KIND_TEMPLATES = [
  { kind: 'partner' as const, name: '生态合作方', tags: ['渠道'] },
  { kind: 'competitor' as const, name: '竞对厂商', tags: ['竞品'] },
  { kind: 'supplier' as const, name: '上游供应商', tags: ['供应链'] },
  { kind: 'internal' as const, name: '客户成功', tags: ['我方'] },
]

let nodeSeq = 0
let edgeSeq = 0

/** 生成一份客户图谱（预置数据与 AI 重建模拟共用） */
export function buildGraph(customer: CustomerVO): GraphDataVO {
  const nodes: GraphNodeVO[] = []
  const edges: GraphEdgeVO[] = []
  const stamp = iso(now())
  const cx = 0
  const cy = 0

  nodes.push({
    id: `node-${++nodeSeq}`,
    kind: 'customer',
    name: customer.name,
    position: null,
    company: customer.name,
    avatar: null,
    tags: [customer.industry ?? '客户'],
    isCenter: true,
    sourceId: customer.id,
    x: cx,
    y: cy,
    updatedAt: stamp,
  })
  const centerId = nodes[0].id

  contactsByCustomer[customer.id].forEach((ct, i) => {
    const angle = (i / 4) * Math.PI * 2
    nodes.push({
      id: `node-${++nodeSeq}`,
      kind: 'contact',
      name: ct.name,
      position: ct.position,
      company: customer.name,
      avatar: null,
      tags: ct.tags,
      isCenter: false,
      sourceId: ct.id,
      x: Math.round(Math.cos(angle) * 160),
      y: Math.round(Math.sin(angle) * 160),
      updatedAt: stamp,
    })
    edges.push({
      id: `edge-${++edgeSeq}`,
      source: centerId,
      target: nodes[nodes.length - 1].id,
      relationType: pick(['decision', 'influence', 'champion', 'blocker']),
      influence: 2 + Math.floor(rnd() * 4),
      lastContactTime: ct.lastContactTime,
      updatedAt: stamp,
    })
  })

  KIND_TEMPLATES.forEach((t, i) => {
    const angle = ((i + 2) / 6) * Math.PI * 2
    nodes.push({
      id: `node-${++nodeSeq}`,
      kind: t.kind,
      name: `${customer.name}·${t.name}`,
      position: null,
      company: t.name,
      avatar: null,
      tags: t.tags,
      isCenter: false,
      sourceId: null,
      x: Math.round(Math.cos(angle) * 260),
      y: Math.round(Math.sin(angle) * 260),
      updatedAt: stamp,
    })
    edges.push({
      id: `edge-${++edgeSeq}`,
      source: centerId,
      target: nodes[nodes.length - 1].id,
      relationType: t.kind === 'competitor' ? 'competition' : 'cooperation',
      influence: 1 + Math.floor(rnd() * 3),
      lastContactTime: null,
      updatedAt: stamp,
    })
  })

  return { nodes, edges, updatedAt: stamp }
}

export const graphsByCustomer: Record<string, GraphDataVO> = {}
customers.forEach(c => {
  graphsByCustomer[c.id] = buildGraph(c)
})

// ────────────────────────────────────────────────
// AI 分析素材（由图谱推导，逐客户有差异）
// ────────────────────────────────────────────────

export function buildRelationAnalysis(
  customer: CustomerVO
): RelationAnalysisVO {
  const g = graphsByCustomer[customer.id]
  const contactNodes = g.nodes.filter(n => n.kind === 'contact')
  const ranking = contactNodes
    .map((n, i) => {
      const edge = g.edges.find(e => e.target === n.id)
      const influence = edge?.influence ?? 1
      return {
        contactId: n.sourceId ?? n.id,
        name: n.name,
        position: n.position,
        influence,
        relationType: edge?.relationType ?? null,
        score: Math.min(100, influence * 18 + (contactNodes.length - i) * 2),
        reasons: [
          `与${customer.name}存在直接关系边（影响力 ${influence}/5）`,
          n.position
            ? `担任${n.position}，对采购决策有直接影响`
            : '深度参与项目沟通',
        ],
      }
    })
    .sort((a, b) => b.score - a.score)

  return {
    summary: `${customer.name}的关系网络以技术线为核心，${ranking[0]?.name ?? '关键联系人'}影响力最高；建议围绕其关注点推进商务节奏。`,
    summaryBasis: [
      `图谱共 ${g.nodes.length} 个节点、${g.edges.length} 条关系边`,
      '高影响力联系人集中在技术侧',
    ],
    influenceRanking: ranking,
    keyDecisionMakers: ranking.slice(0, 2).map(r => ({
      name: r.name,
      position: r.position,
      reason: r.reasons[1] ?? '在预算与选型中有较高话语权',
    })),
    networkStats: {
      nodeCount: g.nodes.length,
      contactCount: contactNodes.length,
      edgeCount: g.edges.length,
      density: Math.min(1, g.edges.length / Math.max(1, g.nodes.length * 2)),
      avgInfluence:
        Math.round(
          (g.edges.reduce((s, e) => s + e.influence, 0) /
            Math.max(1, g.edges.length)) *
            10
        ) / 10,
    },
    relationStrength: ranking.map(r => ({
      contactId: r.contactId,
      name: r.name,
      position: r.position,
      strength: r.score,
      factors: ['互动频次', '影响力评分', '最近接触时间'],
    })),
  }
}

export function buildCustomerInsight(customer: CustomerVO): CustomerInsightVO {
  const contracts = contractsByCustomer[customer.id]
  const received = contracts.reduce((s, c) => s + c.receivedAmount, 0)
  const total = contracts.reduce((s, c) => s + c.amount, 0)
  const ratio = total > 0 ? received / total : 0
  return {
    health: {
      level: ratio > 0.7 ? 'good' : ratio > 0.4 ? 'warning' : 'danger',
      reasons: [
        `合同回款进度 ${Math.round(ratio * 100)}%`,
        '近 30 天互动保持稳定',
      ],
    },
    risk: {
      level: ratio > 0.7 ? 'low' : 'medium',
      reasons:
        ratio > 0.7
          ? ['暂无明显流失信号']
          : ['回款进度偏慢，需关注预算审批节奏', '竞品近期在客户侧活动频繁'],
    },
    profile: {
      industry: customer.industry ?? '未判断',
      scale: customer.scale ?? '未判断',
      techDirection: '数据平台与智能看板方向',
      purchaseHabit: '倾向分期实施、按季度评估',
      budget: `${(total / 10000).toFixed(0)} 万/年`,
      riskPreference: '稳健型',
    },
    profileBasis: {
      industry: ['客户资料与历史合同行业分类'],
      scale: ['联系人规模与企业信息推断'],
    },
    nextAction: {
      suggestion: '推动合同续约谈判，同步释放二期需求',
      reason: '现有合同回款过半且互动活跃，续约窗口已打开',
    },
  }
}

export function buildCustomerSummary(customer: CustomerVO): CustomerSummaryVO {
  return {
    summary: `${customer.name}本阶段以平台续约与二期扩容为主线，整体合作氛围积极。`,
    summaryBasis: ['近 40 天互动记录', '商机与合同进展'],
    requirements: [
      { text: '数据看板性能优化与私有化部署支持', basis: ['产品演示会议反馈'] },
      '希望提供行业标杆案例参考',
    ],
    risks: [
      { text: '预算审批流程较长，可能影响签约节奏', basis: ['商务谈判记录'] },
    ],
    nextSteps: ['两周内提交续约报价与实施计划', '安排技术团队联调 POC 环境'],
  }
}

/** AI 流式输出的 markdown（result 阶段逐字推送） */
export function buildInsightMarkdown(customer: CustomerVO): string {
  const ins = buildCustomerInsight(customer)
  return [
    `### ${customer.name} · 客户洞察`,
    '',
    `**健康度**：${ins.health.level === 'good' ? '良好' : ins.health.level === 'warning' ? '关注' : '预警'}`,
    ins.health.reasons.map(r => `- ${r}`).join('\n'),
    '',
    '**画像**：',
    Object.entries(ins.profile)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n'),
    '',
    `**下一步**：${ins.nextAction.suggestion}`,
  ].join('\n')
}

export function buildSummaryMarkdown(customer: CustomerVO): string {
  const s = buildCustomerSummary(customer)
  return [
    `### ${customer.name} · 智能总结`,
    '',
    s.summary,
    '',
    '**客户需求**',
    s.requirements
      .map(r => `- ${typeof r === 'string' ? r : r.text}`)
      .join('\n'),
    '',
    '**风险**',
    s.risks.map(r => `- ${typeof r === 'string' ? r : r.text}`).join('\n'),
    '',
    '**下一步计划**',
    s.nextSteps.map(r => `- ${r}`).join('\n'),
  ].join('\n')
}

export function buildRelationMarkdown(customer: CustomerVO): string {
  const ra = buildRelationAnalysis(customer)
  return [
    `### ${customer.name} · 关系分析`,
    '',
    ra.summary,
    '',
    '**影响力排行**',
    ra.influenceRanking
      .map(
        (r, i) => `${i + 1}. ${r.name}（${r.position ?? '-'}）· 评分 ${r.score}`
      )
      .join('\n'),
    '',
    `**网络密度** ${ra.networkStats.density} · **平均影响力** ${ra.networkStats.avgInfluence}`,
  ].join('\n')
}

/** 客户价值趋势（近 12 个月合成） */
export function buildValueTrends(customer: CustomerVO) {
  const months: string[] = []
  const amounts: number[] = []
  const counts: number[] = []
  const closeRates: (number | null)[] = []
  for (let i = 11; i >= 0; i--) {
    months.push(now().subtract(i, 'month').format('YYYY-MM'))
    amounts.push(
      Math.round((customer.contractAmount / 12) * (0.6 + rnd() * 0.8))
    )
    counts.push(1 + Math.floor(rnd() * 3))
    closeRates.push(Math.round(rnd() * 100) / 100)
  }
  return { months, amounts, counts, closeRates }
}
