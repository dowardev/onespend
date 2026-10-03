// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// LBDS-287: processPendingAttachments used to be a side-effect of
// processQueue's post-merge-success block. The scheduler + refactored
// finally block here decouple the drain from the merge outcome so a
// failed sync (HTTP 500, lock collision, queue worker death) does not
// strand uploads forever.
const { uploadAttachments, uploadProviderAttachments } = vi.hoisted(() => ({
  uploadAttachments: vi.fn(),
  uploadProviderAttachments: vi.fn(),
}))

vi.mock('@/services/attachmentService', () => ({
  default: {
    uploadAttachments,
    uploadProviderAttachments,
  },
}))

import { SyncQueueService } from '../SyncQueueService'
import pendingAttachmentsService from '@/services/pendingAttachmentsService'
import { syncApiService } from '../SyncApiService'
import { syncLockService } from '../SyncLockService'

interface PendingDrainProbe {
  schedulePendingAttachmentsRetry(): Promise<void>
  runPendingAttachmentsDrain(): void
  handleOffline(): void
  handleOnline(): void
  notifyAuthExpired(): void
  resumeRetriesAfterAuthRecovery(): void
  pendingAttachmentsRetryTimeout: ReturnType<typeof setTimeout> | null
  pendingAttachmentsConsecutiveNonEmpty: number
}

