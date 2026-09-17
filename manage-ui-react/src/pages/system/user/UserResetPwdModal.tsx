import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import { App, Form, Input } from 'antd'
import { FormModal } from '@/components/FormModal'
import { userApi } from '@/api/system'
import type { UserVO } from '@/types/system'

export interface UserResetPwdModalRef {
  /** 打开重置密码弹窗，resolve(true) 提交成功，resolve(false) 取消 */
  open: (record: UserVO) => Promise<boolean>
}

interface UserResetPwdModalProps {
  ref?: Ref<UserResetPwdModalRef>
}

export function UserResetPwdModal({ ref }: UserResetPwdModalProps) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [record, setRecord] = useState<UserVO | undefined>()
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const submittedRef = useRef(false)
  const [form] = Form.useForm<{ newPassword: string }>()

  useImperativeHandle(ref, () => ({
    open(record: UserVO) {
      setRecord(record)
      setOpen(true)
      return new Promise<boolean>(resolve => {
        resolverRef.current = resolve
      })
    },
  }))

  const handleSubmit = async () => {
    const values = await form.validateFields()
    if (!record) return
    await userApi.resetPassword(record.id, values.newPassword)
    message.success('重置成功')
    submittedRef.current = true
    handleCancel()
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
      title="重置密码"
      width={480}
      confirmText="重置"
      onOk={handleSubmit}
      onCancel={handleCancel}
      modalProps={{
        okButtonProps: {
          'data-testid': 'system-user-reset-pwd-modal-ok',
        },
        cancelButtonProps: {
          'data-testid': 'system-user-reset-pwd-modal-cancel',
        },
      }}
    >
      <Form<{ newPassword: string }>
        form={form}
        layout="vertical"
        className="pt-4"
      >
        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少 6 位' },
          ]}
        >
          <Input.Password
            data-testid="system-user-reset-pwd-field-new-password"
            placeholder="请输入新密码"
          />
        </Form.Item>
      </Form>
    </FormModal>
  )
}
