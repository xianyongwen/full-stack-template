import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import { App, Form, Select } from 'antd'
import { FormModal } from '@/components/FormModal'
import { userApi } from '@/api/system'
import type { UserVO, RoleVO } from '@/types/system'

export interface UserAssignRoleModalRef {
  /** 打开分配角色弹窗，resolve(true) 表示提交成功，resolve(false) 表示取消 */
  open: (record: UserVO) => Promise<boolean>
}

interface UserAssignRoleModalProps {
  roleOptions: RoleVO[]
  ref?: Ref<UserAssignRoleModalRef>
}

export function UserAssignRoleModal({
  roleOptions,
  ref,
}: UserAssignRoleModalProps) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [record, setRecord] = useState<UserVO | undefined>()
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const submittedRef = useRef(false)
  const [form] = Form.useForm<{ roleIds: string[] }>()

  useImperativeHandle(ref, () => ({
    open(record: UserVO) {
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
    if (!record) return
    await userApi.assignRoles(record.id, values.roleIds)
    message.success('分配成功')
    submittedRef.current = true
    handleCancel()
  }

  const initDate = (record?: UserVO) => {
    form.setFieldsValue({
      roleIds: record?.roleIds ?? [],
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
      title="分配角色"
      width={480}
      confirmText="分配"
      onOk={handleSubmit}
      onCancel={handleCancel}
      modalProps={{
        okButtonProps: {
          'data-testid': 'system-user-assign-role-modal-ok',
        },
        cancelButtonProps: {
          'data-testid': 'system-user-assign-role-modal-cancel',
        },
        afterOpenChange: open => {
          if (open) {
            initDate(record)
          }
        },
      }}
    >
      <Form<{ roleIds: string[] }>
        form={form}
        layout="vertical"
        className="pt-4"
      >
        <Form.Item name="roleIds" label="选择角色">
          <Select
            data-testid="system-user-assign-role-field-role-ids"
            mode="multiple"
            placeholder="请选择角色"
            options={roleOptions.map(r => ({ label: r.roleName, value: r.id }))}
            optionFilterProp="label"
          />
        </Form.Item>
      </Form>
    </FormModal>
  )
}
