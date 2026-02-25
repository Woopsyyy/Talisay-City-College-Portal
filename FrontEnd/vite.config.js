import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const hmrHost = process.env.VITE_HMR_HOST || 'localhost'
const hmrPort = Number(process.env.VITE_HMR_PORT || 24678)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      services: fileURLToPath(new URL('./src/services', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }

          if (id.includes('/@supabase/')) return 'vendor-supabase';
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-charts';
          if (id.includes('/styled-components/')) return 'vendor-styled';
          if (id.includes('/lucide-react/')) return 'vendor-icons';

          return 'vendor-misc';
        },
      },
    },
  },
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
