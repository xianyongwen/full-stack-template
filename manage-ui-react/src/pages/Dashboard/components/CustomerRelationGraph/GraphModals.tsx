import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Button, Form, Input, Modal, Rate, Select } from 'antd'
import {
  ArrowRightOutlined,
  BankOutlined,
  CompassOutlined,
  ShopOutlined,
  StarOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { contactApi } from '../../mock/api'
import { userApi } from '@/api/system'

// ── 共享类型 ──────────────────────────────
export type NodeKind =
  | 'customer'
  | 'contact'
  | 'partner'
  | 'competitor'
  | 'supplier'
  | 'internal'

export interface GraphNodeData {
  id: string
  kind: NodeKind
  name: string
  position?: string
  company?: string
  avatar?: string
  tags?: string[]
  isCenter?: boolean
  /** 数据来源的原始 id（联系人/系统用户），用于回查 */
  sourceId?: string
  /** 节点在画布上的坐标（由图谱侧维护，拖拽后同步回写） */
  x?: number
  y?: number
}

export interface GraphEdgeData {
  id: string
  source: string
  target: string
  relationType: string | null
  influence: number
  lastContactTime?: string
}

// ── 共享常量 ──────────────────────────────
export const NODE_KIND_META: Record<
  NodeKind,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  customer: { label: '客户', color: '#1d4ed8', bg: '#dbeafe', icon: <ShopOutlined /> },
  contact: { label: '联系人', color: '#8b5cf6', bg: '#ede9fe', icon: <UserOutlined /> },
  partner: { label: '合作伙伴', color: '#06b6d4', bg: '#cffafe', icon: <TeamOutlined /> },
  competitor: { label: '竞争企业', color: '#ef4444', bg: '#fee2e2', icon: <BankOutlined /> },
  supplier: { label: '供应商', color: '#f59e0b', bg: '#fef3c7', icon: <BankOutlined /> },
  internal: { label: '内部人员', color: '#ec4899', bg: '#fce7f3', icon: <CompassOutlined /> },
}

export const RELATION_TYPES = [
  { value: 'decision', label: '决策关系', color: '#60a5fa' },
  { value: 'report', label: '汇报关系', color: '#a78bfa' },
  { value: 'tech_support', label: '技术支持', color: '#34d399' },
  { value: 'partner', label: '合作伙伴', color: '#22d3ee' },
  { value: 'competitor', label: '竞争关系', color: '#f87171' },
  { value: 'superior', label: '上下级', color: '#fbbf24' },
  { value: 'private', label: '私人关系', color: '#f472b6' },
  { value: 'business_docking', label: '业务对接', color: '#14b8a6' },
]

// ── 节点编辑 Modal ──────────────────────────────
export interface NodeEditModalRef {
  /** 新增节点，传入初始节点类型 */
  openAdd: (kind: NodeKind) => void
  /** 编辑已有节点 */
  openEdit: (node: GraphNodeData) => void
  close: () => void
}

interface NodeEditModalProps {
  /** 当前客户 id，用于加载该客户的联系人下拉 */
  customerId?: string
  onSubmit: (node: GraphNodeData, isNew: boolean) => void
}

