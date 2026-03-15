import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/chat': 'http://localhost:8000',
      '/ingest': 'http://localhost:8000',
      '/sources': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/analytics': 'http://localhost:8000',
      '/study': 'http://localhost:8000',
      '/digest': 'http://localhost:8000',
    }
  }
})