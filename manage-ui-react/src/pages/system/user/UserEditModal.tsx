import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import { App, Form, Input, Select, TreeSelect } from 'antd'
import { FormModal } from '@/components/FormModal'
import { userApi } from '@/api/system'
import type { UserVO, CreateUserDTO, RoleVO } from '@/types/system'

type TreeSelectData = {
  title: string
  value: string
  children?: TreeSelectData[]
}

export interface UserEditModalRef {
  /** 打开新增/编辑弹窗，传入 record 为编辑，不传为新增。resolve(true) 提交成功，resolve(false) 取消 */
  open: (record?: UserVO) => Promise<boolean>
}

interface UserEditModalProps {
  roleOptions: RoleVO[]
  deptTreeData: TreeSelectData[]
  ref?: Ref<UserEditModalRef>
}

export function UserEditModal({
  roleOptions,
  deptTreeData,
  ref,
}: UserEditModalProps) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [record, setRecord] = useState<UserVO | undefined>()
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const submittedRef = useRef(false)
  const [form] = Form.useForm<CreateUserDTO & { password?: string }>()

  const isEdit = !!record

  useImperativeHandle(ref, () => ({
    open(record?: UserVO) {
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
      // 编辑：不传 username，password 仅在填写时传
      const { username, password, ...rest } = values
      void username
      const updateData = password ? { ...rest, password } : rest
      await userApi.update(record.id, updateData)
      message.success('更新成功')
    } else {
      await userApi.create(values)
      message.success('创建成功')
    }
    submittedRef.current = true
    handleCancel()
  }

  const initDate = (record?: UserVO) => {
    form &&
      form.setFieldsValue({
        username: record?.username,
        password: '',
        nickname: record?.nickname ?? undefined,
        email: record?.email ?? undefined,
        phone: record?.phone ?? undefined,
        deptId: record?.deptId ?? undefined,
        status: record?.status,
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
      title={isEdit ? '编辑用户' : '新增用户'}
      onOk={handleSubmit}
      onCancel={handleCancel}
      modalProps={{
        okButtonProps: {
          'data-testid': 'system-user-modal-ok',
        },
        cancelButtonProps: {
          'data-testid': 'system-user-modal-cancel',
        },
        afterOpenChange: open => {
          if (open) {
            initDate(record)
          }
        },
      }}
    >
      <Form<CreateUserDTO & { password?: string }>
        form={form}
        layout="vertical"
        className="pt-4"
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, max: 50, message: '3-50 个字符' },
          ]}
        >
          <Input
            data-testid="system-user-field-username"
            placeholder="请输入用户名"
            disabled={isEdit}
          />
        </Form.Item>
        <Form.Item
          name="password"
          label={isEdit ? '新密码（留空不改）' : '密码'}
          rules={
            isEdit
              ? [{ min: 6, message: '密码至少 6 位' }]
              : [
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少 6 位' },
                ]
          }
        >
          <Input.Password
            data-testid="system-user-field-password"
            placeholder={isEdit ? '留空不修改密码' : '请输入密码'}
          />
        </Form.Item>
        <Form.Item name="nickname" label="昵称">
          <Input
            data-testid="system-user-field-nickname"
            placeholder="请输入昵称"
          />
        </Form.Item>
        <Form.Item
          name="email"
          label="邮箱"
          rules={[{ type: 'email', message: '邮箱格式错误' }]}
        >
          <Input
            data-testid="system-user-field-email"
            placeholder="请输入邮箱"
          />
        </Form.Item>
        <Form.Item
          name="phone"
          label="手机号"
          rules={[{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误' }]}
        >
          <Input
            data-testid="system-user-field-phone"
            placeholder="请输入手机号"
          />
        </Form.Item>
        <Form.Item name="deptId" label="部门">
          <TreeSelect
            data-testid="system-user-field-dept-id"
            placeholder="请选择部门"
            allowClear
            treeData={deptTreeData}
            treeDefaultExpandAll
          />
        </Form.Item>
        <Form.Item name="roleIds" label="角色">
          <Select
            data-testid="system-user-field-role-ids"
            mode="multiple"
            placeholder="请选择角色"
            options={roleOptions.map(r => ({ label: r.roleName, value: r.id }))}
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select
            data-testid="system-user-field-status"
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
