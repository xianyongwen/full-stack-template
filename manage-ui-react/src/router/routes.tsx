import { Navigate, redirect, type RouteObject } from 'react-router'
import { TOKEN_KEY } from '@/lib/request'
import { useAuthStore } from '@/stores/auth'
import { getUserInfoApi } from '@/api/auth'

/**
 * AdminLayout 路由守卫 loader：
 * - 无 token → redirect /login
 * - 有 token 但 userInfo 未加载 → 调 getUserInfoApi 拉取并写入 store
 * - 失败则清除 token 并重定向
 */
async function adminLoader(): Promise<Response | null> {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return redirect('/login')

  const { userInfo, setUserInfo } = useAuthStore.getState()
  if (!userInfo) {
    try {
      const info = await getUserInfoApi()
      setUserInfo(info)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      return redirect('/login')
    }
  }
  return null
}

/**
 * 路由配置表（React Router Data Mode）
 * - /login：独立登录页（无布局）
 * - /：AdminLayout（loader 鉴权）+ 子路由
 */
export const routeObjects: RouteObject[] = [
  {
    path: '/login',
    lazy: () =>
      import('@/pages/Login/index').then(m => ({ Component: m.default })),
  },
  {
    path: '/',
    lazy: () =>
      import('@/layouts/AdminLayout').then(m => ({ Component: m.default })),
    loader: adminLoader,
    children: [
      {
        index: true,
        lazy: () =>
          import('@/pages/Dashboard').then(m => ({ Component: m.default })),
      },
      {
        path: 'system/user',
        lazy: () =>
          import('@/pages/system/user/UserManage').then(m => ({
            Component: m.default,
          })),
      },
      {
        path: 'system/role',
        lazy: () =>
          import('@/pages/system/role/RoleManage').then(m => ({
            Component: m.default,
          })),
      },
      {
        path: 'system/menu',
        lazy: () =>
          import('@/pages/system/menu/MenuManage').then(m => ({
            Component: m.default,
          })),
      },
      {
        path: 'system/dept',
        lazy: () =>
          import('@/pages/system/dept/DeptManage').then(m => ({
            Component: m.default,
          })),
      },
      {
        path: 'system/dict',
        lazy: () =>
          import('@/pages/system/dict/DictTypeManage').then(m => ({
            Component: m.default,
          })),
      },
      // 兜底：未匹配重定向到首页
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
