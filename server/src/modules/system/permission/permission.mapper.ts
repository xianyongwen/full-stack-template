import type { SysPermission } from "@/generated/prisma/client";
import { buildTree, type TreeNode } from "@/common/utils/tree";

export interface PermissionVO {
  id: string;
  parentId: string;
  permName: string;
  permCode: string | null;
  type: number;
  code: string | null;
  component: string | null;
  icon: string | null;
  apiUrl: string | null;
  apiMethod: string | null;
  sort: number;
  visible: number;
  status: number;
  createTime: string;
  children?: PermissionVO[];
}

/** 平铺权限 → 权限树 */
export function toPermissionTree(list: SysPermission[]): PermissionVO[] {
  const nodes: (PermissionVO & TreeNode)[] = list.map((p) => ({
    id: p.id,
    parentId: p.parentId,
    permName: p.permName,
    permCode: p.permCode,
    type: p.type,
    code: p.code,
    component: p.component,
    icon: p.icon,
    apiUrl: p.apiUrl,
    apiMethod: p.apiMethod,
    sort: p.sort,
    visible: p.visible,
    status: p.status,
    createTime: p.createTime.toISOString(),
    children: [],
  }));
  return buildTree(nodes) as PermissionVO[];
}
