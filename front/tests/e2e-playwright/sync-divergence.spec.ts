// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { enableSync } from './helpers/syncConfig'

/**
 * LBDS-276 e2e coverage for the divergence diagnostic + repair flow.
 * The advanced accordion's "Diagnóstico de divergencias" + "Reparar
 * divergencias" items are surfaced via `data-cy` so a future CI runner
 * (when Playwright is wired in) can target them directly. The summary
 * panel renders lines per entity type when drift is detected.
 */

async function setupAuth(context: BrowserContext) {
  await context.addInitScript(() => {
    localStorage.setItem('@dowardev/sso-client:token', 'test-sso-token')
  })
}

async function openAdvancedAccordion(page: Page) {
  // Sync is opt-in (LBDS-289): the diagnostic action stays disabled while the
  // flag is off, so opt in before opening the /sync page.
  await page.goto('/')
  await enableSync(page)
  await page.goto('/sync')
  // The accordion collapses the advanced troubleshooting actions.
  const header = page.locator('ion-accordion > ion-item[slot="header"]').first()
  // Ionic scrolls inside the shadow root of ion-content, which Playwright's own
  // auto-scroll does not follow: scroll it with the browser first.
  await header.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await header.click()
}

async function mockSyncServer(page: Page, snapshot: { rowsByType: Record<string, unknown[]>; tombstoneIdsByType: Record<string, string[]> }) {
  // The session check: without it the app asks the real SSO server about the
  // fake token, drops it and renders the login gate instead of the sync page.
  await page.route('**/user-auth**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: '1', name: 'Test User', user: 'testuser', email: 'test@test.com', roles: [] }),
    });
  });
  await page.route('**/api/sync/changes**', async (route) => {
    // The server sends each tombstone inside the bucket of its own entity
    // type (`{id, _deleted: true}`), which is how the detector can attribute
    // an account tombstone to `account` and not to another entity type.
    const changes: Record<string, unknown[]> = {}
    for (const [entityType, rows] of Object.entries(snapshot.rowsByType)) {
      changes[entityType] = [...rows]
    }
    for (const [entityType, ids] of Object.entries(snapshot.tombstoneIdsByType)) {
      const bucket = changes[entityType] ?? (changes[entityType] = [])
      for (const id of ids) {
        bucket.push({ id, _deleted: true })
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        changes,
        serverTime: Math.floor(Date.now() / 1000),
      }),
    })
  })
  await page.route('**/api/sync/full**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ serverTime: Math.floor(Date.now() / 1000) }),
    })
  })
  await page.route('**/api/sync/merge**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        results: { created: {}, updated: {}, deleted: {}, skipped: {} },
        serverTime: Math.floor(Date.now() / 1000),
      }),
    })
  })
}

test.describe('LBDS-276 — divergence diagnostic + repair', () => {
  test('diagnose-divergence-btn renders the summary when drift is reported by the server', async ({ page, context }) => {
    await setupAuth(context)
    await mockSyncServer(page, {
      rowsByType: {
        // Server-only account that the client has not pulled yet → missingOnLocal.
        account: [{ sync_id: 'remote-account-1', version: 1 }],
        // Account tombstone the client has not applied → serverTombstoneUnapplied.
      },
      tombstoneIdsByType: { account: ['tombstone-account-1'] },
    })

    await openAdvancedAccordion(page)
    await page.locator('[data-cy="diagnose-divergence-btn"]').click()

    // Summary panel surfaces the per-entity drift lines.
    const summary = page.locator('[data-cy="divergence-summary"]')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('account')
  })

  test('a tombstone in one entity type is not attributed to another', async ({ page, context }) => {
    await setupAuth(context)
    // Tombstone in 'account' only. budget_entry must NOT report it.
    await mockSyncServer(page, {
      rowsByType: {},
      tombstoneIdsByType: { account: ['orphan-tombstone'] },
    })

    await openAdvancedAccordion(page)
    await page.locator('[data-cy="diagnose-divergence-btn"]').click()

    const summary = page.locator('[data-cy="divergence-summary"]')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('account')
    // Regression guard for finding #2 of the pre-merge review.
    await expect(summary).not.toContainText('budget_entry')
  })
})
