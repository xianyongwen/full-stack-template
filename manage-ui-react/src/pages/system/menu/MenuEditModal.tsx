import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import { App, Form, Input, InputNumber, Radio, Select, TreeSelect } from 'antd'
import { FormModal } from '@/components/FormModal'
import { CodeEditor } from '@/components/CodeEditor'
import { menuApi } from '@/api/system'
import { PERM_TYPE, NIL_UUID } from '@/types/system'
import type { PermissionVO, CreatePermissionDTO } from '@/types/system'

const TYPE_OPTIONS = [
  { label: '目录', value: PERM_TYPE.DIRECTORY },
  { label: '菜单', value: PERM_TYPE.MENU },
  { label: '按钮', value: PERM_TYPE.BUTTON },
  { label: 'API', value: PERM_TYPE.API },
]

type TreeSelectData = {
  title: string
  value: string
  children?: TreeSelectData[]
}

export interface MenuEditModalRef {
  /** 打开新增/编辑弹窗。新增时可传 parentId；编辑时传 record。resolve(true) 提交成功，resolve(false) 取消 */
  open: (params: {
    record?: PermissionVO
    parentId?: string
  }) => Promise<boolean>
}

interface MenuEditModalProps {
  treeData: PermissionVO[]
  ref?: Ref<MenuEditModalRef>
}