const NodeEditModal = forwardRef<NodeEditModalRef, NodeEditModalProps>(
  ({ customerId, onSubmit }, ref) => {
    const [form] = Form.useForm<GraphNodeData>()
    const [open, setOpen] = useState(false)
    const [isNew, setIsNew] = useState(false)
    const [data, setData] = useState<GraphNodeData | null>(null)
    const [kind, setKind] = useState<NodeKind | undefined>()

    const watchedKind = Form.useWatch('kind', form) as NodeKind | undefined
    const isContact = watchedKind === 'contact'
    const isInternal = watchedKind === 'internal'

    const [contactOptions, setContactOptions] = useState<
      { id: string; name: string; position: string | null }[]
    >([])
    const [userOptions, setUserOptions] = useState<
      { id: string; name: string; deptName: string | null }[]
    >([])

    // 加载系统用户（内部人员下拉）
    useEffect(() => {
      userApi
        .options()
        .then((res) => {
          setUserOptions(
            (res ?? []).map((u) => ({ id: u.id, name: u.name, deptName: null }))
          )
        })
        .catch(() => {
          /* 静默失败：内部人员下拉可为空 */
        })
    }, [])

    // 加载当前客户的联系人
    useEffect(() => {
      if (!customerId) return
      contactApi
        .listByCustomer(customerId)
        .then((res) => {
          setContactOptions(
            (res ?? []).map((c) => ({ id: c.id, name: c.name, position: c.position }))
          )
        })
        .catch(() => setContactOptions([]))
    }, [customerId])

    useImperativeHandle(ref, () => ({
      openAdd: (k) => {
        setIsNew(true)
        setData(null)
        setKind(k)
        setOpen(true)
      },
      openEdit: (node) => {
        setIsNew(false)
        setData(node)
        setKind(node.kind)
        setOpen(true)
      },
      close: () => setOpen(false),
    }))

    // 打开时初始化表单
    useEffect(() => {
      if (!open) return
      if (isNew) {
        form.resetFields()
        form.setFieldsValue({
          kind: kind ?? 'contact',
          name: undefined,
          sourceId: undefined,
          position: undefined,
          company: undefined,
        } as unknown as GraphNodeData)
      } else if (data) {
        form.setFieldsValue(data)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const handleOk = async () => {
      const values = await form.validateFields()
      // id 不在表单字段中，此处生成 / 保留，避免 G6 报 "datum does not have available id"
      // 编辑时合并 data 以保留非表单字段（isCenter / avatar / tags / sourceId 等）
      const result: GraphNodeData = isNew
        ? { ...values, id: `node-${Date.now()}` }
        : ({ ...(data ?? {}), ...values } as GraphNodeData)
      onSubmit(result, isNew)
      setOpen(false)
    }

    return (
      <Modal
        open={open}
        title={isNew ? '添加节点' : '编辑节点'}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          onValuesChange={(changed) => {
            // 切换节点类型时清空来源相关字段
            if (changed.kind) {
              form.setFieldsValue({
                sourceId: undefined,
                name: undefined,
                position: undefined,
                company: undefined,
              })
            }
            // 选择联系人 / 内部人员后自动带出名称与职位
            if (changed.sourceId) {
              const sid = changed.sourceId as string
              if (watchedKind === 'contact') {
                const c = contactOptions.find((x) => x.id === sid)
                if (c) {
                  form.setFieldsValue({ name: c.name, position: c.position ?? undefined })
                }
              } else if (watchedKind === 'internal') {
                const u = userOptions.find((x) => x.id === sid)
                if (u) {
                  form.setFieldsValue({ name: u.name, company: u.deptName ?? undefined })
                }
              }
            }
          }}
        >
          <Form.Item label="节点类型" name="kind" rules={[{ required: true }]}>
            <Select
              disabled={!isNew}
              options={(Object.keys(NODE_KIND_META) as NodeKind[])
                .filter((k) => k !== 'customer')
                .map((k) => ({ value: k, label: NODE_KIND_META[k].label }))}
            />
          </Form.Item>

          {/* 联系人：从当前客户的联系人表中选择 */}
          {isContact && (
            <Form.Item
              label="选择联系人"
              name="sourceId"
              rules={[{ required: true, message: '请选择联系人' }]}
            >
              <Select
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.includes(input)
                }
                placeholder={
                  contactOptions.length ? '请选择联系人' : '该客户暂无联系人'
                }
                options={contactOptions.map((c) => ({
                  value: c.id,
                  label: c.position ? `${c.name}（${c.position}）` : c.name,
                }))}
              />
            </Form.Item>
          )}

          {/* 内部人员：从系统用户中选择 */}
          {isInternal && (
            <Form.Item
              label="选择内部人员"
              name="sourceId"
              rules={[{ required: true, message: '请选择内部人员' }]}
            >
              <Select
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.includes(input)
                }
                placeholder="请选择系统用户"
                options={userOptions.map((u) => ({
                  value: u.id,
                  label: u.deptName ? `${u.name}（${u.deptName}）` : u.name,
                }))}
              />
            </Form.Item>
          )}

          {/* 合作企业/竞争企业/供应商：自由输入 */}
          {!isContact && !isInternal && (
            <>
              <Form.Item
                label="名称"
                name="name"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input placeholder="请输入企业名称" />
              </Form.Item>
              <Form.Item label="补充说明" name="position">
                <Input placeholder="如：主营产品、合作内容" />
              </Form.Item>
            </>
          )}

          {/* 联系人 / 内部人员 选完后，名字与职位自动带出，可编辑微调 */}
          {(isContact || isInternal) && (
            <>
              <Form.Item
                label="名称"
                name="name"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label="职位 / 部门" name="position">
                <Input placeholder="可选" />
              </Form.Item>
            </>
          )}

          <Form.Item label="所属企业" name="company">
            <Input placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    )
  }
)

NodeEditModal.displayName = 'NodeEditModal'

// ── 边编辑 Modal 顶部的节点徽标（样式对齐关系图中的节点） ──────────
function EdgeNodeBadge({ name, kind }: { name?: string; kind?: NodeKind }) {
  const meta = (kind && NODE_KIND_META[kind]) ?? NODE_KIND_META.contact
  // 客户是关系图中心节点：实色底 + 白字，其余类型浅底 + 主色
  const isCenter = kind === 'customer'
  const char = (name ?? '·').charAt(0) || '·'
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-semibold"
        style={{
          background: isCenter ? meta.color : meta.bg,
          color: isCenter ? '#ffffff' : meta.color,
          border: `${isCenter ? 3 : 2}px solid ${meta.color}`,
        }}
      >
        {char}
      </span>
      <span className="max-w-[96px] truncate text-xs font-medium text-gray-700">
        {name ?? '未知节点'}
      </span>
    </div>
  )
}

