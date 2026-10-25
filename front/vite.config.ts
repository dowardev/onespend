// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

/// <reference types="vitest" />

import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The dev-mode banner is a fixed footer that sits on top of the bottom of the
// viewport, and it swallows the clicks aimed at whatever is underneath it (the
// "Opciones avanzadas" accordion of the sync page, for example). The e2e dev
// server hides it: the banner is not what those specs are about, and it moves
// with every release. Dev server only (`apply: 'serve'`), and only when the
// e2e server asks for it with VITE_E2E=true.
const e2eHideDevBanner = {
  name: 'onespend:e2e-hide-dev-banner',
  apply: 'serve' as const,
  transformIndexHtml(html: string) {
    if (process.env.VITE_E2E !== 'true') return html;
    return {
      html,
      tags: [
        {
          tag: 'style',
          attrs: { 'data-e2e': 'hide-dev-banner' },
          children: '.dev-footer { display: none !important; }',
          injectTo: 'head',
        },
      ],
    };
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Web build uses an absolute base so assets resolve correctly from any
  // subroute (e.g. the SSO callback /auth/callback served by the SPA
  // fallback). Desktop/Capacitor builds load dist via file:// or
  // capacitor://localhost and need a relative base.
  base: command === 'build' ? (process.env.DESKTOP_BUILD === 'true' ? './' : '/') : '/',
  plugins: [
    vue(),
    e2eHideDevBanner,
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
    exclude: [...configDefaults.exclude, 'tests/e2e-playwright/**'],
    setupFiles: ['./src/test-setup.ts'],
  },
}));
