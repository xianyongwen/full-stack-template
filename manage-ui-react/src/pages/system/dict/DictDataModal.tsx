import {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react'
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { dictApi } from '@/api/system'
import { AuthControl } from '@/components/AuthControl'
import { FormModal } from '@/components/FormModal'
import type { DictDataVO, DictTypeVO, CreateDictDataDTO } from '@/types/system'

/** Tag 样式可选项（与 cssClass 对应） */
const CSS_CLASS_OPTIONS = [
  { label: '默认', value: '' },
  { label: '蓝色', value: 'blue' },
  { label: '绿色', value: 'green' },
  { label: '红色', value: 'red' },
  { label: '橙色', value: 'orange' },
  { label: '紫色', value: 'purple' },
]

const cssColor = (c: string | null) => (c ? c : undefined)
const cssLabel = (c: string | null) =>
  CSS_CLASS_OPTIONS.find(o => o.value === c)?.label ?? c ?? '-'

export interface DictDataModalRef {
  /** 打开某字典类型的数据维护弹窗。resolve(true) 表示期间有过变更 */
  open: (type: DictTypeVO) => Promise<boolean>
}

interface DictDataModalProps {
  ref?: Ref<DictDataModalRef>
}

export function DictDataModal({ ref }: DictDataModalProps) {
  const { message } = App.useApp()

  // 外层维护弹窗
  const [open, setOpen] = useState(false)
  const [dictType, setDictType] = useState<DictTypeVO | undefined>()
  const [list, setList] = useState<DictDataVO[]>([])
  const [loading, setLoading] = useState(false)
  const dirtyRef = useRef(false)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)

  // 内层数据项编辑弹窗
  const [editOpen, setEditOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<DictDataVO | undefined>()
  const [editForm] = Form.useForm<CreateDictDataDTO>()

  useImperativeHandle(ref, () => ({
    open(type: DictTypeVO) {
      setDictType(type)
      setOpen(true)
      return new Promise<boolean>(resolve => {
        resolverRef.current = resolve
      })
    },
  }))

  const fetchData = useCallback(async (dictType: string) => {
    setLoading(true)
    try {
      const rows = await dictApi.dataList({ dictType })
      setList(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAfterOpenChange = (o: boolean) => {
    if (o && dictType) {
      dirtyRef.current = false
      fetchData(dictType.dictType)
    }
  }

  const handleClose = () => {
    const dirty = dirtyRef.current
    dirtyRef.current = false
    setOpen(false)
    setDictType(undefined)
    setList([])
    resolverRef.current?.(dirty)
    resolverRef.current = null
  }

  // ── 数据项增删改 ──

  const openEdit = (record?: DictDataVO) => {
    setEditRecord(record)
    editForm.setFieldsValue({
      dictType: dictType?.dictType,
      dictLabel: record?.dictLabel,
      dictValue: record?.dictValue,
      cssClass: record?.cssClass ?? '',
      isDefault: record?.isDefault ?? 0,
      sort: record?.sort ?? 0,
      status: record?.status ?? 1,
      remark: record?.remark ?? undefined,
    })
    setEditOpen(true)
  }

  const submitEdit = async () => {
    const values = await editForm.validateFields()
    if (editRecord) {
      await dictApi.updateData(editRecord.id, values)
      message.success('更新成功')
    } else {
      await dictApi.createData(values)
      message.success('创建成功')
    }
    dictApi.dataListCache.cache.clear?.()
    dirtyRef.current = true
    setEditOpen(false)
    setEditRecord(undefined)
    editForm.resetFields()
    if (dictType) fetchData(dictType.dictType)
  }

  const closeEdit = () => {
    setEditOpen(false)
    setEditRecord(undefined)
    editForm.resetFields()
  }

  const handleDelete = async (id: string) => {
    await dictApi.removeData(id)
    message.success('删除成功')
    dictApi.dataListCache.cache.clear?.()
    dirtyRef.current = true
    if (dictType) fetchData(dictType.dictType)
  }

  const columns: ColumnsType<DictDataVO> = [
    { title: '数据标签', dataIndex: 'dictLabel', width: 140 },
    { title: '数据键值', dataIndex: 'dictValue', width: 140 },
    {
      title: '样式',
      dataIndex: 'cssClass',
      width: 90,
      render: (c: string | null) => (
        <Tag color={cssColor(c)}>{cssLabel(c)}</Tag>
      ),
    },
    {
      title: '默认',
      dataIndex: 'isDefault',
      width: 70,
      render: (v: number) => (v === 1 ? <Tag color="gold">默认</Tag> : '-'),
    },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: number) => (
        <Tag color={s === 1 ? 'green' : 'red'}>{s === 1 ? '正常' : '停用'}</Tag>
      ),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            data-testid="system-dict-data-row-edit"
            type="link"
            size="small"
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除？"
            okButtonProps={{
              'data-testid': 'system-dict-data-delete-confirm',
            }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              data-testid="system-dict-data-row-delete"
              type="link"
              size="small"
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Modal
      open={open}
      title={`字典数据 - ${dictType?.dictName ?? ''}`}
      width={980}
      onCancel={handleClose}
      footer={
        <Button
          data-testid="system-dict-data-close-btn"
          onClick={handleClose}
        >
          关闭
        </Button>
      }
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <div className="page-table-toolbar">
        <AuthControl permission="system:dict:add">
          <Button
            data-testid="system-dict-data-create-btn"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEdit()}
          >
            新增数据
          </Button>
        </AuthControl>
      </div>
      <Table<DictDataVO>
        data-testid="system-dict-data-table"
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={false}
        scroll={{ x: 880 }}
        size="middle"
      />

      {/* 数据项新增/编辑（嵌套弹窗） */}
      <FormModal
        open={editOpen}
        title={editRecord ? '编辑字典数据' : '新增字典数据'}
        width={560}
        onOk={submitEdit}
        onCancel={closeEdit}
        modalProps={{
          okButtonProps: {
            'data-testid': 'system-dict-data-modal-ok',
          },
          cancelButtonProps: {
            'data-testid': 'system-dict-data-modal-cancel',
          },
        }}
      >
        <Form<CreateDictDataDTO>
          form={editForm}
          layout="vertical"
          className="pt-4"
        >
          <Form.Item name="dictType" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="dictLabel"
            label="数据标签"
            rules={[{ required: true, message: '请输入数据标签' }]}
          >
            <Input
              data-testid="system-dict-data-field-dict-label"
              placeholder="如：男"
            />
          </Form.Item>
          <Form.Item
            name="dictValue"
            label="数据键值"
            rules={[{ required: true, message: '请输入数据键值' }]}
          >
            <Input
              data-testid="system-dict-data-field-dict-value"
              placeholder="如：0"
            />
          </Form.Item>
          <Form.Item name="cssClass" label="样式（标签颜色）">
            <Select
              data-testid="system-dict-data-field-css-class"
              options={CSS_CLASS_OPTIONS}
              allowClear
              placeholder="可选"
            />
          </Form.Item>
          <Form.Item
            name="isDefault"
            label="是否默认"
            rules={[{ required: true }]}
          >
            <Select
              data-testid="system-dict-data-field-is-default"
              options={[
                { label: '是', value: 1 },
                { label: '否', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber
              data-testid="system-dict-data-field-sort"
              min={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              data-testid="system-dict-data-field-status"
              options={[
                { label: '正常', value: 1 },
                { label: '停用', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea
              data-testid="system-dict-data-field-remark"
              placeholder="请输入备注"
              rows={2}
              maxLength={255}
            />
          </Form.Item>
        </Form>
      </FormModal>
    </Modal>
  )
}
