import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'monaco': ['@monaco-editor/react', 'monaco-editor'],
          'ui-vendor': ['lucide-react', 'react-resizable-panels'],
          'syntax-highlight': ['react-syntax-highlighter'],
          'yjs': ['yjs', 'y-monaco'],
        },
      },
    },
    // Increase chunk size warning limit since we have code splitting
    chunkSizeWarningLimit: 1000,
  },
})
