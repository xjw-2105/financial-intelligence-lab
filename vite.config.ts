import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  base: './',
  ...(mode === 'pages' && { publicDir: false, build: { assetsDir: '', outDir: 'dist-pages' } }),
  plugins: [react(), tailwindcss()],
}))
