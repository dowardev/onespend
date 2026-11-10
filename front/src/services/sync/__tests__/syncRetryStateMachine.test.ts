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

// LBDS-289: sync ON, so the retry assertions keep their shape.
vi.mock('@/db/controllers/configDb', () => ({
  configDb: {
    get: vi.fn(async ({ key }: { key: string }) => {
      if (key === 'syncEnabled') return true
      if (key === 'syncServerUrl') return 'https://example.test'
      return undefined
    }),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  },
}))

interface SchedulerProbe {
  rescheduleRetries(): Promise<void>
  handleOffline(): void
  handleOnline(): void
  notifyAuthExpired(): void
}

function makeItem(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: 'q-1',
    entityType: 'budget_entry',
    operation: 'create',
    data: { name: 'test' },
    timestamp: Date.now(),
    retryCount: 0,
    ...overrides,
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

function mergeFailResponse(): Response {
  return {
    status: 500,
    ok: false,
    statusText: 'Server Error',
    json: async () => ({ success: false, error: 'Server error' }),
  } as unknown as Response
}

/**
 * GitLab #14 (LBDS-272): the four findings accepted into main, plus the
 * "no duplicated timer" acceptance criterion.
 */
describe('Sync retry state machine (GitLab #14)', () => {
  let service: SyncQueueService
  let probe: SchedulerProbe
  let queue: SyncQueueItem[]

  beforeEach(() => {
    vi.useFakeTimers()
    queue = [makeItem()]
    service = new SyncQueueService()
    probe = service as unknown as SchedulerProbe
    vi.spyOn(syncLockService, 'release').mockImplementation(() => {})
    vi.spyOn(syncApiService, 'cancelActiveRequests').mockImplementation(() => {})
    vi.spyOn(syncQueueDb, 'getAll').mockImplementation(async () => [...queue])
    vi.spyOn(syncQueueDb, 'bulkPut').mockImplementation(async ({ entries }) => {
      for (const entry of entries) {
        queue = queue.map((item) => (item.id === entry.id ? { ...item, ...entry } : item))
      }
      return 'ok'
    })
    vi.spyOn(syncQueueDb, 'bulkDelete').mockImplementation(async ({ ids }) => {
      queue = queue.filter((item) => !ids.includes(item.id))
    })
    vi.spyOn(syncQueueDb, 'count').mockImplementation(async () => queue.length)
    vi.spyOn(budgetEntriesDb, 'getBySyncId').mockResolvedValue(null)
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([])
    vi.spyOn(syncApiService, 'getActiveConflicts').mockResolvedValue({ ok: false } as Response)
    service.setOnline(true)
  })

  afterEach(() => {
    service.dispose()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('finding #1: a lock-busy retry survives an offline blip and resumes on reconnect', async () => {
    // The lock is busy and the item persists NO retry evidence
    // (retryCount 0, no nextRetryAt): the old reconnect gate only inspected
    // persisted rows, so this retry was never resumed.
    vi.spyOn(syncLockService, 'acquire').mockResolvedValue(false)
    const merge = vi.spyOn(syncApiService, 'merge').mockResolvedValue(mergeOkResponse())

    await service.processQueue()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)

    // Offline blip: the timer is cleared, the pending retry is not forgotten.
    probe.handleOffline()
    expect(vi.getTimerCount()).toBe(0)

    // Back online: the retry resumes on its own, without a manual tap.
    vi.mocked(syncLockService.acquire).mockResolvedValue(true)
    probe.handleOnline()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(1500)

    expect(merge).toHaveBeenCalledTimes(1)
    expect(queue).toHaveLength(0)
  })

  it('finding #2: a run whose chunks all failed does not clear the auth block', async () => {
    vi.spyOn(syncLockService, 'acquire').mockResolvedValue(true)
    vi.spyOn(syncApiService, 'merge').mockResolvedValue(mergeFailResponse())

    probe.notifyAuthExpired()
    expect(service.isAuthBlocked()).toBe(true)

    await service.processQueue()
    await vi.advanceTimersByTimeAsync(0)

    // The token is still expired: the block stands and no retry is armed.
    expect(service.isAuthBlocked()).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('finding #2b: a successful response clears the auth block and resumes the retries', async () => {
    vi.spyOn(syncLockService, 'acquire').mockResolvedValue(true)
    const merge = vi.spyOn(syncApiService, 'merge').mockResolvedValue(mergeFailResponse())

    probe.notifyAuthExpired()
    await service.processQueue()
    await vi.advanceTimersByTimeAsync(0)
    expect(service.isAuthBlocked()).toBe(true)
    expect(vi.getTimerCount()).toBe(0)

    // A run that reaches the server proves the token is alive again.
    merge.mockResolvedValue(mergeOkResponse())
    await service.processQueue()
    await vi.advanceTimersByTimeAsync(0)

    expect(service.isAuthBlocked()).toBe(false)
  })

  it('finding #3: a queue read that resolves after dispose() does not arm a timer', async () => {
    let resolveGetAll: ((rows: SyncQueueItem[]) => void) | null = null
    vi.mocked(syncQueueDb.getAll).mockImplementation(
      () => new Promise<SyncQueueItem[]>((resolve) => { resolveGetAll = resolve }),
    )

    const pending = probe.rescheduleRetries()
    service.dispose()
    resolveGetAll!([makeItem({ retryCount: 2 })])
    await pending
    await vi.advanceTimersByTimeAsync(0)

    expect(vi.getTimerCount()).toBe(0)
  })

  it('finding #4: the lock-retry budget stops the loop instead of being bypassed', async () => {
    vi.spyOn(syncLockService, 'acquire').mockResolvedValue(false)
    const merge = vi.spyOn(syncApiService, 'merge').mockResolvedValue(mergeOkResponse())

    for (let attempt = 0; attempt < 45; attempt++) {
      await service.processQueue()
    }
    await vi.advanceTimersByTimeAsync(0)

    // The budget is exhausted: no timer is armed anymore.
    expect(vi.getTimerCount()).toBe(0)
    expect(service.getRetryDecision()?.reason).toBe('lock_budget_exhausted')
    expect(merge).not.toHaveBeenCalled()

    // And the loop stays stopped: the timer cannot re-arm itself.
    await vi.advanceTimersByTimeAsync(60_000)
    expect(vi.getTimerCount()).toBe(0)
    expect(merge).not.toHaveBeenCalled()
  })

  it('reconnect pushes the queue automatically, even for an item queued while offline', async () => {
    // The item was queued while the app was offline: it carries NO retry
    // evidence (retryCount 0, no nextRetryAt) and the debounce that would
    // have pushed it never ran. The reconnect is itself the evidence that a
    // push is owed, so the queue must not wait for a manual tap.
    vi.spyOn(syncLockService, 'acquire').mockResolvedValue(true)
    const merge = vi.spyOn(syncApiService, 'merge').mockResolvedValue(mergeOkResponse())

    probe.handleOffline()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(queue[0].retryCount).toBe(0)
    expect(queue[0].nextRetryAt).toBeUndefined()

    probe.handleOnline()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(2000)

    expect(merge).toHaveBeenCalledTimes(1)
    expect(queue).toHaveLength(0)
  })

  it('boots offline and still pushes the queue when the network returns', async () => {
    // The app starts with no connectivity. The scheduler must know it from
    // the very first moment: otherwise the reconnect is not a transition
    // and the queue stays "N pending" until a manual tap.
    service.dispose()
    const original = Object.getOwnPropertyDescriptor(window.navigator, 'onLine')
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
    const offlineService = new SyncQueueService()
    const offlineProbe = offlineService as unknown as SchedulerProbe
    vi.spyOn(syncLockService, 'acquire').mockResolvedValue(true)
    const merge = vi.spyOn(syncApiService, 'merge').mockResolvedValue(mergeOkResponse())

    try {
      offlineProbe.handleOnline()
      await vi.advanceTimersByTimeAsync(0)
      expect(vi.getTimerCount()).toBe(1)

      await vi.advanceTimersByTimeAsync(2000)

      expect(merge).toHaveBeenCalledTimes(1)
      expect(queue).toHaveLength(0)
    } finally {
      if (original) Object.defineProperty(window.navigator, 'onLine', original)
      else Reflect.deleteProperty(window.navigator, 'onLine')
      offlineService.dispose()
    }
  })

  it('never arms more than one timer across the transitions', async () => {
    vi.spyOn(syncLockService, 'acquire').mockResolvedValue(false)
    vi.spyOn(syncApiService, 'merge').mockResolvedValue(mergeFailResponse())

    // offline
    probe.handleOffline()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)

    // back online: the pending item is owed a push, so one timer is armed
    probe.handleOnline()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)

    // lock busy -> one retry timer
    await service.processQueue()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)

    // auth expired -> no timer
    probe.notifyAuthExpired()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)

    // auth recovered -> one timer again
    vi.mocked(syncApiService.merge).mockResolvedValue(mergeOkResponse())
    vi.mocked(syncLockService.acquire).mockResolvedValue(true)
    await service.processQueue()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1)
  })
})
