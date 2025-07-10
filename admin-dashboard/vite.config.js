import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://144.21.63.195:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'build'
  }
})