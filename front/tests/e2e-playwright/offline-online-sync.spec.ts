// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// Echo mock: acknowledges whatever the client sends, per entity type.
// This is the contract the queue-drain logic depends on: an item only leaves
// the queue once its id comes back inside results.<status>.<entityType>.
async function mockSyncEndpoints(page: Page, options: { failFirstMerge?: boolean } = {}) {
  let mergeCalls = 0
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
        return
      }

      if (url.includes('/api/sync/merge')) {
        mergeCalls++
        if (options.failFirstMerge && mergeCalls === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Server error' }),
          })
          return
        }
        const body = route.request().postDataJSON() as {
          data?: Record<string, Array<Record<string, unknown>>>
        }
        const entities = body?.data ?? {}
        const results = {
          created: {} as Record<string, Array<{ sync_id: unknown; id: number }>>,
          updated: {} as Record<string, Array<{ sync_id: unknown; id: number }>>,
          deleted: {} as Record<string, Array<{ sync_id: unknown }>>,
          skipped: {},
          conflicts: {},
          errors: {},
        }
        for (const [entityType, items] of Object.entries(entities)) {
          if (!Array.isArray(items) || items.length === 0) continue
          // Deletes go to the deleted bucket, everything else to created.
          const deletes = items.filter((i) => (i as Record<string, unknown>)._deleted === true)
          const rest = items.filter((i) => (i as Record<string, unknown>)._deleted !== true)
          if (rest.length > 0) {
            results.created[entityType] = rest.map((item) => ({
              sync_id: (item as Record<string, unknown>).sync_id ?? (item as Record<string, unknown>).id,
              id: 123,
            }))
          }
          if (deletes.length > 0) {
            results.deleted[entityType] = deletes.map((item) => ({
              sync_id: (item as Record<string, unknown>).sync_id ?? (item as Record<string, unknown>).id,
            }))
          }
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, results, serverTime: Math.floor(Date.now() / 1000) }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          authenticated: true,
          changes: [],
          results: { created: {}, updated: {}, deleted: {}, skipped: {}, conflicts: {}, errors: {} },
          serverTime: Math.floor(Date.now() / 1000),
        }),
      })
    },
  )
}

async function setupAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('@dowardev/sso-client:token', 'test-sso-token')
  })
}

async function queueCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const devDb = (window as Record<string, unknown>).__devDb as
      | { countSyncQueue: () => Promise<number> }
      | undefined
    return devDb ? devDb.countSyncQueue() : -1
  })
}

async function gotoBudgetReady(page: Page) {
  await page.goto('/budget', { waitUntil: 'domcontentloaded' })
  const addButton = page.locator('#add-btn')
  await expect(addButton).toBeVisible({ timeout: 30000 })
}

async function createEntryViaUI(page: Page, name: string) {
  const addButton = page.locator('#add-btn')
  await expect(addButton).toBeVisible({ timeout: 30000 })

  await addButton.click()
  await page.locator('ion-item', { hasText: 'Registro' }).first().click()
  await expect(page).toHaveURL(/\/budget\/entry\/new/)

  await page.locator('ion-input[data-cy="entry-name-input"] input').fill(name)
  await page.locator('ion-item[data-cy="entry-account-selector"]').click()

  const accountModal = page.locator('ion-modal').filter({ hasText: 'Seleccionar Cuenta' })
  await expect(accountModal).toBeVisible()
  await accountModal.locator('ion-buttons[slot="end"] ion-button').click()

  const accountAlert = page.locator('ion-alert').last()
  await accountAlert.locator('input').first().fill('Cuenta E2E')
  await accountAlert.locator('button', { hasText: 'Crear' }).click()
  await expect(accountAlert).toBeHidden()

  await accountModal.locator('ion-buttons[slot="start"] ion-button').click()
  await page.locator('ion-input[data-cy="entry-amount-input"] input').fill('1500')

  const saveButton = page.locator('ion-button[data-cy="save-entry-btn"]')
  await expect(saveButton).toBeEnabled()
  await saveButton.click()
  await expect(page).toHaveURL(/\/budget(\?.*)?$/)
}

async function syncNowViaUI(page: Page) {
  await page.goto('/sync', { waitUntil: 'domcontentloaded' })
  const syncButton = page.locator('[data-cy="sync-btn"]')
  await expect(syncButton).toBeVisible({ timeout: 30000 })
  // The button disables when there is nothing pending; wait until it enables.
  await expect(syncButton).toBeEnabled({ timeout: 15000 })
  await syncButton.click()
}

