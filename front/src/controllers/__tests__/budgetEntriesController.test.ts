// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/db/controllers/budgetEntriesDb', () => ({
  budgetEntriesDb: {
    getBySyncId: vi.fn(),
    delete: vi.fn(),
    add: vi.fn(),
  },
}))

vi.mock('@/services/syncQueue', () => ({
  syncQueue: {
    syncEntry: vi.fn(),
  },
}))

// LBDS-273: the create path reads the selected date from the budget-day
// store, which needs an active Pinia. The tests always pass an explicit
// `date`, so the store only has to exist.
vi.mock('@/stores/budgetDayStore', () => ({
  useBudgetDayStore: () => ({ selectedDate: '2026-10-18' }),
}))

// Mutable mock store so each test can set the date-filtered `entries`.
const mockStore: { entries: any[] } = { entries: [] }

vi.mock('@/stores/budgetEntriesStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/budgetEntriesStore')>()
  return {
    ...actual,
    useBudgetEntriesStore: () => mockStore,
  }
})

import budgetEntriesController from '@/controllers/budgetEntriesController'
import { budgetEntriesDb } from '@/db/controllers/budgetEntriesDb'
import { syncQueue } from '@/services/syncQueue'
import { mapEntryRow as importedMapEntryRow } from '@/stores/budgetEntriesStore'

describe('BudgetEntriesController.removeEntry (LBDS-279)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.entries = []
    vi.mocked(budgetEntriesDb.getBySyncId).mockResolvedValue(undefined as any)
    vi.mocked(budgetEntriesDb.delete).mockResolvedValue(undefined as any)
    vi.mocked(syncQueue.syncEntry).mockReturnValue(undefined as any)
    // Sanity guard: the store mock uses `...actual` to preserve the rest of
    // the module's exports (notably `mapEntryRow`, used by the deep-link
    // fallback path). If a future vitest version makes the spread drop
    // function exports, the fallback-path tests would silently misbehave;
    // this assertion fails loudly instead.
    expect(typeof importedMapEntryRow).toBe('function')
  })

  it('deletes an entry that is in the date-filtered store (happy path)', async () => {
    mockStore.entries = [
      { id: 'uuid-in', sync_id: 'uuid-in', name: 'Test', date: '2026-09-26' },
    ]

    await budgetEntriesController.removeEntry({ id: 'uuid-in' })

    expect(budgetEntriesDb.delete).toHaveBeenCalledWith({ syncId: 'uuid-in' })
    expect(syncQueue.syncEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: expect.objectContaining({ sync_id: 'uuid-in' }),
        operation: 'delete',
      })
    )
    // No DB fallback needed — entry was in the store.
    expect(budgetEntriesDb.getBySyncId).not.toHaveBeenCalled()
  })

  it('falls back to Dexie when the entry is NOT in the store (deep-link scenario)', async () => {
    // Reproduces LBDS-279: opening /budget/entry/edit?entryId=... directly
    // loads the entry through useEntryLoader, which does NOT push it into
    // the date-filtered Pinia store. Before the fix, removeEntry's store
    // find() returned undefined and the delete was silently skipped.
    mockStore.entries = []
    const dbRow = {
      sync_id: 'uuid-dl',
      name: 'Loaded from deep link',
      date: '2026-09-25',
      amount: 100,
      paymentType: 'cash',
      entryType: 'egreso',
      createdAt: 1700000000,
    }
    vi.mocked(budgetEntriesDb.getBySyncId).mockResolvedValue(dbRow as any)

    await budgetEntriesController.removeEntry({ id: 'uuid-dl' })

    expect(budgetEntriesDb.getBySyncId).toHaveBeenCalledWith({ syncId: 'uuid-dl' })
    expect(budgetEntriesDb.delete).toHaveBeenCalledWith({ syncId: 'uuid-dl' })
    expect(syncQueue.syncEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: expect.objectContaining({ sync_id: 'uuid-dl' }),
        operation: 'delete',
      })
    )
  })

  it('is a no-op when the entry is in neither the store nor Dexie', async () => {
    mockStore.entries = []
    vi.mocked(budgetEntriesDb.getBySyncId).mockResolvedValue(undefined as any)

    await budgetEntriesController.removeEntry({ id: 'ghost-id' })

    expect(budgetEntriesDb.getBySyncId).toHaveBeenCalledWith({ syncId: 'ghost-id' })
    expect(budgetEntriesDb.delete).not.toHaveBeenCalled()
    expect(syncQueue.syncEntry).not.toHaveBeenCalled()
  })

  it('matches ids using String() coercion (entry.id may be numeric)', async () => {
    mockStore.entries = [
      { id: 7, sync_id: 'uuid-7', name: 'Numeric id', date: '2026-09-26' },
    ]

    await budgetEntriesController.removeEntry({ id: '7' as any })

    expect(budgetEntriesDb.delete).toHaveBeenCalledWith({ syncId: 'uuid-7' })
    expect(budgetEntriesDb.getBySyncId).not.toHaveBeenCalled()
  })

  // --- error propagation (needed so the caller can show an error toast) ---

  it('re-throws when budgetEntriesDb.delete fails', async () => {
    mockStore.entries = [{ id: 'uuid-err', sync_id: 'uuid-err', name: 'Boom', date: '2026-09-26' }]
    vi.mocked(budgetEntriesDb.delete).mockRejectedValueOnce(new Error('Dexie write failed'))

    await expect(budgetEntriesController.removeEntry({ id: 'uuid-err' }))
      .rejects.toThrow('Dexie write failed')
    expect(syncQueue.syncEntry).not.toHaveBeenCalled()
  })

  it('re-throws when syncQueue.syncEntry fails', async () => {
    mockStore.entries = [{ id: 'uuid-sync', sync_id: 'uuid-sync', name: 'Sync fail', date: '2026-09-26' }]
    vi.mocked(syncQueue.syncEntry).mockImplementationOnce(() => {
      throw new Error('Sync queue down')
    })

    await expect(budgetEntriesController.removeEntry({ id: 'uuid-sync' }))
      .rejects.toThrow('Sync queue down')
    // The local Dexie delete still happened (we did call it before the sync),
    // but the error has to bubble so the UI can show an error toast.
    expect(budgetEntriesDb.delete).toHaveBeenCalledWith({ syncId: 'uuid-sync' })
  })

  it('re-throws when the Dexie delete fails in the deep-link fallback path', async () => {
    // Store empty, entry found via DB fallback, but Dexie delete fails.
    mockStore.entries = []
    const dbRow = { sync_id: 'uuid-dl-err', name: 'DL boom', date: '2026-09-25' }
    vi.mocked(budgetEntriesDb.getBySyncId).mockResolvedValue(dbRow as any)
    vi.mocked(budgetEntriesDb.delete).mockRejectedValueOnce(new Error('IndexedDB locked'))

    await expect(budgetEntriesController.removeEntry({ id: 'uuid-dl-err' }))
      .rejects.toThrow('IndexedDB locked')
  })
})

