import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173, // Change port to match CORS allowed origin
    proxy: {
      // Proxy all model requests to avoid CORS issues
      '/models/': {
        target: 'https://paddlejs.bj.bcebos.com',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
