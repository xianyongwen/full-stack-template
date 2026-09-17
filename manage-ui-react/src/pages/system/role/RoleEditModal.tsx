import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import { App, Form, Input, InputNumber, Select } from 'antd'
import { FormModal } from '@/components/FormModal'
import { roleApi } from '@/api/system'
import { DATA_SCOPE } from '@/types/system'
import type { RoleVO, CreateRoleDTO } from '@/types/system'

const DATA_SCOPE_OPTIONS = [
  { label: '全部', value: DATA_SCOPE.ALL },
  { label: '自定义', value: DATA_SCOPE.CUSTOM },
  { label: '本部门', value: DATA_SCOPE.DEPT },
  { label: '本部门及以下', value: DATA_SCOPE.DEPT_AND_BELOW },
  { label: '仅本人', value: DATA_SCOPE.SELF },
]

export interface RoleEditModalRef {
  /** 打开新增/编辑弹窗，传 record 为编辑，不传为新增。resolve(true) 提交成功，resolve(false) 取消 */
  open: (record?: RoleVO) => Promise<boolean>
}

interface RoleEditModalProps {
  ref?: Ref<RoleEditModalRef>
}

export function RoleEditModal({ ref }: RoleEditModalProps) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [record, setRecord] = useState<RoleVO | undefined>()
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const submittedRef = useRef(false)
  const [form] = Form.useForm<CreateRoleDTO>()

  const isEdit = !!record

  useImperativeHandle(ref, () => ({
    open(record?: RoleVO) {
      setRecord(record)
      initDate(record)
      setOpen(true)
      return new Promise<boolean>(resolve => {
        resolverRef.current = resolve
      })
    },
  }))

  const handleSubmit = async () => {
    const values = await form.validateFields()
    if (record) {
      const { roleCode, ...rest } = values
      void roleCode
      await roleApi.update(record.id, rest)
      message.success('更新成功')
    } else {
      await roleApi.create(values)
      message.success('创建成功')
    }
    submittedRef.current = true
    handleCancel()
  }

  const initDate = (record?: RoleVO) => {
    form.setFieldsValue({
      roleName: record?.roleName,
      roleCode: record?.roleCode,
      dataScope: record?.dataScope ?? DATA_SCOPE.ALL,
      sort: record?.sort ?? 0,
      status: record?.status ?? 1,
      remark: record?.remark ?? undefined,
    })
  }

  const handleCancel = () => {
    const ok = submittedRef.current
    submittedRef.current = false
    setOpen(false)
    setRecord(undefined)
    form.resetFields()
    resolverRef.current?.(ok)
    resolverRef.current = null
  }

  return (
    <FormModal
      open={open}
      title={isEdit ? '编辑角色' : '新增角色'}
      onOk={handleSubmit}
      onCancel={handleCancel}
      modalProps={{
        okButtonProps: {
          'data-testid': 'system-role-modal-ok',
        },
        cancelButtonProps: {
          'data-testid': 'system-role-modal-cancel',
        },
        afterOpenChange: open => {
          if (open) {
            initDate(record)
          }
        },
      }}
    >
      <Form<CreateRoleDTO> form={form} layout="vertical" className="pt-4">
        <Form.Item
          name="roleName"
          label="角色名称"
          rules={[{ required: true, message: '请输入角色名称' }]}
        >
          <Input
            data-testid="system-role-field-role-name"
            placeholder="请输入角色名称"
          />
        </Form.Item>
        <Form.Item
          name="roleCode"
          label="角色编码"
          rules={[
            { required: true, message: '请输入角色编码' },
            {
              pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
              message: '字母开头，仅字母数字下划线',
            },
          ]}
        >
          <Input
            data-testid="system-role-field-role-code"
            placeholder="请输入角色编码"
            disabled={isEdit}
          />
        </Form.Item>
        <Form.Item
          name="dataScope"
          label="数据权限"
          rules={[{ required: true }]}
        >
          <Select
            data-testid="system-role-field-data-scope"
            options={DATA_SCOPE_OPTIONS}
          />
        </Form.Item>
        <Form.Item name="sort" label="排序">
          <InputNumber
            data-testid="system-role-field-sort"
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select
            data-testid="system-role-field-status"
            options={[
              { label: '正常', value: 1 },
              { label: '停用', value: 0 },
            ]}
          />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea
            data-testid="system-role-field-remark"
            placeholder="请输入备注"
            rows={2}
            maxLength={200}
          />
        </Form.Item>
      </Form>
    </FormModal>
  )
}
