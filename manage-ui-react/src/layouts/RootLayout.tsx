import { Outlet, useNavigation } from 'react-router'
import { Spin } from 'antd'

/**
 * 根布局：作为所有页面的外层。
 * - 通过 <Outlet/> 渲染匹配到的子路由
 * - 用 useNavigation() 感知路由切换/loading 态，提供轻量加载反馈
 */
export default function RootLayout() {
  const navigation = useNavigation()
  const loading = navigation.state !== 'idle'

  return (
    <div className="relative min-h-screen">
      {/* 顶部加载指示：路由 lazy 加载 / loader 执行期间显示 */}
      {loading && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-2">
          <Spin size="small" />
        </div>
      )}
      <Outlet />
    </div>
  )
}
