import { memoize } from 'lodash-es'
import { http } from '@/lib/request'
import type { PageResult } from '@/types/common'
import type {
  CreateUserDTO,
  DeptVO,
  DictDataListQuery,
  DictDataVO,
  DictTypeListQuery,
  DictTypeVO,
  PermissionVO,
  RoleListQuery,
  RoleVO,
  UpdateDeptDTO,
  UpdateDictDataDTO,
  UpdateDictTypeDTO,
  UpdatePermissionDTO,
  UpdateRoleDTO,
  UpdateUserDTO,
  UserListQuery,
  UserVO,
  CreateRoleDTO,
  CreatePermissionDTO,
  CreateDeptDTO,
  CreateDictDataDTO,
  CreateDictTypeDTO,
} from '@/types/system'

// ── 用户管理 ──

export const userApi = {
  list: (params: UserListQuery & { page: number; pageSize: number }) =>
    http.get<PageResult<UserVO>>('/user', { params }),
  detail: (id: string) => http.get<UserVO>(`/user/${id}`),
  create: (data: CreateUserDTO) => http.post<UserVO>('/user', data),
  update: (id: string, data: UpdateUserDTO) =>
    http.put<UserVO>(`/user/${id}`, data),
  remove: (id: string) => http.delete<null>(`/user/${id}`),
  assignRoles: (id: string, roleIds: string[]) =>
    http.put<null>(`/user/${id}/roles`, { roleIds }),
  resetPassword: (id: string, newPassword: string) =>
    http.put<null>(`/user/${id}/password`, { newPassword }),
  updateStatus: (id: string, status: number) =>
    http.put<null>(`/user/${id}/status`, { status }),
  /** 用户下拉 */
  options: () => http.get<Array<{ id: string; name: string }>>('/user/options'),
}

// ── 角色管理 ──

export const roleApi = {
  list: (params: RoleListQuery & { page: number; pageSize: number }) =>
    http.get<PageResult<RoleVO>>('/role', { params }),
  options: () => http.get<RoleVO[]>('/role/options'),
  detail: (id: string) => http.get<RoleVO>(`/role/${id}`),
  create: (data: CreateRoleDTO) => http.post<RoleVO>('/role', data),
  update: (id: string, data: UpdateRoleDTO) =>
    http.put<RoleVO>(`/role/${id}`, data),
  remove: (id: string) => http.delete<null>(`/role/${id}`),
  assignPermissions: (id: string, permissionIds: string[]) =>
    http.put<null>(`/role/${id}/permissions`, { permissionIds }),
}

// ── 菜单/权限管理 ──

export const menuApi = {
  tree: () => http.get<PermissionVO[]>('/menu/tree'),
  detail: (id: string) => http.get<PermissionVO>(`/menu/${id}`),
  create: (data: CreatePermissionDTO) => http.post<PermissionVO>('/menu', data),
  update: (id: string, data: UpdatePermissionDTO) =>
    http.put<PermissionVO>(`/menu/${id}`, data),
  remove: (id: string) => http.delete<null>(`/menu/${id}`),
}

// ── 部门管理 ──

export const deptApi = {
  tree: (params?: { deptName?: string; status?: number }) =>
    http.get<DeptVO[]>('/dept/tree', { params }),
  detail: (id: string) => http.get<DeptVO>(`/dept/${id}`),
  create: (data: CreateDeptDTO) => http.post<DeptVO>('/dept', data),
  update: (id: string, data: UpdateDeptDTO) =>
    http.put<DeptVO>(`/dept/${id}`, data),
  remove: (id: string) => http.delete<null>(`/dept/${id}`),
}

// ── 字典管理 ──

export const dictApi = {
  // 字典类型
  typeList: (params: DictTypeListQuery & { page: number; pageSize: number }) =>
    http.get<PageResult<DictTypeVO>>('/dict/type', { params }),
  typeOptions: () => http.get<DictTypeVO[]>('/dict/type/options'),
  typeDetail: (id: string) => http.get<DictTypeVO>(`/dict/type/${id}`),
  createType: (data: CreateDictTypeDTO) =>
    http.post<DictTypeVO>('/dict/type', data),
  updateType: (id: string, data: UpdateDictTypeDTO) =>
    http.put<DictTypeVO>(`/dict/type/${id}`, data),
  removeType: (id: string) => http.delete<null>(`/dict/type/${id}`),

  // 字典数据
  dataList: (params: DictDataListQuery) =>
    http.get<DictDataVO[]>('/dict/data', { params }),
  /**
   * 字典数据（带缓存版本）
   * 按 dictType 进行 memoize 缓存，适合只需读取字典选项的场景。
   * 字典管理模块本身应继续使用 dataList 以获取实时数据；
   * 当字典数据发生增删改时，应调用 dataListCache.cache.clear() 清除缓存。
   */
  dataListCache: memoize(
    (params: DictDataListQuery) =>
      http.get<DictDataVO[]>('/dict/data', { params }),
    params => params.dictType
  ),
  dataDetail: (id: string) => http.get<DictDataVO>(`/dict/data/${id}`),
  createData: (data: CreateDictDataDTO) =>
    http.post<DictDataVO>('/dict/data', data),
  updateData: (id: string, data: UpdateDictDataDTO) =>
    http.put<DictDataVO>(`/dict/data/${id}`, data),
  removeData: (id: string) => http.delete<null>(`/dict/data/${id}`),
}
