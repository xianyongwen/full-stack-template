import type { SysDept } from "@/generated/prisma/client";
import { buildTree, type TreeNode } from "@/common/utils/tree";

/** 部门 VO（前端展示用，去掉 deleted） */
export interface DeptVO {
  id: string;
  parentId: string;
  deptName: string;
  sort: number;
  status: number;
  createTime: string;
  children?: DeptVO[];
}

/** 平铺部门 → 部门树 */
export function toDeptTree(list: SysDept[]): DeptVO[] {
  const nodes: (DeptVO & TreeNode)[] = list.map((d) => ({
    id: d.id,
    parentId: d.parentId,
    deptName: d.deptName,
    sort: d.sort,
    status: d.status,
    createTime: d.createTime.toISOString(),
    children: [],
  }));
  return buildTree(nodes) as DeptVO[];
}
