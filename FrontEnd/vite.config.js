import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    watch: {
      usePolling: true, // Required for Windows Docker to detect changes
    },
    hmr: {
      clientPort: 24678,
    },
    proxy: {
      '/api': {
        target: 'http://laravel-backend',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/uploads': {
        target: 'http://laravel-backend',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
