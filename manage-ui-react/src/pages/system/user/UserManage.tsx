import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Form,
  Input,
  Select,
  Tag,
  Switch,
  Space,
  TreeSelect,
  Popconfirm,
  App,
} from 'antd'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTable } from '@/hooks/useTable'
import { userApi, roleApi, deptApi } from '@/api/system'
import { AuthControl } from '@/components/AuthControl'
import { MyTable } from '@/components/MyTable'
import type { UserVO } from '@/types/system'
import type { RoleVO, DeptVO } from '@/types/system'
import { UserEditModal, type UserEditModalRef } from './UserEditModal'
import {
  UserAssignRoleModal,
  type UserAssignRoleModalRef,
} from './UserAssignRoleModal'
import {
  UserResetPwdModal,
  type UserResetPwdModalRef,
} from './UserResetPwdModal'
import Container from '@/components/Container'

type SearchForm = {
  username?: string
  nickname?: string
  phone?: string
  status?: number
  deptId?: string
}

export default function UserManage() {
  const { message } = App.useApp()
  const [searchForm] = Form.useForm<SearchForm>()

  // 角色选项 & 部门树（弹窗用）
  const [roleOptions, setRoleOptions] = useState<RoleVO[]>([])
  const [deptTreeData, setDeptTreeData] = useState<DeptVO[]>([])

  // 弹窗 ref
  const editModalRef = useRef<UserEditModalRef>(null)
  const assignModalRef = useRef<UserAssignRoleModalRef>(null)
  const pwdModalRef = useRef<UserResetPwdModalRef>(null)

  const { dataSource, loading, pagination, onSearch, onReset, refresh } =
    useTable<SearchForm & Record<string, unknown>, UserVO>({
      fetcher: params => userApi.list(params),
      initialQuery: {},
      initialPageSize: 10,
    })

  // 加载角色选项和部门树
  useEffect(() => {
    roleApi
      .options()
      .then(setRoleOptions)
      .catch(() => {})
    deptApi
      .tree()
      .then(setDeptTreeData)
      .catch(() => {})
  }, [])

  const handleSearch = () => {
    const values = searchForm.getFieldsValue()
    onSearch(values as Partial<SearchForm>)
  }

  const handleReset = () => {
    searchForm.resetFields()
    onReset()
  }

  // 打开新增/编辑弹窗
  const openEdit = (record?: UserVO) => {
    editModalRef.current?.open(record)?.then(ok => {
      if (ok) refresh()
    })
  }

  // 打开分配角色弹窗
  const openAssign = (record: UserVO) => {
    assignModalRef.current?.open(record)?.then(ok => {
      if (ok) refresh()
    })
  }

  // 打开重置密码弹窗
  const openResetPwd = (record: UserVO) => {
    pwdModalRef.current?.open(record)?.then(ok => {
      if (ok) refresh()
    })
  }

  // 状态切换
  const handleStatusChange = async (record: UserVO, checked: boolean) => {
    try {
      await userApi.updateStatus(record.id, checked ? 1 : 0)
      message.success('状态更新成功')
      refresh()
    } catch {
      // 错误提示已在拦截器处理
    }
  }

  // 删除
  const handleDelete = async (id: string) => {
    await userApi.remove(id)
    message.success('删除成功')
    refresh()
  }

  const columns: ColumnsType<UserVO> = [
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '昵称', dataIndex: 'nickname', width: 120, render: v => v ?? '-' },
    { title: '部门', dataIndex: 'deptName', width: 120, render: v => v ?? '-' },
    {
      title: '角色',
      dataIndex: 'roles',
      width: 200,
      render: (roles?: UserVO['roles']) =>
        roles?.length ? (
          <Space size={[4, 4]} wrap>
            {roles.map(r => (
              <Tag color="purple" key={r.id}>
                {r.roleName}
              </Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
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
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            data-testid="system-user-row-edit"
            type="link"
            size="small"
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Button
            data-testid="system-user-row-assign-role"
            type="link"
            size="small"
            onClick={() => openAssign(record)}
          >
            分配角色
          </Button>
          <Button
            data-testid="system-user-row-reset-pwd"
            type="link"
            size="small"
            onClick={() => openResetPwd(record)}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确定删除该用户？"
            okButtonProps={{
              'data-testid': 'system-user-delete-confirm',
            }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              data-testid="system-user-row-delete"
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

  // 部门树 TreeSelect 数据
  const deptTreeSelectData = toTreeSelectData(deptTreeData)

  return (
    <div className="page-col-container">
      {/* 搜索栏 */}
      <div className="page-search-container">
        <Form
          size="large"
          form={searchForm}
          className="search-form"
          layout="inline"
          initialValues={{}}
        >
          <Form.Item name="username" label="用户名">
            <Input placeholder="请输入" allowClear />
          </Form.Item>
          {/* <Form.Item name="nickname" label="昵称">
            <Input placeholder="请输入" allowClear />
          </Form.Item> */}
          <Form.Item name="phone" label="手机号">
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
          <Form.Item name="deptId" label="部门">
            <TreeSelect
              placeholder="请选择"
              allowClear
              style={{ width: 160 }}
              treeData={deptTreeSelectData}
              treeDefaultExpandAll
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                data-testid="system-user-search-btn"
                size="large"
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                搜索
              </Button>
              <Button
                data-testid="system-user-reset-btn"
                size="large"
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
        data-testid="system-user-table"
        loading={loading}
        className="page-table-container"
      >
        <div className="page-table-toolbar">
          <AuthControl permission="system:user:add">
            <Button
              data-testid="system-user-create-btn"
              size="large"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEdit()}
            >
              新增用户
            </Button>
          </AuthControl>
        </div>
        <MyTable<UserVO>
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          pagination={pagination}
        />
      </Container>

      {/* 新增/编辑弹窗 */}
      <UserEditModal
        ref={editModalRef}
        roleOptions={roleOptions}
        deptTreeData={deptTreeSelectData}
      />

      {/* 分配角色弹窗 */}
      <UserAssignRoleModal ref={assignModalRef} roleOptions={roleOptions} />

      {/* 重置密码弹窗 */}
      <UserResetPwdModal ref={pwdModalRef} />
    </div>
  )
}

type TreeSelectData = {
  title: string
  value: string
  children?: TreeSelectData[]
}

/** DeptVO[] → antd TreeSelect treeData */
function toTreeSelectData(nodes: DeptVO[]): TreeSelectData[] {
  return nodes.map(n => ({
    title: n.deptName,
    value: n.id,
    children: n.children?.length ? toTreeSelectData(n.children) : undefined,
  }))
}
