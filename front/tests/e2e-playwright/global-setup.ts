// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { chromium } from '@playwright/test';
import { E2E_CHROMIUM_ARGS } from './helpers/browserFlags';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5195';

/**
 * Warms up vite's on-demand transform cache before the first spec runs.
 *
 * The dev server transforms the whole module graph of a route the first time a
 * browser asks for it, so the first `page.goto('/budget')` of a run used to pay
 * for the cold start of `/budget` (measured: >60s on a loaded machine, which is
 * what made the suite red). Loading the route once here moves that cost out of
 * the specs.
 *
 * Best effort on purpose: if the warm-up cannot run (browser missing, server
 * not ready), the specs still run — they just pay the cold start themselves.
 */
export default async function globalSetup(): Promise<void> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;

  try {
    // Same flags as the test browser: the global setup launches its own
    // browser, outside `use.launchOptions`, and a root container needs
    // --no-sandbox to launch chromium at all.
    browser = await chromium.launch({ args: [...E2E_CHROMIUM_ARGS] });
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/budget`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => undefined);
  } catch (error) {
    console.warn(`[e2e] warm-up skipped: ${(error as Error).message}`);
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
