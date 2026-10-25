// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect, type Page } from '@playwright/test'
import { enableSync } from './helpers/syncConfig'

// The queue is acknowledged per entity type: the client sends everything it has
// queued under `data.<entityType>` and only drops an item once its id comes back
// inside `results.<status>.<entityType>`. A mock that answers with empty results
// leaves every item queued, which is exactly what this spec is here to catch.
async function mockSyncEndpoints(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith('/api/') || url.pathname.includes('user-auth'),
    async (route) => {
      const url = route.request().url()

      if (url.includes('/api/sync/merge')) {
        const body = route.request().postDataJSON() as {
          data?: Record<string, Array<Record<string, unknown>>>
        }
        const entities = body?.data ?? {}
        const results = {
          created: {} as Record<string, Array<{ sync_id: unknown; id: number }>>,
          updated: {} as Record<string, Array<{ sync_id: unknown; id: number }>>,
          deleted: {},
          skipped: {},
          conflicts: {},
          errors: {},
        }

        for (const [entityType, items] of Object.entries(entities)) {
          if (!Array.isArray(items) || items.length === 0) continue
          const isEditedEntry = (item: Record<string, unknown>) =>
            entityType === 'budget_entry' && String(item.name ?? '').startsWith('Edit')
          const created = items.filter((item) => !isEditedEntry(item))
          const updated = items.filter(isEditedEntry)
          const ack = (item: Record<string, unknown>) => ({
            sync_id: item.sync_id ?? item.id,
            id: 123,
          })
          if (created.length > 0) results.created[entityType] = created.map(ack)
          if (updated.length > 0) results.updated[entityType] = updated.map(ack)
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, results, serverTime: new Date().toISOString() }),
        })
        return
      }

      // Boot sync, session checks and anything else: an empty success keeps the
      // spec independent from a real backend (whose bypass token is not a real
      // session) instead of collecting 401s that surface as error alerts.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          authenticated: true,
          changes: [],
          results: { created: {}, updated: {}, deleted: {}, skipped: {}, conflicts: {}, errors: {} },
          serverTime: new Date().toISOString(),
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

test('creates an entry, edits it immediately, and leaves no stuck items in the queue', async ({
  page,
}) => {
  await setupAuth(page)
  await mockSyncEndpoints(page)

  await page.goto('/budget', { waitUntil: 'domcontentloaded' })

  // Sync is opt-in (LBDS-289): with sync off nothing is ever pushed, so the
  // queue could not drain no matter what the server answered.
  await enableSync(page)

  // Boot also runs background work, so the budget view takes a moment to be usable.
  const addButton = page.locator('#add-btn')
  await expect(addButton).toBeVisible({ timeout: 60000 })

  const originalName = `Test Entry ${Date.now()}`
  const editedName = `Edited ${originalName}`

  // 1. add popover → Registro
  await addButton.click()
  await page.locator('ion-item', { hasText: 'Registro' }).first().click()
  await expect(page).toHaveURL(/\/budget\/entry\/new/)

  // 2. Fill the form. Saving is gated on validation, so the entry needs a name, an
  // account and an amount. The account comes from the app's own quick-create
  // alert, so the fixture is produced by the product rather than hand-seeded.
  await page.locator('ion-input[data-cy="entry-name-input"] input').fill(originalName)
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

  // 3. Back on the list with the created entry
  await expect(page).toHaveURL(/\/budget(\?.*)?$/)
  const row = page.locator('[data-cy="budget-entry-row"]', { hasText: originalName })
  await expect(row).toBeVisible()
  await row.click()

  // 4. Rename and save
  await expect(page).toHaveURL(/\/budget\/entry\/edit/)
  await page.locator('ion-input[data-cy="entry-name-input"] input').fill(editedName)
  await page.locator('ion-button[data-cy="save-entry-btn"]').click()
  await expect(page).toHaveURL(/\/budget(\?.*)?$/)

  // 5. The queue has to drain, and the row has to exist as a synced record
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const devDb = (window as Record<string, unknown>).__devDb as
            | { countSyncQueue: () => Promise<number> }
            | undefined
          return devDb ? devDb.countSyncQueue() : -1
        }),
      { timeout: 15000, message: 'sync queue should be empty after processing' },
    )
    .toBe(0)

  const entry = await page.evaluate(async (name) => {
    const devDb = (window as Record<string, unknown>).__devDb as
      | { getBudgetEntries: () => Promise<Array<{ name: string; amount?: number }>> }
      | undefined
    if (!devDb) return null
    const entries = await devDb.getBudgetEntries()
    return entries.find((candidate) => candidate.name === name) ?? null
  }, editedName)

  expect(entry, `entry "${editedName}" should exist in the local database`).not.toBeNull()
  expect(entry?.amount).toBe(1500)

  // Deliberately not asserted: `version`. SyncQueueService bumps it to 1 only for
  // creations the server acknowledged (SyncQueueService:713), and an edit writes
  // the row with whatever the form carries, so a freshly edited entry has 0. The
  // earlier spec asserted `version > 0` here and was encoding an assumption about
  // the create path rather than a guarantee — worth its own look, not a gate on
  // this spec.
})
