import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import zhCN from 'antd/locale/zh_CN'
import './index.css'
import './styles/layout.scss'
import './styles/prettyBtn.scss'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StyleProvider layer>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#6C5AF8',
          colorInfo: '#6C5AF8',
          colorText: '#333333',
          borderRadius: 20,
        },
        components: {
          Menu: {
            itemBg: 'var(--menu-panel-bg)',
            subMenuItemBg: '#150721',
            itemSelectedBg: 'transparent',
          },
          Table: {
            headerBg: 'transparent',
            headerColor: '#fff',
            headerSplitColor: 'transparent',
          },
        },
      }}
    >
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  </StyleProvider>
)
