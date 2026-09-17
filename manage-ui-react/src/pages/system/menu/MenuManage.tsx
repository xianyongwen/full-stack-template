import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Tag, Space, Popconfirm, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { menuApi } from '@/api/system'
import { AuthControl } from '@/components/AuthControl'
import { PERM_TYPE, NIL_UUID } from '@/types/system'
import type { PermissionVO } from '@/types/system'
import { MenuEditModal, type MenuEditModalRef } from './MenuEditModal'
import Container from '@/components/Container'
import { MyTable } from '@/components/MyTable'

const TYPE_OPTIONS = [
  { label: '目录', value: PERM_TYPE.DIRECTORY, color: 'blue' },
  { label: '菜单', value: PERM_TYPE.MENU, color: 'purple' },
  { label: '按钮', value: PERM_TYPE.BUTTON, color: 'orange' },
  { label: 'API', value: PERM_TYPE.API, color: 'green' },
]

const typeLabel = (t: number) =>
  TYPE_OPTIONS.find(o => o.value === t)?.label ?? '-'
const typeColor = (t: number) =>
  TYPE_OPTIONS.find(o => o.value === t)?.color ?? 'default'

export default function MenuManage() {
  const { message } = App.useApp()
  const [treeData, setTreeData] = useState<PermissionVO[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  // 弹窗 ref
  const editModalRef = useRef<MenuEditModalRef>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const tree = await menuApi.tree()
      setTreeData(tree)
      // 默认展开第一层
      setExpandedKeys(tree.map(n => n.id))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 打开新增/编辑弹窗
  const openEdit = (params: { record?: PermissionVO; parentId?: string }) => {
    editModalRef.current?.open(params)?.then(ok => {
      if (ok) fetchData()
    })
  }

  // 删除
  const handleDelete = async (id: string) => {
    await menuApi.remove(id)
    message.success('删除成功')
    fetchData()
  }

  const columns: ColumnsType<PermissionVO> = [
    {
      title: '菜单名称',
      dataIndex: 'permName',
      width: 220,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 80,
      render: (v: string | null) => {
        if (!v) return '-'
        // 尝试渲染为 SVG 图标
        if (v.includes('<svg')) {
          return (
            <span
              dangerouslySetInnerHTML={{ __html: v }}
              style={{
                display: 'inline-flex',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
              }}
            />
          )
        }
        return '-'
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (t: number) => <Tag color={typeColor(t)}>{typeLabel(t)}</Tag>,
    },
    {
      title: '权限编码',
      dataIndex: 'permCode',
      width: 180,
      render: (v: string | null) => v ?? '-',
    },
    {
      title: '路由路径',
      dataIndex: 'code',
      width: 160,
      render: (v: string | null) => v ?? '-',
    },
    {
      title: '排序',
      dataIndex: 'sort',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: number) => (
        <Tag color={s === 1 ? 'green' : 'red'}>{s === 1 ? '正常' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            data-testid="system-menu-row-add-child"
            type="link"
            size="small"
            onClick={() => openEdit({ parentId: record.id })}
          >
            新增子项
          </Button>
          <Button
            data-testid="system-menu-row-edit"
            type="link"
            size="small"
            onClick={() => openEdit({ record })}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除？"
            okButtonProps={{
              'data-testid': 'system-menu-delete-confirm',
            }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              data-testid="system-menu-row-delete"
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
      <Container
        data-testid="system-menu-table"
        loading={loading}
        className="page-table-container"
      >
        <div className="page-table-toolbar">
          <AuthControl permission="system:menu:add">
            <Button
              data-testid="system-menu-create-btn"
              size="large"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEdit({ parentId: NIL_UUID })}
            >
              新增顶级菜单
            </Button>
          </AuthControl>
        </div>
        <MyTable<PermissionVO>
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

      <MenuEditModal ref={editModalRef} treeData={treeData} />
    </div>
  )
}
