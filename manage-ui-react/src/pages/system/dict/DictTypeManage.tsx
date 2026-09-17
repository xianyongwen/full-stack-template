import { useRef } from 'react'
import { Button, Form, Input, Select, Tag, Popconfirm, Space, App } from 'antd'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTable } from '@/hooks/useTable'
import { dictApi } from '@/api/system'
import { AuthControl } from '@/components/AuthControl'
import { MyTable } from '@/components/MyTable'
import type { DictTypeVO } from '@/types/system'
import {
  DictTypeEditModal,
  type DictTypeEditModalRef,
} from './DictTypeEditModal'
import { DictDataModal, type DictDataModalRef } from './DictDataModal'
import Container from '@/components/Container'

type SearchForm = {
  dictName?: string
  dictType?: string
  status?: number
}

export default function DictTypeManage() {
  const { message } = App.useApp()
  const [searchForm] = Form.useForm<SearchForm>()

  // 弹窗 ref
  const editModalRef = useRef<DictTypeEditModalRef>(null)
  const dataModalRef = useRef<DictDataModalRef>(null)

  const { dataSource, loading, pagination, onSearch, onReset, refresh } =
    useTable<SearchForm & Record<string, unknown>, DictTypeVO>({
      fetcher: params => dictApi.typeList(params),
      initialQuery: {},
      initialPageSize: 10,
    })

  const handleSearch = () => {
    onSearch(searchForm.getFieldsValue() as Partial<SearchForm>)
  }

  const handleReset = () => {
    searchForm.resetFields()
    onReset()
  }

  // 打开新增/编辑弹窗
  const openEdit = (record?: DictTypeVO) => {
    editModalRef.current?.open(record)?.then(ok => {
      if (ok) refresh()
    })
  }

  // 打开字典数据维护弹窗
  const openData = (record: DictTypeVO) => {
    dataModalRef.current?.open(record)?.then(ok => {
      if (ok) refresh()
    })
  }

  // 删除
  const handleDelete = async (id: string) => {
    await dictApi.removeType(id)
    message.success('删除成功')
    refresh()
  }

  const columns: ColumnsType<DictTypeVO> = [
    { title: '字典名称', dataIndex: 'dictName', width: 160 },
    {
      title: '字典类型',
      dataIndex: 'dictType',
      width: 180,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: number) => (
        <Tag color={s === 1 ? 'green' : 'red'}>{s === 1 ? '正常' : '停用'}</Tag>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 180,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            data-testid="system-dict-row-data"
            type="link"
            size="small"
            onClick={() => openData(record)}
          >
            数据
          </Button>
          <Button
            data-testid="system-dict-row-edit"
            type="link"
            size="small"
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该字典类型？"
            okButtonProps={{
              'data-testid': 'system-dict-delete-confirm',
            }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              data-testid="system-dict-row-delete"
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
    <div className="page-col-container">
      {/* 搜索栏 */}
      <div className="page-search-container">
        <Form size="large" form={searchForm} layout="inline">
          <Form.Item name="dictName" label="字典名称">
            <Input placeholder="请输入" allowClear />
          </Form.Item>
          <Form.Item name="dictType" label="字典类型">
            <Input placeholder="请输入" allowClear />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              placeholder="请选择"
              allowClear
              style={{ width: 100 }}
              options={[
                { label: '正常', value: 1 },
                { label: '停用', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                data-testid="system-dict-search-btn"
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                搜索
              </Button>
              <Button
                data-testid="system-dict-reset-btn"
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>

      {/* 表格区 */}
      <Container
        data-testid="system-dict-table"
        loading={loading}
        className="page-table-container"
      >
        <div className="page-table-toolbar">
          <AuthControl permission="system:dict:add">
            <Button
              data-testid="system-dict-create-btn"
              size="large"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEdit()}
            >
              新增字典
            </Button>
          </AuthControl>
        </div>
        <MyTable<DictTypeVO>
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          pagination={pagination}
        />
      </Container>

      {/* 新增/编辑弹窗 */}
      <DictTypeEditModal ref={editModalRef} />

      {/* 字典数据维护弹窗 */}
      <DictDataModal ref={dataModalRef} />
    </div>
  )
}
