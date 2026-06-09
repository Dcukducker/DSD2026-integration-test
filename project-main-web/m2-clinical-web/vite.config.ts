import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 本地开发用 `/`，避免必须访问 `/project-main-web/`；生产构建仍为 GitHub Pages 路径。
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/project-main-web/' : '/',
  plugins: [react()],
}))
