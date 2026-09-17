import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { TOKEN_KEY } from '@/lib/request'
import type { MenuTreeNode } from '@/types/system'

/** GET /auth/userinfo 返回的用户信息 */
export interface UserInfo {
  id: string
  username: string
  nickname: string | null
  deptId?: string
  roles: string[]
  permissions: string[]
  menus: MenuTreeNode[]
}

interface AuthState {
  token: string | null
  userInfo: UserInfo | null
  setToken: (token: string) => void
  setUserInfo: (info: UserInfo | null) => void
  logout: () => void
  /** 清除全部状态（token + userInfo），用于退出登录 */
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    set => ({
      token: localStorage.getItem(TOKEN_KEY),
      userInfo: null,
      setToken: token => {
        localStorage.setItem(TOKEN_KEY, token)
        set({ token })
      },
      setUserInfo: userInfo => set({ userInfo }),
      logout: () => {
        localStorage.removeItem(TOKEN_KEY)
        set({ token: null, userInfo: null })
      },
      clear: () => {
        localStorage.removeItem(TOKEN_KEY)
        set({ token: null, userInfo: null })
      },
    }),
    { name: 'AuthStore' }
  )
)
