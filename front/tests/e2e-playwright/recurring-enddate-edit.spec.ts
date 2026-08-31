// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect } from '@playwright/test'

// Reproduces the user's report: when adding a NEW recurring record, the end-date
// picker cannot be modified. We open the picker, select a future date, apply, and
// check whether the displayed end date actually changes.
test('end-date picker can be modified on a new recurring record', async ({ page }) => {
  // New recurring record form.
  await page.goto('/recurring/edit')
  await page.waitForSelector('ion-content', { timeout: 30000 })
  await page.waitForTimeout(800)
  console.log('URL:', page.url())
  const allItems = await page.locator('ion-item').allInnerTexts().catch(() => [] as string[])
  console.log('ITEMS:', JSON.stringify(allItems.slice(0, 40)))
  const contentText = await page.locator('ion-content').first().innerText().catch(() => '(no content)')
  console.log('CONTENT:', contentText.slice(0, 600))

  // Locate the "Fecha de fin" item and read its current (default = today) display.
  const endDateItem = page.locator('ion-item', { hasText: 'Fecha de fin' }).first()
  await expect(endDateItem, 'end-date item should render').toBeVisible({ timeout: 30000 })
  const before = (await endDateItem.innerText()).replace(/\s+/g, ' ').trim()
  console.log('--- ENDDATE BEFORE ---', before)

  // Open the picker.
  await endDateItem.click()
  const dt = page.locator('ion-datetime:visible').first()
  await expect(dt, 'datetime picker should open').toBeVisible({ timeout: 10000 })

  // Select a future date the way a user would (ionChange is what ion-datetime emits).
  await dt.evaluate((el) => {
    const next = '2031-07-22'
    el.value = next
    el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: next } }))
  })
  await page.waitForTimeout(300)

  // Apply.
  const applyBtn = page.locator('ion-button:visible', { hasText: 'Aplicar' }).first()
  await expect(applyBtn, 'apply button should be visible').toBeVisible()
  await applyBtn.click()
  await page.waitForTimeout(500)

  const after = (await endDateItem.innerText()).replace(/\s+/g, ' ').trim()
  console.log('--- ENDDATE AFTER ---', after)

  const changed = after !== before
  console.log('--- ENDDATE CHANGED ---', changed)

  test.info().annotations.push({ type: 'result', description: `before=${before}; after=${after}; changed=${changed}` })

  expect(changed, 'end-date display should reflect the newly selected future date').toBeTruthy()
})