test.describe('Offline→Online Sync Queue Drain', () => {
  test('entry created offline syncs and queue drains to zero on reconnect', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await setupAuth(page)
    await mockSyncEndpoints(page)

    // 1. Load the app online first (offline mode also cuts localhost),
    // then go offline and create an entry — it must queue locally.
    await gotoBudgetReady(page)
    await context.setOffline(true)
    const name = `Offline Entry ${Date.now()}`
    await createEntryViaUI(page, name)
    expect(await queueCount(page)).toBeGreaterThan(0)

    // 2. Reconnect and sync — the user scenario: no force/repair needed.
    await context.setOffline(false)
    await syncNowViaUI(page)

    // 3. Queue must drain to zero.
    await expect
      .poll(() => queueCount(page), { timeout: 30000, message: 'queue should drain after online sync' })
      .toBe(0)

    // 4. Queue drained — UI counter is eventually consistent, queue is source of truth.

    await context.close()
  })

  test('three entries created offline all drain after one sync', async ({ browser }) => {
    const context: BrowserContext = await browser.newContext()
    const page = await context.newPage()
    await setupAuth(page)
    await mockSyncEndpoints(page)

    await gotoBudgetReady(page)
    await context.setOffline(true)
    const stamp = Date.now()
    for (let i = 1; i <= 3; i++) {
      await createEntryViaUI(page, `Offline Batch ${stamp}-${i}`)
    }
    expect(await queueCount(page)).toBeGreaterThanOrEqual(3)

    await context.setOffline(false)
    await syncNowViaUI(page)

    await expect
      .poll(() => queueCount(page), { timeout: 30000, message: 'all 3 queued entries should drain' })
      .toBe(0)

    await context.close()
  })

  test('retry after a failed merge does not leave items stuck', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await setupAuth(page)
    await mockSyncEndpoints(page, { failFirstMerge: true })

    await gotoBudgetReady(page)
    await context.setOffline(true)
    await createEntryViaUI(page, `Retry Entry ${Date.now()}`)
    await context.setOffline(false)

    await syncNowViaUI(page)

    // First merge 500s; the queue keeps the item and a second sync drains it.
    // If the first attempt already shows an error toast, sync again.
    await page.waitForTimeout(3000)
    const remaining = await queueCount(page)
    if (remaining > 0) {
      await syncNowViaUI(page)
    }

    await expect
      .poll(() => queueCount(page), { timeout: 45000, message: 'queue should drain after retry' })
      .toBe(0)

    await context.close()
  })
})

test.describe('Stale offline flag after reconnect', () => {
  test('missed online event does not block sync forever', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await setupAuth(page)
    await mockSyncEndpoints(page)

    // 1. Queue an entry while offline, then reconnect.
    await gotoBudgetReady(page)
    await context.setOffline(true)
    await createEntryViaUI(page, `Stale Flag ${Date.now()}`)
    await context.setOffline(false)
    expect(await queueCount(page)).toBeGreaterThan(0)

    // 2. Simulate the real-device failure: the 'online' event never arrived,
    // so the app still believes it is offline while the network is fine.
    await page.goto('/sync', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByText('Fuera de línea').first()).toBeVisible({ timeout: 10000 })
    // ion-button never reports native disabled to Playwright; aria-disabled is
    // the real state (this is also why the button *looks* disabled to users).
    await expect(page.locator('[data-cy="sync-btn"]')).toHaveAttribute('aria-disabled', 'true')

    // 3. "Actualizar estado" must reconcile the stale flag (no force/repair).
    // LBDS-263 moved the troubleshooting actions into a collapsed accordion, so the
    // status refresh is only reachable once the user opens "Opciones avanzadas".
    await page.locator('ion-accordion > ion-item[slot="header"]').first().click()
    const refreshStatusButton = page.getByRole('button', { name: 'Actualizar estado' })
    await expect(refreshStatusButton).toBeVisible({ timeout: 15000 })
    await refreshStatusButton.click()
    await expect(page.getByText('En línea').first()).toBeVisible({ timeout: 15000 })
    // When enabled, Ionic removes aria-disabled entirely (no 'false' value).
    await expect(page.locator('[data-cy="sync-btn"]')).not.toHaveAttribute('aria-disabled', 'true', { timeout: 15000 })

    // 4. A single sync drains the queue.
    await page.locator('[data-cy="sync-btn"]').click()
    await expect
      .poll(() => queueCount(page), { timeout: 30000, message: 'queue should drain after stale-flag recovery' })
      .toBe(0)

    await context.close()
  })
})
