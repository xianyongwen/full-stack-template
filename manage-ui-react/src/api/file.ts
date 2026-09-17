import { http } from '@/lib/request'

export const fileApi = {
  /**
   * 代理上传文件到 MinIO（POST /uploads/proxy），返回 fileId
   */
  uploadProxy: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<{ fileId: string }>('/uploads/proxy', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** 文件下载链接（GET /files/:id，后端 30x 重定向到 MinIO 预签名 URL） */
  downloadUrl: (fileId: string) =>
    `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/files/${fileId}`,

  /** 批量获取文件预签名链接（POST /files/batch，返回 { [fileId]: url }） */
  batchUrls: (ids: string[]) =>
    http.post<Record<string, string>>('/files/batch', { ids }),
}
