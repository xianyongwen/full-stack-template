/** 系统内置角色 code */
export const ROLE_CODES = {
  /** 超级管理员，跳过所有权限校验 */
  SUPER_ADMIN: "super_admin",
} as const;

/** 数据权限范围 */
export const DATA_SCOPE = {
  ALL: 1, // 全部
  CUSTOM: 2, // 自定义
  DEPT: 3, // 本部门
  DEPT_AND_BELOW: 4, // 本部门及以下
  SELF: 5, // 仅本人
} as const;

/** 通用状态：1-正常，0-停用 */
export const STATUS = {
  ENABLED: 1,
  DISABLED: 0,
} as const;

/** 是否逻辑删除：0-未删，1-已删 */
export const DELETED = {
  NO: 0,
  YES: 1,
} as const;

/** 菜单/权限类型 */
export const PERM_TYPE = {
  DIRECTORY: 1, // 目录
  MENU: 2, // 菜单
  BUTTON: 3, // 按钮 / 操作
  API: 4, // API 接口
} as const;

/** UUID 空值常量（对应 PostgreSQL 的 nil UUID），用于 parentId 等表示"无父级" */
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";
