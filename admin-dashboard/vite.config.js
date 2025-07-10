import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    // Remove proxy since we're using direct backend URL
    // This avoids CORS issues and connection problems
  },
  build: {
    outDir: 'build'
  }
})