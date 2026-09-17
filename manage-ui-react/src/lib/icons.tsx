import type { ReactNode } from 'react'
import {
  AppstoreOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  FileTextOutlined,
  FolderOutlined,
  RobotOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  HomeOutlined,
  ClusterOutlined,
  SafetyOutlined,
  BarsOutlined,
  PartitionOutlined,
  BookOutlined,
  ContactsOutlined,
} from '@ant-design/icons'

/** 图标名称 → antd Icon 组件映射表 */
const iconMap: Record<string, ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  UserOutlined: <UserOutlined />,
  TeamOutlined: <TeamOutlined />,
  SettingOutlined: <SettingOutlined />,
  HomeOutlined: <HomeOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  FolderOutlined: <FolderOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  ClusterOutlined: <ClusterOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  BarsOutlined: <BarsOutlined />,
  PartitionOutlined: <PartitionOutlined />,
  DeploymentUnitOutlined: <DeploymentUnitOutlined />,
  BookOutlined: <BookOutlined />,
  ContactsOutlined: <ContactsOutlined />,
  RobotOutlined: <RobotOutlined />,
}

/** 根据图标内容返回对应 Icon 组件，支持 SVG 代码或图标名称 */
export function getIcon(name: string | null | undefined): ReactNode {
  if (!name) return null
  // 如果是 SVG 代码，直接渲染
  if (name.includes('<svg')) {
    return (
      <span className="svg-icon" dangerouslySetInnerHTML={{ __html: name }} />
    )
  }
  // 否则尝试从图标映射表中查找
  return iconMap[name] ?? null
}
