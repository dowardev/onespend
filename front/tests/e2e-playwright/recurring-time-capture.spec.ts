import { test, expect } from '@playwright/test'

// Proves the selected time value is captured into formData and shown in the label.
// We simulate the user selecting 9:45 PM by firing the real `ionChange` event on the
// ion-datetime (the same event a scroll/click interaction emits), then click "Aplicar".
test('selected time value is captured and shown', async ({ page }) => {
  await page.goto('/recurring/edit', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('ion-content', { timeout: 30000 })
  await page.waitForTimeout(600)

  await page.locator('ion-toggle', { hasText: 'Auto-insertar' }).first().click()
  await page.waitForTimeout(300)

  await page.locator('ion-item', { hasText: 'Hora' }).first().click()
  await page.waitForTimeout(500)

  const dt = page.locator('ion-datetime:visible').first()
  await dt.waitFor({ state: 'visible', timeout: 10000 })

  // Simulate the user selecting 9:45 PM
  await dt.evaluate((el: any) => {
    const next = '2026-08-29T21:45:00'
    el.value = next
    el.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, composed: true, detail: { value: next } }))
  })
  await page.waitForTimeout(300)

  await page.locator('ion-popover:visible ion-button', { hasText: 'Aplicar' }).click()
  await page.waitForTimeout(400)

  const labelAfter = (await page.locator('ion-item', { hasText: 'Hora' }).first().innerText())
    .replace(/\s+/g, ' ')
    .trim()
  console.log('LABEL AFTER:', labelAfter)

  expect(labelAfter).toContain('21:45')
})
