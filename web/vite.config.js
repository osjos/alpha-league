import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: 'all',
    strictPort: true,
    hmr: {
      port: 5000
    },
    origin: 'http://localhost:5000'
  }
})
