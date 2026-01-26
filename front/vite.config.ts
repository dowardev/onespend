/// <reference types="vitest" />

import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      manifest: {
        name: 'oneSpend',
        short_name: 'oneSpend',
        description: 'Gestor de gastos y presupuesto',
        theme_color: '#428cff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|gif|webp|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.(js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60 // 24 hours
              }
            }
          }
        ]
      }
    })
  ],
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
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
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
