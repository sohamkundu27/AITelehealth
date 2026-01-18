import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/getToken': 'http://localhost:3001',
      '/upload-pdf': 'http://localhost:3001',
      '/check-interactions': 'http://localhost:3001',
      '/post-visit-safety-check': 'http://localhost:3001',
      '/visit-summary': 'http://localhost:3001',
      '/summarize-transcript': 'http://localhost:3001',
      '/api': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
    },
  },
})
