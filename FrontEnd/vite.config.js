import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const hmrHost = process.env.VITE_HMR_HOST || 'localhost'
const hmrPort = Number(process.env.VITE_HMR_PORT || 24678)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    watch: {
      usePolling: true, // Required for Windows Docker to detect changes
      interval: 300,
    },
    hmr: {
      host: hmrHost,
      port: hmrPort,
      clientPort: hmrPort,
    },
  },
})
