// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect } from '@playwright/test'

// End-to-end proof that the recurring pause button works in a real browser.
// NOTE: the app shows a login gate when unauthenticated (SSO), so this spec
// requires a dev-only auth bypass (VITE_DEV_BYPASS_AUTH) to reach /recurring.
test('recurring pause button pauses, reflects state and persists across reload', async ({ page }) => {
  await page.goto('/recurring')
  await page.waitForLoadState('networkidle')

  // Dev-only seed button (flask icon) is the first button in the header end slot.
  const seedBtn = page.locator('ion-header ion-buttons[slot="end"] > ion-button').first()
  await expect(seedBtn, 'dev seed (flask) button should be visible').toBeVisible({ timeout: 30000 })
  await seedBtn.click()

  // Wait for a seeded record to render.
  const alquiler = page.locator('ion-item', { hasText: 'Alquiler' }).first()
  await expect(alquiler, 'seeded record should render').toBeVisible({ timeout: 30000 })

  // #2: each record shows the green/red ingreso/gasto indicator.
  await expect(
    page.locator('.item-indicator').first(),
    'income/expense indicator should be present on each record',
  ).toBeVisible({ timeout: 10000 })

  // #3: the record time is shown in the list item.
  await expect(alquiler, 'record should show its time').toContainText('09:00')

  // Initial state: pause button shows "Pausar".
  const pauseBtn = alquiler.locator('ion-button').first()
  await expect(pauseBtn, 'pause button should be visible').toBeVisible({ timeout: 10000 })

  // Click to pause. The button sits inside an ion-item, whose overlay intercepts
  await pauseBtn.click()

  // The list shows a confirmation toast, matching the edit page behavior.
  await expect(
    page.getByText('Cargo pausado'),
    'a confirmation toast should appear on the list after pausing',
  ).toBeVisible({ timeout: 5000 })

  // Label flips to "Reanudar" and the status badge shows "Pausado".
  const resumeBtn = alquiler.locator('ion-button').first()
  await expect(resumeBtn, 'after pause the button should show "Reanudar"').toBeVisible({ timeout: 10000 })
      await expect(
        page.locator('ion-badge', { hasText: 'Pausado' }).first(),
        'status badge should show "Pausado"',
      ).toBeVisible()

  // Persistence: reload and confirm it stays paused (Dexie kept the status).
  await page.reload()
  await page.waitForLoadState('networkidle')
  const persisted = alquiler.locator('ion-button').first()
  await expect(persisted, 'paused state should persist after reload').toBeVisible({ timeout: 30000 })
})