export function MenuEditModal({ treeData, ref }: MenuEditModalProps) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [record, setRecord] = useState<PermissionVO | undefined>()
  const [parentId, setParentId] = useState<string | undefined>()
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const submittedRef = useRef(false)
  const [form] = Form.useForm<CreatePermissionDTO>()

  const isEdit = !!record
  const isTopLevel =
    (open && !record && parentId === NIL_UUID) ||
    (!!record?.parentId && record.parentId === NIL_UUID)
  const type = Form.useWatch('type', form)
  const iconValue = Form.useWatch('icon', form)

  const parentTreeData = toTreeSelectData(
    treeData.filter(
      n => n.type === PERM_TYPE.DIRECTORY || n.type === PERM_TYPE.MENU
    )
  )

  useImperativeHandle(ref, () => ({
    open({ record, parentId }) {
      setRecord(record)
      setParentId(parentId)
      initDate(record, parentId)
      setOpen(true)
      return new Promise<boolean>(resolve => {
        resolverRef.current = resolve
      })
    },
  }))

  const handleSubmit = async () => {
    const values = await form.validateFields()
    if (record) {
      await menuApi.update(record.id, values)
      message.success('更新成功')
    } else {
      await menuApi.create(values)
      message.success('创建成功')
    }
    submittedRef.current = true
    handleCancel()
  }

  const initDate = (record?: PermissionVO, parentId?: string) => {
    form.setFieldsValue({
      parentId: record?.parentId ?? parentId ?? NIL_UUID,
      permName: record?.permName,
      permCode: record?.permCode ?? undefined,
      type: record?.type ?? PERM_TYPE.MENU,
      code: record?.code ?? undefined,
      component: record?.component ?? undefined,
      icon: record?.icon ?? undefined,
      apiUrl: record?.apiUrl ?? undefined,
      apiMethod: record?.apiMethod ?? undefined,
      sort: record?.sort ?? 0,
      visible: record?.visible ?? 1,
      status: record?.status ?? 1,
    })
  }

  const handleCancel = () => {
    const ok = submittedRef.current
    submittedRef.current = false
    setOpen(false)
    setRecord(undefined)
    setParentId(undefined)
    form.resetFields()
    resolverRef.current?.(ok)
    resolverRef.current = null
  }

  return (
    <FormModal
      open={open}
      title={isEdit ? '编辑菜单' : '新增菜单'}
      width={640}
      onOk={handleSubmit}
      onCancel={handleCancel}
      modalProps={{
        okButtonProps: {
          'data-testid': 'system-menu-modal-ok',
        },
        cancelButtonProps: {
          'data-testid': 'system-menu-modal-cancel',
        },
        afterOpenChange: open => {
          if (open) {
            initDate(record, parentId)
          }
        },
      }}
    >
      <Form<CreatePermissionDTO> form={form} layout="vertical" className="pt-4">
        {!isTopLevel && (
          <Form.Item
            name="parentId"
            label="父级菜单"
            rules={[{ required: true }]}
          >
            <TreeSelect
              data-testid="system-menu-field-parent-id"
              placeholder="请选择父级菜单"
              treeData={parentTreeData}
              treeDefaultExpandAll
              allowClear
            />
          </Form.Item>
        )}
        <Form.Item name="type" label="类型" rules={[{ required: true }]}>
          <Radio.Group data-testid="system-menu-field-type">
            {TYPE_OPTIONS.map(o => (
              <Radio key={o.value} value={o.value}>
                {o.label}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item
          name="permName"
          label="名称"
          rules={[{ required: true, message: '请输入名称' }]}
        >
          <Input
            data-testid="system-menu-field-perm-name"
            placeholder="请输入名称"
          />
        </Form.Item>
        <Form.Item name="permCode" label="权限编码">
          <Input
            data-testid="system-menu-field-perm-code"
            placeholder="如 system:user:add"
          />
        </Form.Item>
        {(type === PERM_TYPE.DIRECTORY || type === PERM_TYPE.MENU) && (
          <Form.Item name="code" label="路由路径">
            <Input
              data-testid="system-menu-field-code"
              placeholder="如 /system/user"
            />
          </Form.Item>
        )}
        {type === PERM_TYPE.MENU && (
          <Form.Item name="component" label="组件路径">
            <Input
              data-testid="system-menu-field-component"
              placeholder="如 system/UserManage"
            />
          </Form.Item>
        )}
        {(type === PERM_TYPE.DIRECTORY || type === PERM_TYPE.MENU) && (
          <>
            <Form.Item
              data-testid="system-menu-field-icon"
              name="icon"
              label="图标"
              tooltip='请输入SVG代码，如 &lt;svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"&gt;...&lt;/svg&gt;'
            >
              <CodeEditor
                placeholder="请输入SVG图标代码"
                minLines={4}
                maxLines={10}
              />
            </Form.Item>
            {iconValue &&
              iconValue.includes('<svg') &&
              iconValue.includes('</svg>') && (
                <div
                  style={{
                    padding: '8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span style={{ color: '#999', fontSize: 13 }}>预览：</span>
                  <span
                    className="svg-icon"
                    style={{
                      fontSize: 28,
                      padding: '4px 16px',
                      borderRadius: 6,
                      background: '#f5f5f5',
                    }}
                    dangerouslySetInnerHTML={{ __html: iconValue }}
                  />
                </div>
              )}
          </>
        )}
        {type === PERM_TYPE.API && (
          <>
            <Form.Item name="apiUrl" label="API 地址">
              <Input
                data-testid="system-menu-field-api-url"
                placeholder="如 /api/user"
              />
            </Form.Item>
            <Form.Item name="apiMethod" label="请求方法">
              <Select
                data-testid="system-menu-field-api-method"
                placeholder="请选择"
                allowClear
                options={[
                  { label: 'GET', value: 'GET' },
                  { label: 'POST', value: 'POST' },
                  { label: 'PUT', value: 'PUT' },
                  { label: 'DELETE', value: 'DELETE' },
                ]}
              />
            </Form.Item>
          </>
        )}
        <Form.Item name="sort" label="排序">
          <InputNumber
            data-testid="system-menu-field-sort"
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="visible" label="是否显示" rules={[{ required: true }]}>
          <Select
            data-testid="system-menu-field-visible"
            options={[
              { label: '显示', value: 1 },
              { label: '隐藏', value: 0 },
            ]}
          />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select
            data-testid="system-menu-field-status"
            options={[
              { label: '正常', value: 1 },
              { label: '停用', value: 0 },
            ]}
          />
        </Form.Item>
      </Form>
    </FormModal>
  )
}

function toTreeSelectData(nodes: PermissionVO[]): TreeSelectData[] {
  return nodes.map(n => ({
    title: n.permName,
    value: n.id,
    children: n.children?.length ? toTreeSelectData(n.children) : undefined,
  }))
}
