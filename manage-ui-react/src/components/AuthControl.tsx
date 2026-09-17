import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth'

interface AuthControlProps {
  /** 需要的权限点 code */
  permission: string
  children: ReactNode
}

/** 权限按钮：基于 permissions 数组控制 children 显隐，超管 permissions=['*'] 始终通过 */
export function AuthControl({ permission, children }: AuthControlProps) {
  const permissions = useAuthStore(s => s.userInfo?.permissions ?? [])
  const hasPermission =
    permissions.includes('*') || permissions.includes(permission)
  if (!hasPermission) return null
  return <>{children}</>
}
