import { Outlet, useNavigation, useNavigate, useLocation } from 'react-router'
import {
  Menu,
  Dropdown,
  Spin,
  Avatar,
  ConfigProvider,
  type MenuProps,
} from 'antd'
import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/auth'
import { menuToItems } from '@/lib/menu'
import { logoutApi } from '@/api/auth'

export default function AdminLayout() {
  const navigation = useNavigation()
  const navigate = useNavigate()
  const location = useLocation()

  const userInfo = useAuthStore(s => s.userInfo)
  const clear = useAuthStore(s => s.clear)

  const loading = navigation.state !== 'idle'

  // 从 store 中的菜单树生成 antd Menu items
  const menuItems: MenuProps['items'] = userInfo?.menus?.length
    ? menuToItems(userInfo.menus)
    : []

  // 当前选中的菜单项
  const selectedKey = location.pathname

  // 面包屑
  // const breadcrumbTitle = BREADCRUMB_MAP[location.pathname] ?? '页面'

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
      // 忽略，前端丢弃即可
    }
    clear()
    navigate('/login', { replace: true })
  }

  const userMenu: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  return (
    <div className="flex h-screen w-screen admin-layout">
      <div className="relative h-full w-[230px] shrink-0 flex flex-col z-1 rounded-r-[30px] backdrop-blur-[26px] shadow-(--shadow-md) bg-(--menu-panel-bg) overflow-hidden">
        {/* Logo */}
        <div className="flex shrink-0 h-20 gap-4 justify-center items-center px-1 overflow-hidden bg-(--menu-panel-bg)">
          <div className="w-[32px] h-[32px] rounded-[10px] bg-[#7C3AED] flex items-center justify-center text-white font-bold">
            M
          </div>
          <span className='text-[24px] font-bold'>
            后台管理
          </span>
        </div>

        <ConfigProvider
          theme={{
            components: {
              Menu: {
                itemBg: 'transparent',
                itemHoverBg: 'rgba(109,93,246,.08)',
                itemSelectedColor: '#fff',
                subMenuItemBg: 'transparent',
                itemHeight: '60px',
                iconSize: 18,
                fontSize: 16,
              },
            },
          }}
        >
          <div className="flex-1 flex flex-col overflow-auto bg-(--menu-panel-bg) [scrollbar-color:transparent_transparent] hover:[scrollbar-color:var(--theme-scrollbar-thumb)_transparent]">
            <Menu
              theme="light"
              mode="inline"
              selectedKeys={[selectedKey]}
              defaultOpenKeys={['/system']}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              className="shrink-0 border-none! layout-menu"
            />
          </div>
        </ConfigProvider>
        <div className="h-[70px] flex items-center pl-[28px] pr-[10px] bg-(--menu-panel-bg)">
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <div className="flex cursor-pointer items-center gap-2">
              <Avatar
                size={32}
                icon={<UserOutlined />}
                style={{ background: '#7C3AED' }}
              />
              <span className="text-sm text-gray-700">
                {userInfo?.nickname ?? userInfo?.username ?? '用户'}
              </span>
            </div>
          </Dropdown>
        </div>
      </div>

      <div className="flex flex-1 z-1 overflow-hidden">
        {loading && (
          <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-2">
            <Spin size="small" />
          </div>
        )}
        <Outlet />
      </div>
    </div>
  )
}
