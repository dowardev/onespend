// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect } from '@playwright/test'

// Reproduces the user's exact report: a recurring charge with a past endDate (31 Aug)
// and autoInsert enabled. Proves the endDate is NOT what breaks the pause button.
test('pause works on a recurring record that has an endDate set', async ({ page }) => {
  await page.goto('/recurring')
  await page.waitForLoadState('networkidle')

  // Seed so the Dexie store exists, then inject a record with endDate + autoInsert (mirrors a
  // user-created "ends 31 Aug" charge). Raw IndexedDB mirrors what the app persists.
  const seedBtn = page.locator('ion-header ion-buttons[slot="end"] > ion-button').first()
  await expect(seedBtn, 'dev seed (flask) button should be visible').toBeVisible({ timeout: 60000 })
  await seedBtn.click()
  await page.waitForTimeout(1500)

  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('OneSpendDB')
      req.onsuccess = () => {
        const database = req.result
        const tx = database.transaction('recurringRecords', 'readwrite')
        const store = tx.objectStore('recurringRecords')
        store.put({
          sync_id: 'enddate-test-1',
          type: 'cargo',
          entryType: 'egreso',
          name: 'Recurrente Agosto',
          amount: 100,
          accountId: null,
          repeatFrequency: 'day',
          repeatInterval: 1,
          time: '08:00',
          autoInsert: true,
          startDate: '2025-01-01',
          endDate: '2025-08-31',
          status: 'active',
        })
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })
  })

  await page.reload()
  await page.waitForLoadState('networkidle')

  const row = page.locator('ion-item', { hasText: 'Recurrente Agosto' }).first()
  await expect(row, 'record with endDate should render').toBeVisible({ timeout: 60000 })

  const pauseBtn = row.locator('ion-button').first()
  await expect(pauseBtn, 'pause button should be visible for an autoInsert record').toBeVisible()
  await pauseBtn.click()

  const resumeBtn = row.locator('ion-button').first()
  await expect(resumeBtn, 'after pause the button should show "Reanudar" (endDate is irrelevant)').toBeVisible({ timeout: 30000 })
      await expect(
        page.locator('ion-badge', { hasText: 'Pausado' }).first(),
        'status badge should show "Pausado"',
      ).toBeVisible()
})
