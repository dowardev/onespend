// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-playwright',
  timeout: 60000,
  retries: 0,
  // Serial on purpose: every spec drives the same dev server, and running them in
  // parallel made three conflict/responsiveness specs time out under load. Serial
  // is both stable and faster in practice (2.9m vs 10.4m with timeouts).
  workers: 1,
  use: {
    // Dedicated port for e2e, and a server this config owns. A shared port can
    // silently belong to another project, or to a dev server started without the
    // auth bypass, which is how this suite previously asserted against a
    // different app entirely.
    baseURL: 'http://localhost:5195',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npx vite --port 5195 --strictPort',
    port: 5195,
    timeout: 120000,
    reuseExistingServer: false,
    env: { VITE_DEV_BYPASS_AUTH: 'true' },
  },
});
