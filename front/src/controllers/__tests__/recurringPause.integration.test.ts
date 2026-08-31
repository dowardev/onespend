// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { recurringRecordsController } from '@/controllers/recurringRecordsController'
import { recurringRecordsDb } from '@/db/controllers/recurringRecordsDb'

// Integration test against a REAL Dexie instance (fake-indexeddb).
// Reproduces the exact reported bug: a synced record that carries sync_id but NOT id.

function makeRow(syncId: string, status: 'active' | 'paused') {
  return {
    sync_id: syncId,
    type: 'cargo',
    entryType: 'egreso',
    name: 'Luz',
    repeatFrequency: 'day',
    repeatInterval: 1,
    autoInsert: true,
    startDate: '2026-01-01',
    status,
  } as any
}

// Mirrors RecurringPage.toggleRecord: const recId = record.sync_id ?? record.id
async function toggleLikeThePage(syncId: string) {
  const all = await recurringRecordsController.getAllRecords()
  const rec = all.find((r) => r.sync_id === syncId)
  if (!rec) throw new Error('record not found')
  const recId = rec.sync_id ?? rec.id
  await recurringRecordsController.toggleActive({ id: recId })
}

describe('pause toggle against real Dexie storage', () => {
  it('flips an active synced record (sync_id only, no id) to paused and persists', async () => {
    const syncId = 'rec-int-1'
    await recurringRecordsDb.put({ entry: makeRow(syncId, 'active') })

    await toggleLikeThePage(syncId)

    const after = await recurringRecordsController.getAllRecords()
    const stored = after.find((r) => r.sync_id === syncId)
    expect(stored?.status).toBe('paused')
  })

  it('resume flips it back to active', async () => {
    const syncId = 'rec-int-2'
    await recurringRecordsDb.put({ entry: makeRow(syncId, 'paused') })

    await toggleLikeThePage(syncId)

    const after = await recurringRecordsController.getAllRecords()
    const stored = after.find((r) => r.sync_id === syncId)
    expect(stored?.status).toBe('active')
  })

  it('getAllRecords reflects the toggled status so the UI re-renders', async () => {
    const syncId = 'rec-int-3'
    await recurringRecordsDb.put({ entry: makeRow(syncId, 'active') })
    await toggleLikeThePage(syncId)
    const all = await recurringRecordsController.getAllRecords()
    const stored = all.find((r) => r.sync_id === syncId)
    // the template binds record.status -> label 'Pausar' / 'Reanudar'
    expect(stored?.status).toBe('paused')
  })
})
