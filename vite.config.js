import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/line-background-remover/',
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        spec: './spec.html'
      }
    }
  }
})
