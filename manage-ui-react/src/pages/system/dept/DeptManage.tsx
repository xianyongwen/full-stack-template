import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Form, Input, Select, Tag, Space, Popconfirm, App } from 'antd'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { deptApi } from '@/api/system'
import { AuthControl } from '@/components/AuthControl'
import { MyTable } from '@/components/MyTable'
import { NIL_UUID } from '@/types/system'
import type { DeptVO } from '@/types/system'
import { DeptEditModal, type DeptEditModalRef } from './DeptEditModal'
import Container from '@/components/Container'

type SearchForm = { deptName?: string; status?: number }

export default function DeptManage() {
  const { message } = App.useApp()
  const [searchForm] = Form.useForm<SearchForm>()

  const [treeData, setTreeData] = useState<DeptVO[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  // 当前搜索条件
  const [query, setQuery] = useState<SearchForm>({})

  // 弹窗 ref
  const editModalRef = useRef<DeptEditModalRef>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const tree = await deptApi.tree({
        deptName: query.deptName,
        status: query.status,
      })
      setTreeData(tree)
      setExpandedKeys(tree.map(n => n.id))
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = () => {
    setQuery(searchForm.getFieldsValue())
  }

  const handleReset = () => {
    searchForm.resetFields()
    setQuery({})
  }

  // 打开新增/编辑弹窗
  const openEdit = (params: { record?: DeptVO; parentId?: string }) => {
    editModalRef.current?.open(params)?.then(ok => {
      if (ok) fetchData()
    })
  }

  // 删除
  const handleDelete = async (id: string) => {
    await deptApi.remove(id)
    message.success('删除成功')
    fetchData()
  }

  const columns: ColumnsType<DeptVO> = [
    { title: '部门名称', dataIndex: 'deptName', width: 240 },
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
            data-testid="system-dept-row-add-child"
            type="link"
            size="small"
            onClick={() => openEdit({ parentId: record.id })}
          >
            新增子项
          </Button>
          <Button
            data-testid="system-dept-row-edit"
            type="link"
            size="small"
            onClick={() => openEdit({ record })}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除？"
            okButtonProps={{
              'data-testid': 'system-dept-delete-confirm',
            }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              data-testid="system-dept-row-delete"
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

  // 父级部门树（编辑弹窗用）
  const parentTreeData = useMemo(() => toTreeSelectData(treeData), [treeData])

  return (
    <div className="page-col-container">
      {/* 搜索栏 */}
      <div className="page-search-container">
        <Form size="large" form={searchForm} layout="inline">
          <Form.Item name="deptName" label="部门名称">
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
                data-testid="system-dept-search-btn"
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                搜索
              </Button>
              <Button
                data-testid="system-dept-reset-btn"
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
        data-testid="system-dept-table"
        loading={loading}
        className="page-table-container"
      >
        <div className="page-table-toolbar">
          <AuthControl permission="system:dept:add">
            <Button
              data-testid="system-dept-create-btn"
              size="large"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEdit({ parentId: NIL_UUID })}
            >
              新增顶级部门
            </Button>
          </AuthControl>
        </div>
        <MyTable<DeptVO>
          rowKey="id"
          columns={columns}
          dataSource={treeData}
          pagination={false}
          expandable={{
            expandedRowKeys: expandedKeys,
            onExpandedRowsChange: keys => setExpandedKeys(keys as string[]),
          }}
        />
      </Container>

      {/* 新增/编辑弹窗 */}
      <DeptEditModal ref={editModalRef} treeData={parentTreeData} />
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
