// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect } from '@playwright/test'

test.describe('Account modal — balance help', () => {
  test('the info button explains what applying a new balance does', async ({ page }) => {
    await page.goto('/accounts', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    // Create an account so there is something to edit
    await page.locator('ion-header ion-buttons[slot="end"] ion-button').first().click()
    const createModal = page.locator('ion-modal:has(ion-title:has-text("Crear Cuenta"))')
    await expect(createModal).toBeVisible({ timeout: 10000 })
    await createModal.locator('ion-input >> input').first().fill('Cuenta Ayuda')
    await createModal.locator('ion-input >> input').nth(1).fill('1000')
    await createModal
      .locator('ion-buttons[slot="end"] ion-button[data-cy="save-account"]')
      .click()
    await expect(createModal).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(600)

    await page.locator('ion-item', { hasText: 'Cuenta Ayuda' }).first().click()
    const modal = page.locator('ion-modal:has(ion-title:has-text("Editar"))')
    await expect(modal).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(800)

    // The info button sits next to the balance input
    const helpButton = modal.locator('ion-button[data-cy="balance-help"]')
    await expect(helpButton).toBeVisible()

    await helpButton.click()

    const popover = page.locator('ion-popover:not(.overlay-hidden)')
    await expect(popover).toBeVisible({ timeout: 5000 })
    await expect(popover).toContainText('Ajustar saldo')
    await expect(popover).toContainText('El balance es el saldo de la cuenta')
    await expect(popover).toContainText('«Nuevo balance» es el saldo que querés que le quede')
    await expect(popover).toContainText('sin tocar el balance inicial')

    await page.screenshot({ path: '/tmp/balance-help.png' })
  })
})
