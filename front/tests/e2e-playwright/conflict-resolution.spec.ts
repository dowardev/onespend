// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

const CONFLICT_SYNC_ID = 'test-conflict-001'

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
        ? { sync_id: CONFLICT_SYNC_ID, name: 'Café Server', amount: 500, account_id: 1, date: '2025-01-15', updated_at: 1705315200 }
        : { sync_id: CONFLICT_SYNC_ID, name: 'Café Local', amount: 500, account_id: 1, date: '2025-01-15', updated_at: 1705315200 }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, entity }) })
    } else if (url.includes('/api/sync/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, results: { created: {}, updated: {}, deleted: {}, skipped: {}, conflicts: {} }, serverTime: Date.now() }) })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }
  })
}

async function navigateAndWait(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  // wait for Vue app to mount and __devDb to exist
  await page.waitForFunction(() => {
    const w = window as Record<string, unknown>
    return typeof w.__devDb !== 'undefined'
  }, { timeout: 15000 })
}

async function injectConflict(page: Page) {
  const added = await page.evaluate(async (syncId) => {
    const devDb = (window as Record<string, unknown>).__devDb as {
      clearConflicts(): Promise<void>
      addConflict(_: Record<string, unknown>): Promise<void>
    } | undefined
    if (!devDb) return false
    await devDb.clearConflicts()
    await devDb.addConflict({
      entityType: 'budget_entry',
      sync_id: syncId,
      client_data: { name: 'Café Local', amount: 500, date: '2025-01-15', account_id: 1, updated_at: 1705315200 },
      server_data: { name: 'Café Server', amount: 500, date: '2025-01-15', account_id: 1, updated_at: 1705315200 },
    })
    return true
  }, CONFLICT_SYNC_ID)
  expect(added).toBe(true)
}

async function createReadyPage(context: BrowserContext) {
  const page = await context.newPage()
  await setupAuth(page)
  await mockExternalCalls(page)
  return page
}

test.describe('Conflict Resolution', () => {

  test('resolve conflict keeping server version', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await createReadyPage(contextA)
    const pageB = await createReadyPage(contextB)

    await navigateAndWait(pageA, '/budget')
    await navigateAndWait(pageB, '/budget')

    await injectConflict(pageA)
    await pageA.goto('/sync', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await pageA.waitForFunction(() => (window as Record<string, unknown>).__devDb !== undefined, { timeout: 15000 })

    await expect(pageA.locator('[data-cy="conflicts-card"]')).toBeVisible({ timeout: 10000 })
    await expect(pageA.locator('[data-cy="conflict-count-badge"]')).toContainText('1')
    await pageA.locator('[data-cy="conflict-badge"]').first().click()
    await expect(pageA.locator('[data-cy="conflict-modal"]')).toBeVisible({ timeout: 10000 })
    await pageA.locator('[data-cy="resolve-server-btn"]').click()
    await expect(pageA.getByText('Conflicto resuelto')).toBeVisible({ timeout: 15000 })

    await contextA.close()
    await contextB.close()
  })

  test('resolve conflict keeping client version', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await createReadyPage(contextA)
    const pageB = await createReadyPage(contextB)

    await navigateAndWait(pageA, '/budget')
    await navigateAndWait(pageB, '/budget')

    await injectConflict(pageA)
    await pageA.goto('/sync', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await pageA.waitForFunction(() => (window as Record<string, unknown>).__devDb !== undefined, { timeout: 15000 })

    await expect(pageA.locator('[data-cy="conflicts-card"]')).toBeVisible({ timeout: 10000 })
    await expect(pageA.locator('[data-cy="conflict-count-badge"]')).toContainText('1')
    await pageA.locator('[data-cy="conflict-badge"]').first().click()
    await expect(pageA.locator('[data-cy="conflict-modal"]')).toBeVisible({ timeout: 10000 })
    await pageA.locator('[data-cy="resolve-client-btn"]').click()
    await expect(pageA.getByText('Conflicto resuelto')).toBeVisible({ timeout: 15000 })

    const count = await pageA.evaluate(async () => {
      const devDb = (window as Record<string, unknown>).__devDb as { getConflictCount(): Promise<number> } | undefined
      return devDb ? await devDb.getConflictCount() : 999
    })
    expect(count).toBe(0)

    await contextA.close()
    await contextB.close()
  })

  test('conflict does not reappear after reload', async ({ page }) => {
    await setupAuth(page)
    await mockExternalCalls(page)

    await navigateAndWait(page, '/budget')
    await injectConflict(page)
    await page.goto('/sync', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForFunction(() => (window as Record<string, unknown>).__devDb !== undefined, { timeout: 15000 })

    await expect(page.locator('[data-cy="conflicts-card"]')).toBeVisible({ timeout: 10000 })
    await page.locator('[data-cy="conflict-badge"]').first().click()
    await page.locator('[data-cy="resolve-client-btn"]').click()
    await expect(page.getByText('Conflicto resuelto')).toBeVisible({ timeout: 15000 })

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForFunction(() => (window as Record<string, unknown>).__devDb !== undefined, { timeout: 15000 })
    await expect(page.locator('[data-cy="conflicts-card"]')).not.toBeVisible({ timeout: 10000 })
  })
})