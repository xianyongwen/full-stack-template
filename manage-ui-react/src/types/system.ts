/** 菜单/权限类型：1=目录, 2=菜单, 3=按钮, 4=API */
export const PERM_TYPE = {
  DIRECTORY: 1,
  MENU: 2,
  BUTTON: 3,
  API: 4,
} as const

/** 数据权限范围：1=全部, 2=自定义, 3=本部门, 4=本部门及以下, 5=仅本人 */
export const DATA_SCOPE = {
  ALL: 1,
  CUSTOM: 2,
  DEPT: 3,
  DEPT_AND_BELOW: 4,
  SELF: 5,
} as const

/** 通用状态：1=正常, 0=停用 */
export const STATUS = {
  ENABLED: 1,
  DISABLED: 0,
} as const

/** NIL UUID，表示"无父级" */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000'

/** GET /auth/userinfo 返回的菜单树节点 */
export interface MenuTreeNode {
  id: string
  parentId: string
  permName: string
  permCode: string | null
  type: number
  path: string | null
  component: string | null
  icon: string | null
  sort: number
  children?: MenuTreeNode[]
}

/** 用户 VO */
export interface UserVO {
  id: string
  username: string
  nickname: string | null
  email: string | null
  phone: string | null
  deptId: string | null
  deptName: string | null
  status: number
  createTime: string
  roles?: { id: string; roleName: string; roleCode: string }[]
  roleIds?: string[]
}

export interface CreateUserDTO {
  username: string
  password: string
  nickname?: string
  email?: string
  phone?: string
  deptId?: string
  status: number
  roleIds: string[]
}

export type UpdateUserDTO = Partial<
  Omit<CreateUserDTO, 'username' | 'password'>
> & {
  password?: string
}

export interface UserListQuery {
  username?: string
  nickname?: string
  phone?: string
  status?: number
  deptId?: string
}

/** 角色 VO */
export interface RoleVO {
  id: string
  roleName: string
  roleCode: string
  dataScope: number
  sort: number
  status: number
  createTime: string
  remark?: string
  permissionIds?: string[]
}

export interface CreateRoleDTO {
  roleName: string
  roleCode: string
  dataScope: number
  sort: number
  status: number
  remark?: string
}

export type UpdateRoleDTO = Partial<Omit<CreateRoleDTO, 'roleCode'>>

export interface RoleListQuery {
  roleName?: string
  roleCode?: string
  status?: number
}

/** 菜单/权限 VO */
export interface PermissionVO {
  id: string
  parentId: string
  permName: string
  permCode: string | null
  type: number
  code: string | null
  component: string | null
  icon: string | null
  apiUrl: string | null
  apiMethod: string | null
  sort: number
  visible: number
  status: number
  createTime: string
  children?: PermissionVO[]
}

export interface CreatePermissionDTO {
  parentId: string
  permName: string
  permCode?: string
  type: number
  code?: string
  component?: string
  icon?: string
  apiUrl?: string
  apiMethod?: string
  sort: number
  visible: number
  status: number
}

export type UpdatePermissionDTO = Partial<CreatePermissionDTO>

/** 部门 VO */
export interface DeptVO {
  id: string
  parentId: string
  deptName: string
  sort: number
  status: number
  createTime: string
  children?: DeptVO[]
}

export interface CreateDeptDTO {
  parentId: string
  deptName: string
  sort: number
  status: number
}

export type UpdateDeptDTO = Partial<CreateDeptDTO>

/** 字典类型 VO */
export interface DictTypeVO {
  id: string
  dictName: string
  dictType: string
  status: number
  sort: number
  remark: string | null
  createTime: string
}

export interface CreateDictTypeDTO {
  dictName: string
  dictType: string
  status: number
  sort: number
  remark?: string
}

export type UpdateDictTypeDTO = Partial<Omit<CreateDictTypeDTO, 'dictType'>>

export interface DictTypeListQuery {
  dictName?: string
  dictType?: string
  status?: number
}

/** 字典数据 VO */
export interface DictDataVO {
  id: string
  dictType: string
  dictLabel: string
  dictValue: string
  cssClass: string | null
  isDefault: number
  sort: number
  status: number
  remark: string | null
  createTime: string
}

export interface CreateDictDataDTO {
  dictType: string
  dictLabel: string
  dictValue: string
  cssClass?: string
  isDefault: number
  sort: number
  status: number
  remark?: string
}

export type UpdateDictDataDTO = Partial<CreateDictDataDTO>

export interface DictDataListQuery {
  dictType: string
  dictLabel?: string
  status?: number
}
