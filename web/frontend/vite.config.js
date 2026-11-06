import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 构建产物直接输出到 Go embed 的 web/templates 目录
// index.html 由 gin 在 / 路由返回, 静态资源走 /static
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    outDir: '../templates',
    emptyOutDir: true,
    assetsDir: 'static',
  },
  server: {
    port: 5173,
    // 本地开发时把 API 代理到真实后端, 例如 VITE_API_TARGET=http://1.2.3.4:81 npm run dev
    proxy: process.env.VITE_API_TARGET
      ? {
          '/auth': process.env.VITE_API_TARGET,
          '/trojan': { target: process.env.VITE_API_TARGET, ws: true },
          '/common': process.env.VITE_API_TARGET,
        }
      : undefined,
  },
})
