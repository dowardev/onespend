// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect } from '@playwright/test'

test.describe('Budget account cards — apply a balance', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('applying a new balance from the budget screen creates the adjustment entry', async ({
    page,
  }) => {
    // 1. Create an account with an initial balance of 1000
    await page.goto('/accounts', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    await page.locator('ion-header ion-buttons[slot="end"] ion-button').first().click()
    const createModal = page.locator('ion-modal:has(ion-title:has-text("Crear Cuenta"))')
    await expect(createModal).toBeVisible({ timeout: 10000 })
    await createModal.locator('ion-input >> input').first().fill('Cuenta Presupuesto')
    await createModal.locator('ion-input >> input').nth(1).fill('1000')
    await createModal
      .locator('ion-buttons[slot="end"] ion-button[data-cy="save-account"]')
      .click()
    await expect(createModal).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(600)

    // 2. Open the budget screen and its accounts accordion
    await page.goto('/budget', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1200)

    await page.locator('ion-accordion ion-item[slot="header"]').first().click()
    await page.waitForTimeout(900)

    const accountRow = page.locator('ion-item', { hasText: 'Cuenta Presupuesto' }).first()
    await expect(accountRow).toBeVisible({ timeout: 10000 })
    await accountRow.click()

    // 3. Open the account modal and apply a new balance
    const modal = page.locator('ion-modal:has(ion-title:has-text("Editar"))')
    await expect(modal).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(800)

    const inputs = modal.locator('ion-input >> input')
    await expect(inputs).toHaveCount(2)
    await inputs.nth(1).fill('1500')

    await modal.locator('ion-buttons[slot="end"] ion-button[data-cy="save-account"]').click()
    await expect(modal).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(1000)

    // 4. The adjustment entry exists for that account
    const entries = await page.evaluate(async () => {
      const db: any = await new Promise((resolve, reject) => {
        const request = indexedDB.open('OneSpendDB')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const accounts: any[] = await new Promise((resolve) => {
        const tx = db.transaction('accounts', 'readonly')
        const request = tx.objectStore('accounts').getAll()
        request.onsuccess = () => resolve(request.result)
      })
      const account = accounts.find((a) => a.name === 'Cuenta Presupuesto')

      const all: any[] = await new Promise((resolve) => {
        const tx = db.transaction('budgetEntries', 'readonly')
        const request = tx.objectStore('budgetEntries').getAll()
        request.onsuccess = () => resolve(request.result)
      })

      return all
        .filter((entry) => String(entry.accountId) === String(account.sync_id))
        .map((entry) => ({ name: entry.name, entryType: entry.entryType, amount: entry.amount }))
    })

    expect(entries).toEqual([
      expect.objectContaining({ entryType: 'ingreso', amount: 500 }),
    ])
  })
})
