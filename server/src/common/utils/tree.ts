/**
 * 通用的平铺列表 → 树构建。
 * 节点必须有 id 和 parentId。parentId 为 NIL_UUID 或找不到父节点视为根。
 */
export interface TreeNode {
  id: string | number;
  parentId: string | number;
  children?: TreeNode[];
  [key: string]: unknown;
}

export function buildTree<T extends TreeNode>(list: T[]): T[] {
  const map = new Map<T["id"], T & { children: T[] }>();
  for (const item of list) {
    map.set(item.id, { ...item, children: [] });
  }
  const roots: (T & { children: T[] })[] = [];
  for (const node of map.values()) {
    const parent = map.get(node.parentId);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // 空 children 收掉，保持输出干净（前端无需判空）
  const trim = (nodes: (T & { children: T[] })[]) => {
    for (const n of nodes) {
      if (n.children.length === 0) {
        delete (n as TreeNode).children;
      } else {
        trim(n.children as (T & { children: T[] })[]);
      }
    }
  };
  trim(roots);
  return roots;
}
