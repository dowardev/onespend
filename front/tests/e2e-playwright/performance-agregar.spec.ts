// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect } from '@playwright/test'

// The Performance page: for each empty income-statement section it shows an "Agregar"
// button that navigates to the budget entry form, and a help button AFTER it whose popover
// explains what that concept/section MEANS (from the financial glossary).
// With an empty database all sections are empty, so both render for the first section.
test('Performance empty section: Agregar navigates and help explains the concept', async ({
  page,
}) => {
  await page.goto('/statistics/performance', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  const addBtn = page.locator('ion-button:has-text("Agregar")').first()
  await expect(addBtn, 'an "Agregar" button should render for an empty section').toBeVisible({
    timeout: 30000,
  })

  // The help button sits after "Agregar" (inside FinancialInfoPopover's trigger-slot)
  // and opens a concept-info popover (glossary).
  const helpTrigger = page.locator('ion-item.empty-section .trigger-slot').first()
  await expect(helpTrigger, 'a help trigger should sit after Agregar').toBeVisible()
  await helpTrigger.click()

  // It explains the concept (first empty section is "Ingresos"), not "no data".
  await expect(
    page.locator('.info-popover').filter({ visible: true }).first(),
    'concept info popover should open',
  ).toContainText('Todo el dinero que entra en el periodo', { timeout: 30000 })

  // Dismiss the popover, then "Agregar" navigates to the budget entry form.
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await addBtn.click()
  await expect(page).toHaveURL(/\/budget\/entry\/new/, { timeout: 30000 })
})

test('empty section Agregar carries entryType + date query params (REQ-6)', async ({ page }) => {
  await page.goto('/statistics/performance', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  // First empty section is "Ingresos" → incomes → entryType=ingreso.
  const addBtn = page.locator('ion-button:has-text("Agregar")').first()
  await expect(addBtn, 'an "Agregar" button should render for an empty section').toBeVisible({
    timeout: 30000,
  })
  await addBtn.click()
  await expect(page).toHaveURL(/\/budget\/entry\/new\?entryType=ingreso&date=\d{4}-\d{2}-\d{2}/, {
    timeout: 10000,
  })

  // A cost-of-life expense section must navigate as egreso with the period's anchor date.
  await page.goto('/statistics/performance', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  const costBtn = page.locator('ion-item.empty-section', { hasText: 'Costo de Vida' }).getByRole('button', {
    name: 'Agregar',
  })
  await expect(costBtn).toBeVisible({ timeout: 60000 })
  await costBtn.click()
  await expect(page).toHaveURL(/\/budget\/entry\/new\?entryType=egreso&date=\d{4}-\d{2}-\d{2}/, {
    timeout: 10000,
  })
})
