import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/** The running shop container. Previews read its real catalogue through this. */
const API_TARGET = process.env.API_TARGET || 'http://localhost:8470'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 5290,
    // The shop server sends no CORS headers, so the previews must look
    // same-origin. Proxying keeps them on real data instead of a fixture.
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/shop': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
    },
  },
})
