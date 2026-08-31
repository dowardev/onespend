import { test, expect } from '@playwright/test'

async function readStatus(page: any, syncId: string): Promise<string> {
  return await page.evaluate(async (id) => {
    return await new Promise<string>((resolve) => {
      const req = indexedDB.open('OneSpendDB')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('recurringRecords', 'readonly')
        const all = tx.objectStore('recurringRecords').getAll()
        all.onsuccess = () => {
          const rec = (all.result as any[]).find((r) => r.sync_id === id)
          resolve(rec ? rec.status : '')
        }
        all.onerror = () => resolve('')
      }
    })
  }, syncId)
}

// The pause/resume action lives in the header "..." popover of the edit page.
// For synced records recordId used to be null (only found.id was used), so the
// button did nothing. Now recordId is set to sync_id and the toggle works in both directions.
test('edit-page header popover pauses and resumes', async ({ page }) => {
  await page.goto('/recurring', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  await page.locator('ion-header ion-buttons[slot="end"] > ion-button').first().click()
  await page.waitForTimeout(600)
  await page.reload({ waitUntil: 'networkidle' })

  const syncId = await page.evaluate(async () => {
    return await new Promise<string>((resolve) => {
      const req = indexedDB.open('OneSpendDB')
      req.onsuccess = () => {
        const tx = req.result.transaction('recurringRecords', 'readonly')
        const all = tx.objectStore('recurringRecords').getAll()
        all.onsuccess = () => {
          const rec = (all.result as any[]).find((r) => r.name === 'Alquiler')
          resolve(rec ? rec.sync_id : '')
        }
        all.onerror = () => resolve('')
      }
    })
  })
  expect(syncId, 'Alquiler seeded').not.toBe('')

  // Open the edit page for the seeded record.
  await page.locator('ion-item', { hasText: 'Alquiler' }).first().click()
  await page.waitForTimeout(400)

  // Header "..." button (2nd end button of the "Editar Cargo" header).
  const headerBtn = page.locator('ion-header:has(ion-title:has-text("Editar Cargo")) ion-buttons[slot="end"] ion-button').nth(1)

  await headerBtn.click()
  await page.locator('ion-popover:visible ion-item', { hasText: 'Pausar' }).first().click()
  await page.waitForTimeout(500)
  expect(await readStatus(page, syncId), 'paused after Pausar').toBe('paused')

  await headerBtn.click()
  await page.locator('ion-popover:visible ion-item', { hasText: 'Reanudar' }).first().click()
  await page.waitForTimeout(500)
  expect(await readStatus(page, syncId), 'active after Reanudar').toBe('active')
})
