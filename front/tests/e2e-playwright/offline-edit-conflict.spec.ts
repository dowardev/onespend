// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { enableSync } from './helpers/syncConfig'

const CONFLICT_SYNC_ID = 'offline-conflict-001'

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('@dowardev/sso-client:token', 'test-sso-token')
  })
}

async function mockExternalCalls(page: Page) {
  // Port-agnostic on purpose: matching on "not the dev server" pinned these specs
  // to 5173, a port another project uses on some machines. Mock the API/SSO calls
  // by path instead, so the suite runs on any port.
  await page.route(
    (url) => url.pathname.startsWith('/api/') || url.pathname.includes('user-auth'),
    async (route) => {
    const url = route.request().url()
    if (url.includes('/user-auth')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: '1', name: 'Test User', user: 'testuser', email: 'test@test.com', roles: [] }),
      })
    } else if (url.includes('/api/sync/resolve-conflict')) {
      const body = route.request().postDataJSON()
      const entity = body.resolution === 'server'
        ? { sync_id: CONFLICT_SYNC_ID, name: 'Versión B (online)', amount: 500, account_id: 1, date: '2025-01-15', updated_at: 1705315400 }
        : { sync_id: CONFLICT_SYNC_ID, name: 'Versión A (offline)', amount: 500, account_id: 1, date: '2025-01-15', updated_at: 1705315200 }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, entity }) })
    } else if (url.includes('/api/sync/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, results: { created: {}, updated: {}, deleted: {}, skipped: {}, conflicts: {} }, serverTime: Date.now() }) })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }
  })
}

async function navigateAndWait(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForFunction(() => {
    const w = window as Record<string, unknown>
    return typeof w.__devDb !== 'undefined'
  }, { timeout: 30000 })
  // Sync is opt-in (LBDS-289): resolving a conflict calls the server, and the
  // API refuses every call while sync is off.
  await enableSync(page)
}

async function injectConflict(page: Page, conflictType: string) {
  const added = await page.evaluate(async ({ syncId, type }) => {
    const devDb = (window as Record<string, unknown>).__devDb as {
      clearConflicts(): Promise<void>
      addConflict(_: Record<string, unknown>): Promise<void>
    } | undefined
    if (!devDb) return false
    await devDb.clearConflicts()
    await devDb.addConflict({
      entityType: 'budget_entry',
      sync_id: syncId,
      client_data: { name: 'Versión A (offline)', amount: 500, date: '2025-01-15', account_id: 1, updated_at: 1705315200, conflict_type: type },
      server_data: { name: 'Versión B (online)', amount: 500, date: '2025-01-15', account_id: 1, updated_at: 1705315400, conflict_type: type },
    })
    return true
  }, { syncId: CONFLICT_SYNC_ID, type: conflictType })
  expect(added).toBe(true)
}

async function createReadyPage(context: BrowserContext) {
  const page = await context.newPage()
  await setupAuth(page)
  await mockExternalCalls(page)
  return page
}

