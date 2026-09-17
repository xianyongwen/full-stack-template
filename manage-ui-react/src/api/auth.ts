import { http } from '@/lib/request'
import type { UserInfo } from '@/stores/auth'

export interface LoginParams {
  username: string
  password: string
}

/** POST /auth/login 响应 */
export interface LoginResult {
  token: string
  userId: string
  username: string
  nickname: string | null
}

export const loginApi = (data: LoginParams) =>
  http.post<LoginResult>('/auth/login', data)

export const getUserInfoApi = () => http.get<UserInfo>('/auth/userinfo')

export const logoutApi = () => http.post<null>('/auth/logout')
