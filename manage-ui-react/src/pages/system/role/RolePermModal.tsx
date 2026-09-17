import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import { App, Tree } from 'antd'
import { FormModal } from '@/components/FormModal'
import { menuApi, roleApi } from '@/api/system'
import type { PermissionVO, RoleVO } from '@/types/system'

export interface RolePermModalRef {
  /** 打开分配权限弹窗，内部加载权限树与角色当前权限。resolve(true) 提交成功，resolve(false) 取消 */
  open: (record: RoleVO) => Promise<boolean>
}

interface RolePermModalProps {
  ref?: Ref<RolePermModalRef>
}

export function RolePermModal({ ref }: RolePermModalProps) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [record, setRecord] = useState<RoleVO | undefined>()
  const [permTree, setPermTree] = useState<PermissionVO[]>([])
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const permTreeRef = useRef<PermissionVO[] | null>(null)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const submittedRef = useRef(false)

  useImperativeHandle(ref, () => ({
    async open(record: RoleVO) {
      setRecord(record)
      setCheckedKeys([])
      setOpen(true)
      setLoading(true)
      // 加载权限树（缓存，仅加载一次）
      if (!permTreeRef.current) {
        try {
          const tree = await menuApi.tree()
          permTreeRef.current = tree
          setPermTree(tree)
        } catch {
          // ignore
        }
      } else {
        setPermTree(permTreeRef.current)
      }
      // 加载角色当前权限
      try {
        const detail = await roleApi.detail(record.id)
        setCheckedKeys(detail.permissionIds ?? [])
      } catch {
        setCheckedKeys([])
      } finally {
        setLoading(false)
      }
      return new Promise<boolean>(resolve => {
        resolverRef.current = resolve
      })
    },
  }))

  const handleSubmit = async () => {
    if (!record) return
    await roleApi.assignPermissions(record.id, checkedKeys)
    message.success('分配成功')
    submittedRef.current = true
    handleCancel()
  }

  const handleCancel = () => {
    const ok = submittedRef.current
    submittedRef.current = false
    setOpen(false)
    setRecord(undefined)
    setCheckedKeys([])
    resolverRef.current?.(ok)
    resolverRef.current = null
  }

  return (
    <FormModal
      open={open}
      title="分配权限"
      width={520}
      confirmText="分配"
      onOk={handleSubmit}
      onCancel={handleCancel}
      modalProps={{
        okButtonProps: {
          'data-testid': 'system-role-perm-modal-ok',
        },
        cancelButtonProps: {
          'data-testid': 'system-role-perm-modal-cancel',
        },
        confirmLoading: loading,
      }}
    >
      <div className="max-h-[400px] overflow-auto">
        <Tree
          data-testid="system-role-perm-tree"
          checkable
          defaultExpandAll
          treeData={toTreeData(permTree)}
          checkedKeys={checkedKeys}
          onCheck={keys => setCheckedKeys(keys as string[])}
        />
      </div>
    </FormModal>
  )
}

type TreeNodeData = { title: string; key: string; children?: TreeNodeData[] }

function toTreeData(nodes: PermissionVO[]): TreeNodeData[] {
  return nodes.map(n => ({
    title: n.permName,
    key: n.id,
    children: n.children?.length ? toTreeData(n.children) : undefined,
  }))
}
