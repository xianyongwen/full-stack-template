import type { MenuProps } from 'antd'
import type { MenuTreeNode } from '@/types/system'
import { PERM_TYPE } from '@/types/system'
import { getIcon } from './icons'

/** MenuTreeNode[] → antd MenuProps['items'] 递归转换 */
export function menuToItems(menus: MenuTreeNode[]): MenuProps['items'] {
  return menus.map(node => {
    const children = node.children?.length
      ? menuToItems(node.children)
      : undefined

    // 目录节点（type=1）：有子菜单时渲染为 SubMenu
    if (node.type === PERM_TYPE.DIRECTORY) {
      return {
        key: node.path ?? node.id,
        icon: getIcon(node.icon),
        label: node.permName,
        children: children ?? [],
      }
    }

    // 菜单节点（type=2）：渲染为可点击 Item
    return {
      key: node.path ?? node.id,
      icon: getIcon(node.icon),
      label: node.permName,
      children: undefined,
    }
  })
}

/** 从菜单树中收集所有叶子节点（type=2）的 path，用于默认选中 */
export function findLeafPath(menus: MenuTreeNode[]): string | undefined {
  for (const node of menus) {
    if (node.type === PERM_TYPE.MENU && node.path) return node.path
    if (node.children?.length) {
      const found = findLeafPath(node.children)
      if (found) return found
    }
  }
  return undefined
}
