// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { Page } from '@playwright/test';

/**
 * Server URL used by the e2e specs.
 *
 * The specs intercept every request by path, so the URL never has to be
 * reachable: it only has to be a non-empty value, because sync is opt-in
 * (LBDS-289) and the app refuses every sync call while the flag is off or the
 * URL is empty.
 */
export const E2E_SYNC_SERVER_URL = 'https://sync.e2e.test';

/**
 * Turns sync on for the current page (and its origin).
 *
 * Sync is opt-in: with the flag off, the /sync page renders its controls
 * disabled and every sync call fails closed, so a spec that wants to exercise
 * the sync flow has to opt in first. The values live in `configDb`
 * (IndexedDB), which is why this writes them through the app's own module.
 */
export async function enableSync(page: Page): Promise<void> {
  await page.evaluate(async (serverUrl: string) => {
    const { configDb } = await import('/src/db/controllers/configDb.ts');
    await configDb.set({ key: 'syncEnabled', value: true });
    await configDb.set({ key: 'syncServerUrl', value: serverUrl });
  }, E2E_SYNC_SERVER_URL);
}
