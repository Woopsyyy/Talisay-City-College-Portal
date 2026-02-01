import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow network access
    proxy: {
      '/api': {
        target: 'http://localhost/TCC%20(react%20+%20mysql%20+%20php)/BackEnd',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // Keep /api as is
      },
      '/Database': {
        target: 'http://localhost/TCC%20(react%20+%20mysql%20+%20php)/BackEnd',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // Keep /Database as is
      },
    },
  },
})
