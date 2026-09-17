import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import { App, Form, Input, InputNumber, Select } from 'antd'
import { FormModal } from '@/components/FormModal'
import { dictApi } from '@/api/system'
import type { DictTypeVO, CreateDictTypeDTO } from '@/types/system'

export interface DictTypeEditModalRef {
  /** 打开新增/编辑弹窗，传 record 为编辑，不传为新增。resolve(true) 提交成功，resolve(false) 取消 */
  open: (record?: DictTypeVO) => Promise<boolean>
}

interface DictTypeEditModalProps {
  ref?: Ref<DictTypeEditModalRef>
}

export function DictTypeEditModal({ ref }: DictTypeEditModalProps) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [record, setRecord] = useState<DictTypeVO | undefined>()
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const submittedRef = useRef(false)
  const [form] = Form.useForm<CreateDictTypeDTO>()

  const isEdit = !!record

  useImperativeHandle(ref, () => ({
    open(record?: DictTypeVO) {
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
      const { dictType, ...rest } = values
      void dictType
      await dictApi.updateType(record.id, rest)
      message.success('更新成功')
    } else {
      await dictApi.createType(values)
      message.success('创建成功')
    }
    submittedRef.current = true
    handleCancel()
  }

  const initDate = (record?: DictTypeVO) => {
    form.setFieldsValue({
      dictName: record?.dictName,
      dictType: record?.dictType,
      status: record?.status ?? 1,
      sort: record?.sort ?? 0,
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
      title={isEdit ? '编辑字典类型' : '新增字典类型'}
      onOk={handleSubmit}
      onCancel={handleCancel}
      modalProps={{
        okButtonProps: {
          'data-testid': 'system-dict-modal-ok',
        },
        cancelButtonProps: {
          'data-testid': 'system-dict-modal-cancel',
        },
        afterOpenChange: open => {
          if (open) {
            initDate(record)
          }
        },
      }}
    >
      <Form<CreateDictTypeDTO> form={form} layout="vertical" className="pt-4">
        <Form.Item
          name="dictName"
          label="字典名称"
          rules={[{ required: true, message: '请输入字典名称' }]}
        >
          <Input
            data-testid="system-dict-field-dict-name"
            placeholder="请输入字典名称"
          />
        </Form.Item>
        <Form.Item
          name="dictType"
          label="字典类型"
          rules={[
            { required: true, message: '请输入字典类型' },
            {
              pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
              message: '字母开头，仅字母数字下划线',
            },
          ]}
        >
          <Input
            data-testid="system-dict-field-dict-type"
            placeholder="如 sys_user_sex"
            disabled={isEdit}
          />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select
            data-testid="system-dict-field-status"
            options={[
              { label: '正常', value: 1 },
              { label: '停用', value: 0 },
            ]}
          />
        </Form.Item>
        <Form.Item name="sort" label="排序">
          <InputNumber
            data-testid="system-dict-field-sort"
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea
            data-testid="system-dict-field-remark"
            placeholder="请输入备注"
            rows={2}
            maxLength={255}
          />
        </Form.Item>
      </Form>
    </FormModal>
  )
}
