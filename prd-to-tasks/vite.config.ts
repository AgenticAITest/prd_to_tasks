import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Proxy Neon API requests
      '/proxy/neon': {
        target: 'https://console.neon.tech',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/neon/, '/api/v2'),
        secure: true,
      },
      // Proxy GitHub API requests
      '/proxy/github': {
        target: 'https://api.github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/github/, ''),
        secure: true,
      },
    },
  },
})