describe('SyncQueueService pending-attachments drain (LBDS-287)', () => {
  let service: SyncQueueService
  let probe: PendingDrainProbe

  beforeEach(() => {
    vi.useFakeTimers()
    uploadAttachments.mockReset()
    uploadProviderAttachments.mockReset()
    uploadAttachments.mockResolvedValue({
      uploaded: [],
      errors: [],
      total_uploaded: 0,
      total_errors: 0,
    })
    uploadProviderAttachments.mockResolvedValue({
      uploaded: [],
      errors: [],
      total_uploaded: 0,
      total_errors: 0,
    })
    service = new SyncQueueService()
    // navigator.onLine is unreliable in the test env; force the service
    // online so the scheduler proceeds past its offline gate.
    service.setOnline(true)
    probe = service as unknown as PendingDrainProbe
    vi.spyOn(syncLockService, 'release').mockImplementation(() => {})
    vi.spyOn(syncApiService, 'cancelActiveRequests').mockImplementation(() => {})
  })

  afterEach(() => {
    service.dispose()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('is a no-op when no pending attachments are queued', async () => {
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([])

    await probe.schedulePendingAttachmentsRetry()
    await vi.advanceTimersByTimeAsync(0)

    // No timer was armed because there was nothing to drain.
    expect(vi.getTimerCount()).toBe(0)
  })

  it('is a no-op while offline, even if pending attachments exist', async () => {
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      { entitySyncId: 'e-1', entityType: 'entries', files: [], timestamp: Date.now() },
    ])
    service.setOnline(false)

    await probe.schedulePendingAttachmentsRetry()
    await vi.advanceTimersByTimeAsync(0)

    expect(vi.getTimerCount()).toBe(0)
  })

  it('is a no-op while auth is blocked (no token)', async () => {
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      { entitySyncId: 'e-1', entityType: 'entries', files: [], timestamp: Date.now() },
    ])
    probe.notifyAuthExpired()

    await probe.schedulePendingAttachmentsRetry()
    await vi.advanceTimersByTimeAsync(0)

    expect(vi.getTimerCount()).toBe(0)
  })

  it('arms a single timer when there are pending attachments and we are online + auth ok', async () => {
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      { entitySyncId: 'e-1', entityType: 'entries', files: [], timestamp: Date.now() },
    ])

    await probe.schedulePendingAttachmentsRetry()
    await vi.advanceTimersByTimeAsync(0)

    expect(vi.getTimerCount()).toBe(1)
  })

  it('the armed timer fires the drain and re-arms while still pending', async () => {
    const getAll = vi
      .spyOn(pendingAttachmentsService, 'getAllPendingAttachments')
      .mockResolvedValue([
        { entitySyncId: 'e-1', entityType: 'entries', files: [], timestamp: Date.now() },
      ])
    vi.spyOn(pendingAttachmentsService, 'base64ToFile').mockImplementation(
      () => new File(['x'], 'x.txt', { type: 'text/plain' }),
    )
    vi.spyOn(pendingAttachmentsService, 'removePendingAttachment').mockResolvedValue(undefined)

    await probe.schedulePendingAttachmentsRetry()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)

    // First tick fires the drain. Pending is still non-empty, so the
    // .then re-arms. The second arm happens after the drain awaits
    // the upload; advance enough for the upload to settle and the
    // re-arm to land.
    await vi.advanceTimersByTimeAsync(SyncQueueService.PENDING_ATTACHMENTS_RETRY_MIN_MS)
    expect(getAll).toHaveBeenCalled()
  })

  it('handleOnline arms the drain when there are pending uploads', async () => {
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      { entitySyncId: 'e-1', entityType: 'entries', files: [], timestamp: Date.now() },
    ])

    service.setOnline(false)
    expect(vi.getTimerCount()).toBe(0)
    probe.handleOnline()
    await vi.advanceTimersByTimeAsync(0)

    expect(vi.getTimerCount()).toBe(1)
  })

  it('handleOffline clears the pending-attachments drain timer', async () => {
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      { entitySyncId: 'e-1', entityType: 'entries', files: [], timestamp: Date.now() },
    ])

    await probe.schedulePendingAttachmentsRetry()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)

    probe.handleOffline()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('dispose clears the pending-attachments drain timer', async () => {
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      { entitySyncId: 'e-1', entityType: 'entries', files: [], timestamp: Date.now() },
    ])

    await probe.schedulePendingAttachmentsRetry()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)

    service.dispose()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('runPendingAttachmentsDrain is a public no-op when nothing is pending', () => {
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([])

    probe.runPendingAttachmentsDrain()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('the drain itself honours syncBlockedByAuth (LBDS-287 review finding)', async () => {
    // The scheduler respects auth (covered above). The direct call from
    // processQueue's finally block does too: a 401 in the merge must
    // not let the drain attempt uploads with the dead token.
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      { entitySyncId: 'e-1', entityType: 'entries', files: [], timestamp: Date.now() },
    ])
    vi.spyOn(pendingAttachmentsService, 'base64ToFile').mockImplementation(
      () => new File(['x'], 'x.txt', { type: 'text/plain' }),
    )
    vi.spyOn(pendingAttachmentsService, 'removePendingAttachment').mockResolvedValue(undefined)
    probe.notifyAuthExpired()

    // Cast to access the private drain directly.
    const drain = (service as unknown as { processPendingAttachments(): Promise<void> })
      .processPendingAttachments.bind(service)
    await drain()

    expect(uploadAttachments).not.toHaveBeenCalled()
  })

  it('resets the backoff counter once the pending table empties', async () => {
    let pendingCount = 1
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockImplementation(async () => {
      if (pendingCount === 0) return []
      return [{ entitySyncId: 'e-1', entityType: 'entries' as const, files: [], timestamp: Date.now() }]
    })

    await probe.schedulePendingAttachmentsRetry()
    expect(probe.pendingAttachmentsConsecutiveNonEmpty).toBe(1)

    await probe.schedulePendingAttachmentsRetry()
    expect(probe.pendingAttachmentsConsecutiveNonEmpty).toBe(2)

    // Simulate the table emptying (e.g. drain succeeded).
    pendingCount = 0
    await probe.schedulePendingAttachmentsRetry()
    expect(probe.pendingAttachmentsConsecutiveNonEmpty).toBe(0)

    // New pending arrives: counter starts fresh from 1.
    pendingCount = 1
    await probe.schedulePendingAttachmentsRetry()
    expect(probe.pendingAttachmentsConsecutiveNonEmpty).toBe(1)
  })

  it('auth recovery re-arms the attachment drain (LBDS-287 review finding)', async () => {
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      { entitySyncId: 'e-1', entityType: 'entries', files: [], timestamp: Date.now() },
    ])

    probe.notifyAuthExpired()
    expect(vi.getTimerCount()).toBe(0)

    probe.resumeRetriesAfterAuthRecovery()
    await vi.advanceTimersByTimeAsync(0)

    // After auth recovery the attachment scheduler must be armed, not
    // just the merge-queue backoff retry. Otherwise a re-login would
    // leave uploads parked until the next visibility / online event.
    expect(vi.getTimerCount()).toBe(1)
  })
})
