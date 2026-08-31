// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineConfig } from '@playwright/test';

// Fresh dev server on a separate port with auth bypass, so we don't disturb the
// user's running dev server on 5173. Mirrors playwright.config.ts but starts its
// own server (reuseExistingServer: false) on 5195.
export default defineConfig({
  testDir: './tests/e2e-playwright',
  timeout: 120000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5195',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'pnpm run dev --port 5195',
    port: 5195,
    timeout: 120000,
    reuseExistingServer: false,
    env: { VITE_DEV_BYPASS_AUTH: 'true' },
  },
});
