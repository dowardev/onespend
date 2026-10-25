// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineConfig } from '@playwright/test';
import { E2E_CHROMIUM_ARGS } from './tests/e2e-playwright/helpers/browserFlags';

export default defineConfig({
  testDir: './tests/e2e-playwright',
  // The first navigation of a run pays for vite's on-demand transform of the
  // whole `/budget` route. On a loaded machine that cold start alone eats a
  // 60s budget, so the global timeout has room for it (see global-setup.ts,
  // which warms the transform cache before the first spec runs).
  timeout: 300000,
  retries: 0,
  // Serial on purpose: every spec drives the same dev server, and running them in
  // parallel made three conflict/responsiveness specs time out under load. Serial
  // is both stable and faster in practice (2.9m vs 10.4m with timeouts).
  workers: 1,
  globalSetup: './tests/e2e-playwright/global-setup.ts',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    // Dedicated port for e2e, and a server this config owns. A shared port can
    // silently belong to another project, or to a dev server started without the
    // auth bypass, which is how this suite previously asserted against a
    // different app entirely.
    baseURL: 'http://localhost:5195',
    headless: true,
    viewport: { width: 1280, height: 720 },
    // The app picks its initial locale from the browser language (LBDS-289):
    // `es-*` renders Spanish, anything else renders English. The specs assert on
    // Spanish UI strings, so the locale is pinned here instead of depending on
    // the machine that runs the suite (a CI runner with an English browser used
    // to fail every selector).
    locale: 'es-ES',
    // Containers (CI) run as root and have a small /dev/shm: chromium needs both
    // flags to survive there (see helpers/browserFlags.ts).
    launchOptions: {
      args: [...E2E_CHROMIUM_ARGS],
    },
  },
  webServer: {
    command: 'npx vite --port 5195 --strictPort',
    port: 5195,
    timeout: 120000,
    reuseExistingServer: false,
    env: { VITE_DEV_BYPASS_AUTH: 'true', VITE_E2E: 'true' },
  },
});
