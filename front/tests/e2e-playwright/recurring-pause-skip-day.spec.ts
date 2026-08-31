import { test, expect } from '@playwright/test'

// Regression: a recurring record resumed today AFTER its due time must NOT backfill the
// paused day. The schedule should continue from the next occurrence instead.
test('resumed-after-time does not insert the paused day', async ({ page }) => {
  await page.goto('/recurring', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  // Seed so an account exists for the record.
  await page.locator('ion-header ion-buttons[slot="end"] > ion-button').first().click()
  await page.waitForTimeout(600)

  const syncId = await page.evaluate(async () => {
    const now = new Date()
    const past = new Date(now.getTime() - 5 * 60 * 1000) // 5 min ago, always today
    const time = `${String(past.getHours()).padStart(2, '0')}:${String(past.getMinutes()).padStart(2, '0')}`
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const id = 'test-paused-' + Date.now()
    return await new Promise<string>((resolve, reject) => {
      const req = indexedDB.open('OneSpendDB')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(['recurringRecords', 'accounts'], 'readwrite')
        const accReq = tx.objectStore('accounts').getAll()
        accReq.onsuccess = () => {
          const acc = (accReq.result as any[])[0]
          const rec = {
            sync_id: id,
            type: 'cargo',
            entryType: 'egreso',
            name: 'CargoPausaTest',
            amount: 100,
            accountId: acc ? (acc.sync_id ?? acc.id) : null,
            repeatFrequency: 'day',
            repeatInterval: 1,
            time,
            autoInsert: true,
            startDate: today,
            status: 'paused',
            createdAt: Date.now(),
          }
          tx.objectStore('recurringRecords').put(rec)
          tx.oncomplete = () => resolve(id)
          tx.onerror = () => reject(tx.error)
        }
        accReq.onerror = () => reject(accReq.error)
      }
      req.onerror = () => reject(req.error)
    })
  })

  // Reload so the list renders the new (paused) record.
  await page.reload({ waitUntil: 'networkidle' })
  const row = page.locator('ion-item', { hasText: 'CargoPausaTest' }).first()
  await row.waitFor({ state: 'visible', timeout: 30000 })

  // Resume (the due time already elapsed while paused).
  await row.locator('ion-button').first().click()
  await page.waitForTimeout(800)

  const inserted = await page.evaluate(async (sid) => {
    return await new Promise<boolean>((resolve) => {
      const req = indexedDB.open('OneSpendDB')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('budgetEntries', 'readonly')
        const all = tx.objectStore('budgetEntries').getAll()
        all.onsuccess = () => {
          const now = new Date()
          const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
          const rows = all.result as Array<{ _fromRecurringId?: string; date?: string }>
          resolve(rows.some((r) => r._fromRecurringId === sid && r.date === today))
        }
        all.onerror = () => resolve(false)
      }
      req.onerror = () => resolve(false)
    })
  }, syncId)

  expect(inserted, 'a record resumed after its due time must NOT insert the paused day').toBe(false)
})
