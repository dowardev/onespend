// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SyncQueueService } from '../SyncQueueService'
import { syncQueueDb } from '@/db/controllers/syncQueueDb'
import { budgetEntriesDb } from '@/db/controllers/budgetEntriesDb'
import { syncApiService } from '../SyncApiService'
import { syncLockService } from '../SyncLockService'
import pendingAttachmentsService from '../../pendingAttachmentsService'
import type { SyncQueueItem } from '@/db/types'

// LBDS-244: el scheduler de reintentos no debe girar mientras no hay red, y un
// lock ocupado debe re-chequear la cola hasta que se libere, drenándola.
interface SchedulerProbe {
  scheduleBackoffRetry(): Promise<void>
  handleOffline(): void
  handleOnline(): void
  notifyAuthExpired(): void
}

function makeItem(): SyncQueueItem {
  return {
    id: 'q-1',
    entityType: 'budget_entry',
    operation: 'create',
    data: { name: 'test' },
    timestamp: Date.now(),
    retryCount: 0,
  }
}

function mergeOkResponse(): Response {
  return {
    status: 200,
    ok: true,
    statusText: 'OK',
    json: async () => ({
      success: true,
      serverTime: 1_700_000_000,
      results: {
        created: { budget_entry: [{ sync_id: 'q-1', id: 10 }] },
        updated: {},
        deleted: {},
        skipped: {},
        errors: {},
        conflicts: {},
      },
      errors: {},
      conflicts: {},
    }),
  } as unknown as Response
}

function changesOkResponse(): Response {
  return {
    status: 200,
    ok: true,
    statusText: 'OK',
    json: async () => ({ changes: {}, cursor: null, serverTime: 1_700_000_000 }),
  } as unknown as Response
}

describe('SyncQueueService retry scheduling (LBDS-244)', () => {
  let service: SyncQueueService
  let probe: SchedulerProbe

  beforeEach(() => {
    vi.useFakeTimers()
    service = new SyncQueueService()
    probe = service as unknown as SchedulerProbe
    vi.spyOn(syncLockService, 'release').mockImplementation(() => {})
    vi.spyOn(syncApiService, 'cancelActiveRequests').mockImplementation(() => {})
  })

  afterEach(() => {
    service.dispose()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('no arma reintentos mientras estamos offline', async () => {
    const getAll = vi.spyOn(syncQueueDb, 'getAll')
    service.setOnline(false)

    await probe.scheduleBackoffRetry()

    expect(getAll).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancela un reintento ya armado al pasar a offline', async () => {
    vi.spyOn(syncQueueDb, 'getAll').mockResolvedValue([makeItem()])
    service.setOnline(true)

    await probe.scheduleBackoffRetry()
    expect(vi.getTimerCount()).toBe(1)

    probe.handleOffline()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reintenta con el lock ocupado y drena la cola cuando el lock se libera', async () => {
    let queue: SyncQueueItem[] = [makeItem()]
    vi.spyOn(syncQueueDb, 'getAll').mockImplementation(async () => [...queue])
    vi.spyOn(syncQueueDb, 'bulkDelete').mockImplementation(async ({ ids }) => {
      queue = queue.filter((item) => !ids.includes(item.id))
    })
    vi.spyOn(syncQueueDb, 'count').mockImplementation(async () => queue.length)
    vi.spyOn(budgetEntriesDb, 'getBySyncId').mockResolvedValue(null)
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([])
    vi.spyOn(syncApiService, 'getActiveConflicts').mockResolvedValue({ ok: false } as Response)
    const merge = vi.spyOn(syncApiService, 'merge').mockResolvedValue(mergeOkResponse())
    vi.spyOn(syncLockService, 'acquire')
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true)
    service.setOnline(true)

    await service.processQueue()
    await vi.advanceTimersByTimeAsync(0)

    expect(vi.getTimerCount()).toBe(1)
    expect(merge).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1500)

    expect(merge).toHaveBeenCalledTimes(1)
    expect(queue).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reanuda un reintento interrumpido al volver online y drena la cola', async () => {
    let queue: SyncQueueItem[] = [{ ...makeItem(), retryCount: 2 }]
    vi.spyOn(syncQueueDb, 'getAll').mockImplementation(async () => [...queue])
    vi.spyOn(syncQueueDb, 'bulkDelete').mockImplementation(async ({ ids }) => {
      queue = queue.filter((item) => !ids.includes(item.id))
    })
    vi.spyOn(syncQueueDb, 'count').mockImplementation(async () => queue.length)
    vi.spyOn(budgetEntriesDb, 'getBySyncId').mockResolvedValue(null)
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([])
    vi.spyOn(syncApiService, 'getActiveConflicts').mockResolvedValue({ ok: false } as Response)
    const merge = vi.spyOn(syncApiService, 'merge').mockResolvedValue(mergeOkResponse())
    vi.spyOn(syncLockService, 'acquire').mockResolvedValue(true)

    service.setOnline(false)
    probe.handleOnline()
    await vi.advanceTimersByTimeAsync(0)

    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(1500)

    expect(merge).toHaveBeenCalledTimes(1)
    expect(queue).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('no arma nada al volver online si sólo hay items frescos', async () => {
    const getAll = vi.spyOn(syncQueueDb, 'getAll').mockResolvedValue([makeItem()])

    service.setOnline(false)
    probe.handleOnline()
    await vi.advanceTimersByTimeAsync(0)

    expect(getAll).toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('no arma reintentos bloqueado por auth y los reanuda tras una respuesta exitosa', async () => {
    vi.spyOn(syncQueueDb, 'getAll').mockResolvedValue([{ ...makeItem(), retryCount: 2 }])
    vi.spyOn(syncApiService, 'getChanges').mockResolvedValue(changesOkResponse())
    service.setOnline(true)

    probe.notifyAuthExpired()
    await probe.scheduleBackoffRetry()
    expect(vi.getTimerCount()).toBe(0)

    await service.pullChanges()
    await vi.advanceTimersByTimeAsync(0)

    expect(vi.getTimerCount()).toBe(1)
  })
})
