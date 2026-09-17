import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { message } from 'antd'

/** localStorage 中保存 token 的 key（与 zustand store 共用） */
export const TOKEN_KEY = 'manage_token'

/** 后端统一响应包：{ code, message, data } */
export interface ApiResult<T = unknown> {
  code: string
  message: string
  data: T
}

const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
})

// ── 请求拦截器：注入 token ──
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// ── 响应拦截器：解包 + 统一错误 ──
request.interceptors.response.use(
  (response: AxiosResponse<ApiResult>) => {
    // blob / arraybuffer 响应直接返回，不做 ApiResult 解包
    if (
      response.config.responseType === 'blob' ||
      response.config.responseType === 'arraybuffer'
    ) {
      return response
    }
    const result = response.data
    // 业务约定 code === 'ok' 视为成功
    if (result.code === 'ok') {
      return result.data as unknown as AxiosResponse
    }
    message.error(result.message || '请求失败')
    return Promise.reject(new Error(result.message || '请求失败'))
  },
  error => {
    const status = error?.response?.status
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      message.error('登录已过期，请重新登录')
      // 避免在登录页重复跳转
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    } else {
      message.error(
        error?.response?.data?.message || error.message || '网络异常'
      )
    }
    return Promise.reject(error)
  }
)

/** 业务层调用得到的是已解包的 data */
export const http = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    request.get<unknown, T>(url, config),
  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ) => request.post<unknown, T>(url, data, config),
  put: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ) => request.put<unknown, T>(url, data, config),
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    request.delete<unknown, T>(url, config),
}

export default request
