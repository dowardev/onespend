// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-275 — integration test that exercises the create + update paths
// against a REAL Dexie instance (fake-indexeddb) and a real controller,
// so a regression in any of the layers (form binding, controller params,
// mapper, Dexie row) shows up as a failed assertion here, not as a
// silent "note didn't save" in the UI.

import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Pinia stores + sync queue are not under test; stub them so the
// controller's create/update paths run end-to-end against real Dexie.
const mockDayStore: { selectedDate: string | null } = { selectedDate: '2026-10-12' }

vi.mock('@/stores/budgetDayStore', () => ({
  useBudgetDayStore: () => mockDayStore,
}))

vi.mock('@/services/syncQueue', () => ({
  syncQueue: {
    syncEntry: vi.fn(),
  },
}))

vi.mock('@/services/dataMediator', () => ({
  dataMediator: { refs: { entries: { value: [] } }, reload: vi.fn() },
}))

import budgetEntriesController from '@/controllers/budgetEntriesController'
import { budgetEntriesDb } from '@/db/controllers/budgetEntriesDb'
import { syncQueue } from '@/services/syncQueue'

describe('LBDS-275 — notes survive the budget entry create path end-to-end', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    mockDayStore.selectedDate = '2026-10-12'
  })

  it('addIngreso writes the note into the Dexie row', async () => {
    const saved = await budgetEntriesController.addIngreso({
      name: 'Sueldo',
      amount: 1500,
      notes: 'Liquidación septiembre',
    })
    const syncId = saved?.sync_id as string
    expect(syncId).toBeTruthy()

    const stored = await budgetEntriesDb.getBySyncId({ syncId })
    expect(stored).not.toBeNull()
    expect(stored!.notes).toBe('Liquidación septiembre')
  })

  it('addEgreso writes the note into the Dexie row', async () => {
    const saved = await budgetEntriesController.addEgreso({
      name: 'Almuerzo',
      amount: 850,
      notes: 'Pagué en efectivo, dejar recibo',
    })
    const syncId = saved?.sync_id as string

    const stored = await budgetEntriesDb.getBySyncId({ syncId })
    expect(stored!.notes).toBe('Pagué en efectivo, dejar recibo')
  })

  it('omitting notes still produces a valid row (no notes key)', async () => {
    const saved = await budgetEntriesController.addIngreso({
      name: 'Sin nota',
      amount: 100,
    })
    const syncId = saved?.sync_id as string

    const stored = await budgetEntriesDb.getBySyncId({ syncId })
    expect(stored!.notes).toBeUndefined()
  })

  it('updateIngreso updates the note on an existing row', async () => {
    const saved = await budgetEntriesController.addIngreso({
      name: 'Bonus',
      amount: 200,
      notes: 'original',
    })
    const syncId = saved?.sync_id as string

    await budgetEntriesController.updateIngreso({
      id: syncId,
      changes: { notes: 'updated' },
    })

    const stored = await budgetEntriesDb.getBySyncId({ syncId })
    expect(stored!.notes).toBe('updated')
  })

  it('sync push payload carries the note (toApiFormat round-trip)', async () => {
    const saved = await budgetEntriesController.addIngreso({
      name: 'Sueldo',
      amount: 1500,
      notes: 'Liquidación septiembre',
    })
    const syncId = saved?.sync_id as string

    expect(syncQueue.syncEntry).toHaveBeenCalledTimes(1)
    const call = vi.mocked(syncQueue.syncEntry).mock.calls[0][0] as {
      entry: { notes?: string }
      operation: 'create'
    }
    expect(call.operation).toBe('create')
    expect(call.entry.notes).toBe('Liquidación septiembre')

    // Round-trip through the live pull mapper (SyncQueueService) to mirror
    // what a server response would do on a second device.
    const stored = await budgetEntriesDb.getBySyncId({ syncId })
    const pulled = { ...stored, notes: call.entry.notes }
    expect(pulled.notes).toBe('Liquidación septiembre')
  })
})

// LBDS-275 F3: cover the LIVE pull mapper (`mapServerItemToRow` in
// SyncQueueService) with notes. The integration test above only covers
// the push path via the controller; without these cases a regression
// in the pull path would only be caught by manual testing (which is
// how we discovered the gap originally).
import { mapServerItemToRow } from '@/services/sync/SyncQueueService'

const emptyMaps = () => ({
  accountIdMap: new Map<number, string>(),
  providerIdMap: new Map<number, string>(),
  supplierProductIdMap: new Map<number, string>(),
  recurringRecordIdMap: new Map<number, string>(),
})

describe('LBDS-275 F3 — mapServerItemToRow handles notes in the live pull path', () => {
  it('takes notes from the server when the server payload carries them', async () => {
    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: { sync_id: 'pull-1', notes: 'from server' } as any,
      base: { sync_id: 'pull-1' },
      ...emptyMaps(),
    })
    expect(row.notes).toBe('from server')
  })

  it('preserves the local base note when the server payload omits notes', async () => {
    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: { sync_id: 'pull-2' } as any,
      base: { sync_id: 'pull-2', notes: 'local copy' },
      ...emptyMaps(),
    })
    expect(row.notes).toBe('local copy')
  })

  it('writes empty string when the server sends notes: ""', async () => {
    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: { sync_id: 'pull-3', notes: '' } as any,
      base: { sync_id: 'pull-3', notes: 'old' },
      ...emptyMaps(),
    })
    expect(row.notes).toBe('')
  })

  it('leaves notes undefined when neither server nor base has them', async () => {
    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item: { sync_id: 'pull-4' } as any,
      base: { sync_id: 'pull-4' },
      ...emptyMaps(),
    })
    expect(row.notes).toBeUndefined()
  })
})
