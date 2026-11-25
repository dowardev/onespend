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
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
    });

    await page.goto(`${BASE_URL}/budget`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(2000);

    // A boot failure used to surface as dozens of unrelated spec failures
    // ("the header button was not found"), which hid the real cause. The app
    // not mounting is a broken app, not a broken spec: report it here, with
    // the errors the browser collected, and stop the run.
    const mounted = await page
      .evaluate(() => !!document.querySelector('ion-app'))
      .catch(() => false);

    if (!mounted) {
      throw new Error(
        `The app did not mount at ${BASE_URL}/budget.` +
          (problems.length ? `\nBrowser errors:\n  ${problems.join('\n  ')}` : ''),
      );
    }
  } catch (error) {
    const message = (error as Error).message;
    // A missing browser or a server that is not up yet is not an app
    // problem: the specs can still run and pay the cold start themselves.
    if (message.includes('did not mount')) {
      console.error(`[e2e] ${message}`);
      throw error;
    }
    console.warn(`[e2e] warm-up skipped: ${message}`);
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
