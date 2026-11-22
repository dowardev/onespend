// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect } from '@playwright/test'

test.describe('Accounts page — account configuration modal', () => {
  test.beforeEach(async ({ page }) => {
    // The dev server is started with VITE_DEV_BYPASS_AUTH=true by the global config
    await page.goto('/accounts', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    // Wait for the accounts list to render (may be empty initially)
    await page.waitForTimeout(1000)
  })

  test('create account with initial balance, then edit — initial balance not editable, apply new balance creates adjustment entry, transactions accordion shows Historial-style list, delete button works', async ({
    page,
  }) => {
    // 1. Create an account with initial balance
    const addButton = page.locator('ion-header ion-buttons[slot="end"] ion-button').first()
    await expect(addButton).toBeVisible()
    await addButton.click()

    // Wait for the modal to appear
    const modal = page.locator('ion-modal:has(ion-title:has-text("Crear Cuenta"))')
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Fill account name and initial balance, then save
    await modal.locator('ion-input >> input').first().fill('Cuenta Test E2E')
    await modal.locator('ion-input >> input').nth(1).fill('1000') // Initial balance
    await modal.locator('ion-buttons[slot="end"] ion-button[data-cy="save-account"]').click() // Save button

    // Wait for modal to close and list to update
    await expect(modal).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(500)

    // Verify account appears in list with initial balance 1000
    const accountRow = page.locator('ion-item', { hasText: 'Cuenta Test E2E' }).first()
    await expect(accountRow).toBeVisible()
    await expect(accountRow).toContainText('Balance inicial: 1000')

    // 2. Click the account row to open the edit modal
    await accountRow.click()

    // Wait for edit modal
    const editModal = page.locator('ion-modal:has(ion-title:has-text("Editar Cuenta"))')
    await expect(editModal).toBeVisible({ timeout: 10000 })

    // 3. Verify initial balance input is NOT visible when editing (S1)
    // When editing, there should be only 2 inputs: name and target balance (no initial balance)
    const inputs = editModal.locator('ion-input >> input')
    await expect(inputs).toHaveCount(2)

    // 4. Verify "Aplicar nuevo saldo" input IS visible (S3) - it's the second input
    const targetBalanceInput = inputs.nth(1)
    await expect(targetBalanceInput).toBeVisible()

    // 5. Get current balance from the account row (should be 1000 since no transactions yet)
    // Apply a new balance different from current (e.g., 1500) - this should create an adjustment entry
    await targetBalanceInput.fill('1500')

    // Save the modal
    await editModal.locator('ion-buttons[slot="end"] ion-button[data-cy="save-account"]').click()

    // Wait for modal to close
    await expect(editModal).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(500)

    // 6. Verify the account's current balance is now 1500 (target balance applied via adjustment entry)
    const updatedAccountRow = page.locator('ion-item', { hasText: 'Cuenta Test E2E' }).first()
    await expect(updatedAccountRow).toBeVisible()
    await expect(updatedAccountRow).toContainText('Balance actual:')
    await expect(updatedAccountRow).toContainText('1,500')

    // 7. Open edit modal again to verify transactions accordion shows the adjustment entry
    await updatedAccountRow.click()
    const editModal2 = page.locator('ion-modal:has(ion-title:has-text("Editar Cuenta"))')
    await expect(editModal2).toBeVisible({ timeout: 10000 })

    // Wait for transactions to load
    await page.waitForTimeout(1000)

    // The accordion header shows '1 Transacciones' - find it by text
    const accordionHeader = editModal2.locator('ion-accordion >> text=Transacciones')
    await expect(accordionHeader).toBeVisible({ timeout: 10000 })
    
    // The accordion itself - find by the header button
    const accordion = editModal2.locator('ion-accordion').filter({ hasText: 'Transacciones' })
    await expect(accordion).toBeVisible({ timeout: 5000 })

    // Open the accordion by clicking the header
    await accordionHeader.click()
    await page.waitForTimeout(500)

    // Verify accordion content shows the day divider with day total
    const dayDivider = editModal2.locator('ion-item-divider.day-divider')
    await expect(dayDivider).toBeVisible({ timeout: 5000 })

    // Verify the adjustment entry row exists with the correct amount and type
    const transactionItem = editModal2.locator('ion-item.agenda-item').first()
    await expect(transactionItem).toBeVisible({ timeout: 5000 })
    // Should show the adjustment entry (ingreso of 500)
    await expect(transactionItem).toContainText('500')
    await expect(transactionItem).toContainText('Ingreso')

    // 9. Close the edit modal
    await editModal2.locator('ion-header ion-buttons ion-button').first().click() // Close button
    await expect(editModal2).toBeHidden({ timeout: 5000 })

    // 10. Test delete action from toolbar (S8, S12)
    // Re-open edit modal
    await updatedAccountRow.click()
    const editModal3 = page.locator('ion-modal:has(ion-title:has-text("Editar Cuenta"))')
    await expect(editModal3).toBeVisible({ timeout: 10000 })

    // Click the delete button in the toolbar (trash icon, color="danger")
    const deleteButton = editModal3.locator('ion-header ion-buttons[slot="end"] ion-button[data-cy="delete-account"]')
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Confirmation alert should appear
    const alert = page.locator('ion-alert:visible')
    await expect(alert).toBeVisible({ timeout: 5000 })
    await expect(alert).toContainText('¿Eliminar esta cuenta?')

    // Confirm deletion
    await alert.locator('button', { hasText: 'Eliminar cuenta' }).click()
    await expect(alert).toBeHidden({ timeout: 5000 })

    // Edit modal should close (dismissed after delete)
    await expect(editModal3).toBeHidden({ timeout: 5000 })

    // Account should no longer be in the list
    await expect(page.locator('ion-item', { hasText: 'Cuenta Test E2E' })).toBeHidden({
      timeout: 5000,
    })
  })
})