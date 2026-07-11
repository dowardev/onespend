import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-playwright',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'pnpm run dev',
    port: 5173,
    timeout: 60000,
    reuseExistingServer: true,
  },
});