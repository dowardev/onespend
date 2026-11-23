// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect } from '@playwright/test'

test.describe('Account configuration modal — history order', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the applied balance is the first movement of the history, even with movements dated in the future', async ({
    page,
  }) => {
    // 1. Create an account with an initial balance of 1000
    await page.goto('/accounts', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    await page.locator('ion-header ion-buttons[slot="end"] ion-button').first().click()
    const createModal = page.locator('ion-modal:has(ion-title:has-text("Crear Cuenta"))')
    await expect(createModal).toBeVisible({ timeout: 10000 })
    await createModal.locator('ion-input >> input').first().fill('Cuenta Historial')
    await createModal.locator('ion-input >> input').nth(1).fill('1000')
    await createModal
      .locator('ion-buttons[slot="end"] ion-button[data-cy="save-account"]')
      .click()
    await expect(createModal).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(600)

    // 2. Seed movements: three dated in the future and one in the past
    await page.evaluate(async () => {
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
      const account = accounts.find((a) => a.name === 'Cuenta Historial')

      const iso = (offsetDays: number) =>
        new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)

      const movements = [
        { sync_id: 'hist-1', name: 'Futuro lejano', date: iso(15), createdAt: 1000 },
        { sync_id: 'hist-2', name: 'Futuro medio', date: iso(14), createdAt: 2000 },
        { sync_id: 'hist-3', name: 'Futuro cercano', date: iso(13), createdAt: 3000 },
        { sync_id: 'hist-4', name: 'Pasado', date: iso(-5), createdAt: 4000 },
      ]

      const tx = db.transaction('budgetEntries', 'readwrite')
      for (const movement of movements) {
        tx.objectStore('budgetEntries').put({
          ...movement,
          amount: 100,
          entryType: 'egreso',
          paymentType: 'cash',
          accountId: account.sync_id,
          groups: [],
        })
      }
      await new Promise((resolve) => {
        tx.oncomplete = () => resolve(null)
      })
    })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1200)

    // 3. Apply a new balance
    const row = page.locator('ion-item', { hasText: 'Cuenta Historial' }).first()
    await row.click()
    const modal = page.locator('ion-modal:has(ion-title:has-text("Editar"))')
    await expect(modal).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    await modal.locator('ion-input >> input').nth(1).fill('2500')
    await modal
      .locator('ion-buttons[slot="end"] ion-button[data-cy="save-account"]')
      .click()
    await expect(modal).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(1200)

    // 4. Reopen the modal: the adjustment is the first movement of the history
    await row.click()
    await expect(modal).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1200)

    const movements_ = await modal.locator('ion-accordion ion-item.agenda-item').allInnerTexts()
    expect(movements_.length).toBe(5)
    expect(movements_[0]).toContain('Ajuste de saldo')
    expect(movements_[0]).toContain('$2,500.00')

    // The running balance of every row follows the order shown
    expect(movements_[1]).toContain('$600.00')
    expect(movements_[2]).toContain('$700.00')
    expect(movements_[3]).toContain('$800.00')
    expect(movements_[4]).toContain('$900.00')
  })
})
