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
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core Vue and framework libraries
          vendor: ['vue', 'vue-router', 'pinia', '@ionic/vue', '@ionic/core'],
          // Chart libraries - separate for better caching
          charts: ['chart.js', 'vue-chartjs'],
          // PDF generation libraries - lazy loaded
          pdf: ['jspdf', 'html2canvas'],
          // Other heavy utilities
          utils: ['dayjs'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
}));