// ── 边编辑 Modal ──────────────────────────────
export interface EdgeEditModalRef {
  /** 新增关系，传入 create-edge 草稿（含 id/source/target） */
  openAdd: (
    draft: GraphEdgeData,
    sourceName?: string,
    targetName?: string,
    sourceKind?: NodeKind,
    targetKind?: NodeKind
  ) => void
  /** 编辑已有边 */
  openEdit: (
    edge: GraphEdgeData,
    sourceName?: string,
    targetName?: string,
    sourceKind?: NodeKind,
    targetKind?: NodeKind
  ) => void
  close: () => void
}

interface EdgeEditModalProps {
  onSubmit: (edge: GraphEdgeData, isNew: boolean) => void
  onDelete?: (id: string) => void
}

const EdgeEditModal = forwardRef<EdgeEditModalRef, EdgeEditModalProps>(
  ({ onSubmit, onDelete }, ref) => {
    const [form] = Form.useForm<GraphEdgeData>()
    const [open, setOpen] = useState(false)
    const [isNew, setIsNew] = useState(false)
    const [data, setData] = useState<GraphEdgeData | null>(null)
    const [sourceName, setSourceName] = useState<string | undefined>()
    const [targetName, setTargetName] = useState<string | undefined>()
    const [sourceKind, setSourceKind] = useState<NodeKind | undefined>()
    const [targetKind, setTargetKind] = useState<NodeKind | undefined>()

    // 箭头颜色跟随当前关系类型（打开瞬间表单字段尚未同步时回退到草稿值）
    const watchedRelType = Form.useWatch('relationType', form) as
      | string
      | undefined
    const arrowColor =
      RELATION_TYPES.find(
        (r) => r.value === (watchedRelType ?? data?.relationType)
      )?.color ?? '#94a3b8'

    useImperativeHandle(ref, () => ({
      openAdd: (draft, sn, tn, sk, tk) => {
        setIsNew(true)
        setData(draft)
        setSourceName(sn)
        setTargetName(tn)
        setSourceKind(sk)
        setTargetKind(tk)
        setOpen(true)
      },
      openEdit: (edge, sn, tn, sk, tk) => {
        setIsNew(false)
        setData(edge)
        setSourceName(sn)
        setTargetName(tn)
        setSourceKind(sk)
        setTargetKind(tk)
        setOpen(true)
      },
      close: () => setOpen(false),
    }))

    // 打开时初始化表单（data 中的 id/source/target 不在表单字段中，但通过合并保留）
    useEffect(() => {
      if (!open || !data) return
      form.setFieldsValue(data)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const handleOk = async () => {
      const values = await form.validateFields()
      // id / source / target 不在表单字段中，需从 data 保留
      const result: GraphEdgeData = { ...(data ?? {}), ...values } as GraphEdgeData
      onSubmit(result, isNew)
      setOpen(false)
    }

    const handleDelete = () => {
      if (data && onDelete) {
        onDelete(data.id)
      }
      setOpen(false)
    }

    return (
      <Modal
        open={open}
        title={isNew ? '新增关系' : '编辑关系'}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        destroyOnHidden
        footer={
          isNew
            ? undefined
            : [
                <Button danger key="del" onClick={handleDelete}>
                  删除关系
                </Button>,
                <Button key="cancel" onClick={() => setOpen(false)}>
                  取消
                </Button>,
                <Button key="ok" type="primary" onClick={handleOk}>
                  保存
                </Button>,
              ]
        }
      >
        <div className="mb-3 flex items-center justify-center gap-3">
          <EdgeNodeBadge name={sourceName} kind={sourceKind} />
          <ArrowRightOutlined
            className="text-lg font-bold"
            style={{ color: arrowColor }}
          />
          <EdgeNodeBadge name={targetName} kind={targetKind} />
        </div>
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="关系类型"
            name="relationType"
            rules={[{ required: true }]}
          >
            <Select
              options={RELATION_TYPES.map((r) => ({
                value: r.value,
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: r.color }}
                    />
                    {r.label}
                  </span>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item label="影响力" name="influence" rules={[{ required: true }]}>
            <Rate
              character={<StarOutlined />}
              tooltips={['极低', '较低', '一般', '较高', '极高']}
            />
          </Form.Item>
        </Form>
      </Modal>
    )
  }
)

EdgeEditModal.displayName = 'EdgeEditModal'

export { NodeEditModal, EdgeEditModal }
