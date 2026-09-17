import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const port = Number(env.VITE_PORT) || 8090
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8890'

  return {
    plugins: [react(), svgr(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port,
      proxy: {
        // 开发环境把 /api 请求代理到本地后端
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
