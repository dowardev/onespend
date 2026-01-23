/// <reference types="vitest" />

import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    // Keep modern JS features (BigInt etc.) available to avoid transpile errors
    target: 'esnext',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          // Agrupa librerías pesadas en chunks separados
          vendor: ['jspdf', 'html2canvas', 'chart.js'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
}));
