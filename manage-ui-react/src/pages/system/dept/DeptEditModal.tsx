import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import { App, Form, Input, InputNumber, Select, TreeSelect } from 'antd'
import { FormModal } from '@/components/FormModal'
import { deptApi } from '@/api/system'
import { NIL_UUID } from '@/types/system'
import type { DeptVO, CreateDeptDTO } from '@/types/system'

type TreeSelectData = {
  title: string
  value: string
  children?: TreeSelectData[]
}

export interface DeptEditModalRef {
  /** 打开新增/编辑弹窗。新增时可传 parentId；编辑时传 record。resolve(true) 提交成功，resolve(false) 取消 */
  open: (params: { record?: DeptVO; parentId?: string }) => Promise<boolean>
}

interface DeptEditModalProps {
  treeData: TreeSelectData[]
  ref?: Ref<DeptEditModalRef>
}

export function DeptEditModal({ treeData, ref }: DeptEditModalProps) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [record, setRecord] = useState<DeptVO | undefined>()
  const [parentId, setParentId] = useState<string | undefined>()
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const submittedRef = useRef(false)
  const [form] = Form.useForm<CreateDeptDTO>()

  const isEdit = !!record
  const isTopLevel =
    (open && !record && parentId === NIL_UUID) ||
    (!!record?.parentId && record.parentId === NIL_UUID)

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
      await deptApi.update(record.id, values)
      message.success('更新成功')
    } else {
      await deptApi.create(values)
      message.success('创建成功')
    }
    submittedRef.current = true
    handleCancel()
  }

  const initDate = (record?: DeptVO, parentId?: string) => {
    form.setFieldsValue({
      parentId: record?.parentId ?? parentId ?? NIL_UUID,
      deptName: record?.deptName,
      sort: record?.sort ?? 0,
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
      title={isEdit ? '编辑部门' : '新增部门'}
      width={520}
      onOk={handleSubmit}
      onCancel={handleCancel}
      modalProps={{
        okButtonProps: {
          'data-testid': 'system-dept-modal-ok',
        },
        cancelButtonProps: {
          'data-testid': 'system-dept-modal-cancel',
        },
        afterOpenChange: open => {
          if (open) {
            initDate(record, parentId)
          }
        },
      }}
    >
      <Form<CreateDeptDTO> form={form} layout="vertical" className="pt-4">
        {!isTopLevel && (
          <Form.Item
            name="parentId"
            label="上级部门"
            rules={[{ required: true }]}
          >
            <TreeSelect
              data-testid="system-dept-field-parent-id"
              placeholder="请选择上级部门"
              treeData={treeData}
              treeDefaultExpandAll
              allowClear
            />
          </Form.Item>
        )}
        <Form.Item
          name="deptName"
          label="部门名称"
          rules={[{ required: true, message: '请输入部门名称' }]}
        >
          <Input
            data-testid="system-dept-field-dept-name"
            placeholder="请输入部门名称"
          />
        </Form.Item>
        <Form.Item name="sort" label="排序">
          <InputNumber
            data-testid="system-dept-field-sort"
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select
            data-testid="system-dept-field-status"
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
