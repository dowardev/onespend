// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/db/controllers/recurringRecordsDb', () => ({
  recurringRecordsDb: {
    getAll: vi.fn(),
    getBySyncId: vi.fn(),
    add: vi.fn(),
    put: vi.fn(),
    getActive: vi.fn(),
  },
}))

vi.mock('@/services/syncQueue', () => ({
  syncQueue: {
    syncRecurringRecord: vi.fn(),
  },
}))

import { recurringRecordsController } from '@/controllers/recurringRecordsController'
import { recurringRecordsDb } from '@/db/controllers/recurringRecordsDb'
import { syncQueue } from '@/services/syncQueue'

describe('RecurringRecordsController.toggleActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('flips an active record to paused and persists it', async () => {
    const stored = { id: 'rec-1', sync_id: 'rec-1', status: 'active', name: 'Netflix' }
    vi.mocked(recurringRecordsDb.getAll).mockResolvedValue([stored] as any)

    await recurringRecordsController.toggleActive({ id: 'rec-1' })

    expect(recurringRecordsDb.put).toHaveBeenCalledTimes(1)
    const putArg = vi.mocked(recurringRecordsDb.put).mock.calls[0][0]
    expect(putArg.entry.status).toBe('paused')
    expect(syncQueue.syncRecurringRecord).toHaveBeenCalled()
  })

  it('flips a paused record back to active', async () => {
    const stored = { id: 'rec-2', sync_id: 'rec-2', status: 'paused', name: 'Spotify' }
    vi.mocked(recurringRecordsDb.getAll).mockResolvedValue([stored] as any)

    await recurringRecordsController.toggleActive({ id: 'rec-2' })

    const putArg = vi.mocked(recurringRecordsDb.put).mock.calls[0][0]
    expect(putArg.entry.status).toBe('active')
  })

  it('does nothing when the id is not found', async () => {
    vi.mocked(recurringRecordsDb.getAll).mockResolvedValue([] as any)

    await recurringRecordsController.toggleActive({ id: 'missing' })

    expect(recurringRecordsDb.put).not.toHaveBeenCalled()
    expect(syncQueue.syncRecurringRecord).not.toHaveBeenCalled()
  })

  it('resolves the record by String(id) comparison (sync_id based)', async () => {
    // stored id is a number, looked up with a string id -> String() must match
    const stored = { id: 7, sync_id: 'rec-7', status: 'active' }
    vi.mocked(recurringRecordsDb.getAll).mockResolvedValue([stored] as any)

    await recurringRecordsController.toggleActive({ id: '7' as any })

    const putArg = vi.mocked(recurringRecordsDb.put).mock.calls[0][0]
    expect(putArg.entry.status).toBe('paused')
  })

  it('resolves a synced record that has only sync_id and NO id field (real DB row shape)', async () => {
    // Reproduces the reported bug: rows persisted from sync/seed carry sync_id but not id.
    const stored = { sync_id: 'rec-x', status: 'active', name: 'Luz' }
    vi.mocked(recurringRecordsDb.getAll).mockResolvedValue([stored] as any)

    await recurringRecordsController.toggleActive({ id: 'rec-x' })

    expect(recurringRecordsDb.put).toHaveBeenCalledTimes(1)
    const putArg = vi.mocked(recurringRecordsDb.put).mock.calls[0][0]
    expect(putArg.entry.status).toBe('paused')
  })
})
