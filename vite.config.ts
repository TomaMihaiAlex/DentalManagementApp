import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    proxy: {
      // Proxy API requests in development to the local export server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    // allow common ngrok host patterns and opt-in to allow all hosts via env
    allowedHosts: [
      '.ngrok.io',
      '.ngrok-free.dev',
    ],
    hmr: {
      protocol: 'wss',
      // host will be replaced at runtime by the client connecting through ngrok
      // clientPort 443 ensures secure websocket via ngrok
      clientPort: 443,
    }
  }
})
