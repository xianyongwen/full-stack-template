import { Button, Modal, type ModalProps } from 'antd'
import type { ReactNode } from 'react'

interface FormModalProps {
  open: boolean
  title: string
  /** 确认 */
  onOk: () => void
  /** 取消/关闭 */
  onCancel: () => void
  /** 弹窗内容，由调用方自行包裹 <Form> 渲染 */
  children: ReactNode
  /** 表单宽度，默认 560 */
  width?: number
  /** 确认按钮文案 */
  confirmText?: string
  /** 额外的 footer 元素，会渲染在默认 Cancel/OK 按钮之前 */
  extraFooter?: ReactNode
  /** 额外的 Modal props */
  modalProps?: Partial<ModalProps>
}

export function FormModal({
  open,
  title,
  onOk,
  onCancel,
  children,
  width = 560,
  confirmText = '确定',
  extraFooter,
  modalProps,
}: FormModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      width={width}
      onCancel={onCancel}
      onOk={onOk}
      okText={confirmText}
      cancelText="取消"
      mask={{ closable: false }}
      footer={
        extraFooter !== undefined ? (
          <div className="flex items-center justify-between w-full">
            <div>{extraFooter}</div>
            <div>
              <Button onClick={onCancel} className="mr-2!">
                取消
              </Button>
              <Button type="primary" onClick={onOk}>
                {confirmText}
              </Button>
            </div>
          </div>
        ) : undefined
      }
      {...modalProps}
    >
      {children}
    </Modal>
  )
}