// LBDS-273 (GitLab #13): the create path must carry the optional `time`
// through to the Dexie row. The controller's fixed param list used to drop
// it, so a time picked in the entry form never reached storage.
describe('BudgetEntriesController create path — time (LBDS-273)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.entries = []
    vi.mocked(budgetEntriesDb.add).mockResolvedValue(undefined as any)
    vi.mocked(syncQueue.syncEntry).mockResolvedValue(undefined as any)
  })

  it('persists the time on addIngreso', async () => {
    await budgetEntriesController.addIngreso({
      name: 'Café',
      amount: 5,
      date: '2026-10-18',
      time: '14:30',
    })

    expect(budgetEntriesDb.add).toHaveBeenCalledTimes(1)
    const added = vi.mocked(budgetEntriesDb.add).mock.calls[0][0] as any
    expect(added.entry.time).toBe('14:30')
  })

  it('persists the time on addEgreso', async () => {
    await budgetEntriesController.addEgreso({
      name: 'Café',
      amount: 5,
      date: '2026-10-18',
      time: '14:30',
    })

    expect(budgetEntriesDb.add).toHaveBeenCalledTimes(1)
    const added = vi.mocked(budgetEntriesDb.add).mock.calls[0][0] as any
    expect(added.entry.time).toBe('14:30')
  })

  it('leaves the time undefined when the form sent none', async () => {
    await budgetEntriesController.addEgreso({
      name: 'Café',
      amount: 5,
      date: '2026-10-18',
    })

    const added = vi.mocked(budgetEntriesDb.add).mock.calls[0][0] as any
    expect(added.entry.time).toBeUndefined()
  })
})
