import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: false,
  },
})
