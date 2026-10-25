// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect } from '@playwright/test'

// Verifies the time selector refinements on a new recurring record:
//  - the Hora field only appears when auto-insert is on
//  - a new record defaults the time to "now" (HH:mm)
//  - opening the picker shows an ion-datetime time picker
//
// Note: capturing a wheel-selected time is not asserted here because Ionic
// virtualizes the picker options inside a shadow DOM, so a synthetic click/
// dispatch cannot faithfully drive ion-datetime's scroll. The capture logic
// (`@update:model-value` -> onTimeWheelChange -> confirmTime) mirrors the date
// picker, which is covered by recurring-enddate-edit.spec.ts.
test('time selector renders with a current-time default', async ({ page }) => {
  await page.goto('/recurring/edit', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('ion-content', { timeout: 60000 })
  await page.waitForTimeout(600)

  // Hora is hidden until auto-insert is enabled.
  const horaItem = page.locator('ion-item', { hasText: 'Hora' })
  await expect(horaItem, 'hora item hidden before auto-insert').toHaveCount(0)

  const autoToggle = page.locator('ion-toggle', { hasText: 'Auto-insertar' }).first()
  await autoToggle.click()
  await page.waitForTimeout(300)

  await expect(horaItem, 'hora item visible after auto-insert').toBeVisible()

  // New record defaults the time to "now" (HH:mm, 24h).
  const label = (await horaItem.innerText()).replace(/\s+/g, ' ').trim()
  console.log('--- TIME DEFAULT ---', label)
  expect(label, 'hora label should show a HH:mm time by default').toMatch(/Hora\s+\d{2}:\d{2}/)

  // Opening the picker shows a time datetime.
  await horaItem.click()
  await expect(page.locator('ion-datetime:visible').first(), 'time picker opens').toBeVisible({ timeout: 30000 })
})
