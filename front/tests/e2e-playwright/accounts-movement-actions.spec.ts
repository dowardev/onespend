// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect } from '@playwright/test'

const ACCOUNT_NAME = 'Cuenta Acciones'

async function createAccountWithMovement(page: any) {
  await page.goto('/accounts', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)

  await page.locator('ion-header ion-buttons[slot="end"] ion-button').first().click()
  const createModal = page.locator('ion-modal:has(ion-title:has-text("Crear Cuenta"))')
  await expect(createModal).toBeVisible({ timeout: 10000 })
  await createModal.locator('ion-input >> input').first().fill(ACCOUNT_NAME)
  await createModal.locator('ion-input >> input').nth(1).fill('1000')
  await createModal
    .locator('ion-buttons[slot="end"] ion-button[data-cy="save-account"]')
    .click()
  await expect(createModal).toBeHidden({ timeout: 10000 })
  await page.waitForTimeout(600)

  await page.evaluate(async (name: string) => {
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
    const account = accounts.find((a) => a.name === name)

    const tx = db.transaction('budgetEntries', 'readwrite')
    tx.objectStore('budgetEntries').put({
      sync_id: 'movement-actions-1',
      name: 'Movimiento para acciones',
      amount: 250,
      date: new Date().toISOString().slice(0, 10),
      entryType: 'egreso',
      paymentType: 'cash',
      accountId: account.sync_id,
      groups: [],
      createdAt: Date.now(),
    })
    await new Promise((resolve) => {
      tx.oncomplete = () => resolve(null)
    })
  }, ACCOUNT_NAME)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1200)
}

async function openAccountModal(page: any) {
  await page.locator('ion-item', { hasText: ACCOUNT_NAME }).first().click()
  const modal = page.locator('ion-modal:has(ion-title:has-text("Editar"))')
  await expect(modal).toBeVisible({ timeout: 10000 })
  await page.waitForTimeout(1000)

  // The transactions live in an accordion: expand it to reach the rows.
  await modal.locator('ion-accordion .transactions-header').click()
  await page.waitForTimeout(800)
  return modal
}

test.describe('Account modal — movement actions (touch)', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

  test('the ellipsis button opens the options popover', async ({ page }) => {
    await createAccountWithMovement(page)
    const modal = await openAccountModal(page)

    const moreButton = modal.locator('ion-item.agenda-item ion-button.movement-more')
    await expect(moreButton).toBeVisible()

    // The inline hover buttons stay away on touch devices
    await expect(modal.locator('ion-item.agenda-item ion-buttons.movement-actions')).toBeHidden()

    await moreButton.click()
    const popover = page.locator('ion-popover')
    await expect(popover).toBeVisible({ timeout: 5000 })
    await expect(popover.locator('ion-item', { hasText: 'Editar' })).toBeVisible()
    await expect(popover.locator('ion-item', { hasText: 'Eliminar' })).toBeVisible()
  })

  test('deleting from the popover removes the movement', async ({ page }) => {
    await createAccountWithMovement(page)
    const modal = await openAccountModal(page)

    await expect(modal.locator('ion-item.agenda-item')).toHaveCount(1)

    await modal.locator('ion-item.agenda-item ion-button.movement-more').click()
    const popover = page.locator('ion-popover')
    await expect(popover).toBeVisible({ timeout: 5000 })
    await popover.locator('ion-item', { hasText: 'Eliminar' }).click()

    // Confirmation, then the movement is gone from the history
    // The modal has its own account-delete alert, so pick the visible one.
    const alert = page.locator('ion-alert:not(.overlay-hidden)')
    await expect(alert).toBeVisible({ timeout: 5000 })
    await alert.locator('button', { hasText: 'Eliminar' }).click()
    await page.waitForTimeout(1200)

    await expect(modal.locator('ion-item.agenda-item')).toHaveCount(0)
  })

  test('editing from the popover opens the movement edit screen', async ({ page }) => {
    await createAccountWithMovement(page)
    const modal = await openAccountModal(page)

    await modal.locator('ion-item.agenda-item ion-button.movement-more').click()
    const popover = page.locator('ion-popover')
    await expect(popover).toBeVisible({ timeout: 5000 })
    await popover.locator('ion-item', { hasText: 'Editar' }).click()

    await page.waitForURL(/\/budget\/entry\/edit/, { timeout: 10000 })
    expect(page.url()).toContain('entryId=')
  })
})

test.describe('Account modal — movement actions (pointer)', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('the actions appear when the pointer is over the row', async ({ page }) => {
    await createAccountWithMovement(page)
    const modal = await openAccountModal(page)

    const actions = modal.locator('ion-item.agenda-item ion-buttons.movement-actions')
    await expect(actions).toHaveCount(1)

    // Hidden until the pointer is over the row
    const opacityBefore = await actions.evaluate((el: HTMLElement) => getComputedStyle(el).opacity)
    expect(opacityBefore).toBe('0')

    // The ellipsis button is for touch devices only
    await expect(modal.locator('ion-item.agenda-item ion-button.movement-more')).toBeHidden()

    await modal.locator('ion-item.agenda-item').first().hover()
    await page.waitForTimeout(400)

    const opacityAfter = await actions.evaluate((el: HTMLElement) => getComputedStyle(el).opacity)
    expect(opacityAfter).toBe('1')
    await expect(modal.locator('ion-item.agenda-item ion-button', { hasText: '' }).first()).toBeVisible()
  })
})
