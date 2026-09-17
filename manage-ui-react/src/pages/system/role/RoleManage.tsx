import { useRef } from 'react'
import {
  Button,
  Form,
  Input,
  Select,
  Tag,
  Switch,
  Space,
  Popconfirm,
  App,
} from 'antd'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTable } from '@/hooks/useTable'
import { roleApi } from '@/api/system'
import { AuthControl } from '@/components/AuthControl'
import { DATA_SCOPE } from '@/types/system'
import type { RoleVO } from '@/types/system'
import { RoleEditModal, type RoleEditModalRef } from './RoleEditModal'
import { RolePermModal, type RolePermModalRef } from './RolePermModal'
import Container from '@/components/Container'
import { MyTable } from '@/components/MyTable'

type SearchForm = {
  roleName?: string
  roleCode?: string
  status?: number
}

const DATA_SCOPE_OPTIONS = [
  { label: '全部', value: DATA_SCOPE.ALL },
  { label: '自定义', value: DATA_SCOPE.CUSTOM },
  { label: '本部门', value: DATA_SCOPE.DEPT },
  { label: '本部门及以下', value: DATA_SCOPE.DEPT_AND_BELOW },
  { label: '仅本人', value: DATA_SCOPE.SELF },
]

const dataScopeLabel = (scope: number) =>
  DATA_SCOPE_OPTIONS.find(o => o.value === scope)?.label ?? '-'

export default function RoleManage() {
  const { message } = App.useApp()
  const [searchForm] = Form.useForm<SearchForm>()

  // 弹窗 ref
  const editModalRef = useRef<RoleEditModalRef>(null)
  const permModalRef = useRef<RolePermModalRef>(null)

  const { dataSource, loading, pagination, onSearch, onReset, refresh } =
    useTable<SearchForm & Record<string, unknown>, RoleVO>({
      fetcher: params => roleApi.list(params),
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
  const openEdit = (record?: RoleVO) => {
    editModalRef.current?.open(record)?.then(ok => {
      if (ok) refresh()
    })
  }

  // 打开分配权限弹窗
  const openPerm = (record: RoleVO) => {
    permModalRef.current?.open(record)?.then(ok => {
      if (ok) refresh()
    })
  }

  // 状态切换
  const handleStatusChange = async (record: RoleVO, checked: boolean) => {
    try {
      await roleApi.update(record.id, { status: checked ? 1 : 0 })
      message.success('状态更新成功')
      refresh()
    } catch {
      // ignore
    }
  }

  // 删除
  const handleDelete = async (id: string) => {
    await roleApi.remove(id)
    message.success('删除成功')
    refresh()
  }

  const columns: ColumnsType<RoleVO> = [
    { title: '角色名称', dataIndex: 'roleName', width: 140 },
    { title: '角色编码', dataIndex: 'roleCode', width: 140 },
    {
      title: '数据权限',
      dataIndex: 'dataScope',
      width: 120,
      render: (v: number) => <Tag color="purple">{dataScopeLabel(v)}</Tag>,
    },
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: number, record) => (
        <Switch
          checked={status === 1}
          onChange={checked => handleStatusChange(record, checked)}
          size="small"
        />
      ),
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
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            data-testid="system-role-row-edit"
            type="link"
            size="small"
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Button
            data-testid="system-role-row-assign-perm"
            type="link"
            size="small"
            onClick={() => openPerm(record)}
          >
            分配权限
          </Button>
          <Popconfirm
            title="确定删除该角色？"
            okButtonProps={{
              'data-testid': 'system-role-delete-confirm',
            }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              data-testid="system-role-row-delete"
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
          <Form.Item name="roleName" label="角色名称">
            <Input placeholder="请输入" allowClear />
          </Form.Item>
          <Form.Item name="roleCode" label="角色编码">
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
                data-testid="system-role-search-btn"
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                搜索
              </Button>
              <Button
                data-testid="system-role-reset-btn"
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
        data-testid="system-role-table"
        loading={loading}
        className="page-table-container"
      >
        <div className="page-table-toolbar">
          <AuthControl permission="system:role:add">
            <Button
              data-testid="system-role-create-btn"
              size="large"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEdit()}
            >
              新增角色
            </Button>
          </AuthControl>
        </div>
        <MyTable<RoleVO>
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          pagination={pagination}
        />
      </Container>

      {/* 新增/编辑弹窗 */}
      <RoleEditModal ref={editModalRef} />

      {/* 分配权限弹窗 */}
      <RolePermModal ref={permModalRef} />
    </div>
  )
}