test.describe('Offline Edit Conflict', () => {

  test('concurrent_edit conflict appears in UI and can be resolved keep-client', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await createReadyPage(contextA)
    const pageB = await createReadyPage(contextB)

    await navigateAndWait(pageA, '/budget')
    await navigateAndWait(pageB, '/budget')

    await injectConflict(pageA, 'concurrent_edit')
    await pageA.goto('/sync', { waitUntil: 'domcontentloaded', timeout: 120000 })
    await pageA.waitForFunction(() => (window as Record<string, unknown>).__devDb !== undefined, { timeout: 30000 })

    await expect(pageA.locator('[data-cy="conflicts-card"]')).toBeVisible({ timeout: 30000 })
    await expect(pageA.locator('[data-cy="conflict-count-badge"]')).toContainText('1')
    await pageA.locator('[data-cy="conflict-badge"]').first().click()
    await expect(pageA.locator('[data-cy="conflict-modal"]')).toBeVisible({ timeout: 30000 })
    await pageA.locator('[data-cy="resolve-client-btn"]').click()
    await expect(pageA.getByText('Conflicto resuelto')).toBeVisible({ timeout: 30000 })

    const count = await pageA.evaluate(async () => {
      const devDb = (window as Record<string, unknown>).__devDb as { getConflictCount(): Promise<number> } | undefined
      return devDb ? await devDb.getConflictCount() : 999
    })
    expect(count).toBe(0)

    await contextA.close()
    await contextB.close()
  })

  test('concurrent_edit conflict appears in UI and can be resolved keep-server', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await createReadyPage(contextA)
    const pageB = await createReadyPage(contextB)

    await navigateAndWait(pageA, '/budget')
    await navigateAndWait(pageB, '/budget')

    await injectConflict(pageA, 'concurrent_edit')
    await pageA.goto('/sync', { waitUntil: 'domcontentloaded', timeout: 120000 })
    await pageA.waitForFunction(() => (window as Record<string, unknown>).__devDb !== undefined, { timeout: 30000 })

    await expect(pageA.locator('[data-cy="conflicts-card"]')).toBeVisible({ timeout: 30000 })
    await pageA.locator('[data-cy="conflict-badge"]').first().click()
    await expect(pageA.locator('[data-cy="conflict-modal"]')).toBeVisible({ timeout: 30000 })
    await pageA.locator('[data-cy="resolve-server-btn"]').click()
    await expect(pageA.getByText('Conflicto resuelto')).toBeVisible({ timeout: 30000 })

    await contextA.close()
    await contextB.close()
  })

  test('concurrent_edit conflict does not reappear after reload', async ({ page }) => {
    await setupAuth(page)
    await mockExternalCalls(page)

    await navigateAndWait(page, '/budget')
    await injectConflict(page, 'concurrent_edit')
    await page.goto('/sync', { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForFunction(() => (window as Record<string, unknown>).__devDb !== undefined, { timeout: 30000 })

    await expect(page.locator('[data-cy="conflicts-card"]')).toBeVisible({ timeout: 30000 })
    await page.locator('[data-cy="conflict-badge"]').first().click()
    await page.locator('[data-cy="resolve-client-btn"]').click()
    await expect(page.getByText('Conflicto resuelto')).toBeVisible({ timeout: 30000 })

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForFunction(() => (window as Record<string, unknown>).__devDb !== undefined, { timeout: 30000 })
    await expect(page.locator('[data-cy="conflicts-card"]')).not.toBeVisible({ timeout: 30000 })
  })

  test('same-context: concurrent_edit conflict across two browser pages', async ({ browser }) => {
    const context = await browser.newContext()
    const pageA = await context.newPage()
    const pageB = await context.newPage()

    await setupAuth(pageA)
    await mockExternalCalls(pageA)
    await setupAuth(pageB)
    await mockExternalCalls(pageB)

    await navigateAndWait(pageA, '/budget')
    await navigateAndWait(pageB, '/budget')

    await injectConflict(pageA, 'concurrent_edit')

    await pageA.goto('/sync', { waitUntil: 'domcontentloaded', timeout: 120000 })
    await pageA.waitForFunction(() => (window as Record<string, unknown>).__devDb !== undefined, { timeout: 30000 })
    await expect(pageA.locator('[data-cy="conflicts-card"]')).toBeVisible({ timeout: 30000 })

    await pageB.goto('/sync', { waitUntil: 'domcontentloaded', timeout: 120000 })
    await pageB.waitForFunction(() => (window as Record<string, unknown>).__devDb !== undefined, { timeout: 30000 })

    const countA = await pageA.evaluate(async () => {
      const devDb = (window as Record<string, unknown>).__devDb as { getConflictCount(): Promise<number> } | undefined
      return devDb ? await devDb.getConflictCount() : 999
    })
    expect(countA).toBe(1)

    await expect(pageB.locator('[data-cy="conflicts-card"]')).toBeVisible({ timeout: 30000 })
    await expect(pageB.locator('[data-cy="conflict-count-badge"]')).toContainText('1')

    await context.close()
  })
})
