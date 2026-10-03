// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// LBDS-287 regression: the upload drain must run even when the merge
// throws. We mock the attachment service module at the top of the file
// so SyncQueueService picks up the spy when it imports it.
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
import { syncQueueDb } from '@/db/controllers/syncQueueDb'
import { budgetEntriesDb } from '@/db/controllers/budgetEntriesDb'
import pendingAttachmentsService from '@/services/pendingAttachmentsService'
import { syncApiService } from '../SyncApiService'
import { syncLockService } from '../SyncLockService'
import type { SyncQueueItem } from '@/db/types'

// LBDS-287 regression: processQueue used to call processPendingAttachments
// inside the try, so a throw from the merge loop (HTTP 500, lock
// collision, etc.) skipped the upload drain and stranded the pending
// attachment on the client. The drain now lives in the finally block,
// which runs regardless of how the try exits.
function makePendingAttachment(entitySyncId: string): {
  entitySyncId: string
  entityType: 'entries'
  files: Array<{ name: string; type: string; size: number; data: string }>
  timestamp: number
} {
  return {
    entitySyncId,
    entityType: 'entries',
    files: [
      // base64 of "x" → "eA=="; a minimal payload so base64ToFile produces
      // a real File the upload function can take.
      { name: 'invoice.txt', type: 'text/plain', size: 1, data: 'eA==' },
    ],
    timestamp: Date.now(),
  }
}

function makeQueueItem(): SyncQueueItem {
  return {
    id: 'q-1',
    entityType: 'budget_entry',
    operation: 'create',
    data: { name: 'test', amount: 1 },
    timestamp: Date.now(),
    retryCount: 0,
  }
}

describe('processQueue runs the pending-attachments drain on a failed merge (LBDS-287)', () => {
  let service: SyncQueueService

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
    // online so the drain proceeds past its offline gate.
    service.setOnline(true)
    vi.spyOn(syncLockService, 'release').mockImplementation(() => {})
    vi.spyOn(syncLockService, 'acquire').mockResolvedValue(true)
    vi.spyOn(syncApiService, 'cancelActiveRequests').mockImplementation(() => {})
    vi.spyOn(syncApiService, 'getActiveConflicts').mockResolvedValue({ ok: false } as Response)
    vi.spyOn(budgetEntriesDb, 'getBySyncId').mockResolvedValue(null)
  })

  afterEach(() => {
    service.dispose()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('the upload drain still runs when /api/sync/merge throws (HTTP 500)', async () => {
    // The merge endpoint throws (e.g. 500) — the same shape processQueue
    // would have hit before the LBDS-287 refactor. Today the per-chunk
    // catch applies backoff and the loop continues; we only need to
    // verify the drain ran afterwards.
    vi.spyOn(syncApiService, 'merge').mockRejectedValue(new Error('HTTP 500: Server error'))
    vi.spyOn(syncQueueDb, 'getAll').mockResolvedValue([makeQueueItem()])
    vi.spyOn(syncQueueDb, 'getByIds').mockResolvedValue([])
    vi.spyOn(syncQueueDb, 'bulkPut').mockResolvedValue(undefined)
    vi.spyOn(syncQueueDb, 'bulkDelete').mockResolvedValue(undefined)
    vi.spyOn(syncQueueDb, 'count').mockResolvedValue(0)

    // Seed a pending attachment and stub the upload so we can detect the
    // drain ran even though the merge failed.
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      makePendingAttachment('e-1'),
    ])
    vi.spyOn(pendingAttachmentsService, 'base64ToFile').mockImplementation((data, name, type) => {
      // base64 "eA==" → 1-byte "x" file
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
      return new File([bytes], name, { type })
    })
    const removeSpy = vi
      .spyOn(pendingAttachmentsService, 'removePendingAttachment')
      .mockResolvedValue(undefined)

    // The merge failure is not re-thrown by the outer processQueue (the
    // per-chunk catch applies backoff and the loop continues), so the
    // call resolves. The drain is what we are verifying.
    await service.processQueue()

    // The drain ran AFTER the catch/finally block, not before, and
    // reached the upload function. This is the LBDS-287 fix: before
    // the refactor, the merge's throw would have skipped the drain
    // entirely and the pending attachment would have stayed in
    // pendingAttachmentsService forever.
    expect(uploadAttachments).toHaveBeenCalledWith(
      'e-1',
      expect.arrayContaining([expect.any(File)]),
    )
    expect(removeSpy).toHaveBeenCalledWith('e-1', 'entries')
  })

  it('drain still runs when the queue is empty (early return path through finally)', async () => {
    vi.spyOn(syncQueueDb, 'getAll').mockResolvedValue([])
    vi.spyOn(syncQueueDb, 'count').mockResolvedValue(0)

    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      makePendingAttachment('e-2'),
    ])
    vi.spyOn(pendingAttachmentsService, 'base64ToFile').mockImplementation((data, name, type) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
      return new File([bytes], name, { type })
    })
    const removeSpy = vi
      .spyOn(pendingAttachmentsService, 'removePendingAttachment')
      .mockResolvedValue(undefined)

    const result = await service.processQueue()
    expect(result).toBeNull() // empty queue

    // Even on the early-return path, the finally block (which now
    // contains the drain) ran and uploaded the pending attachment.
    expect(uploadAttachments).toHaveBeenCalledWith(
      'e-2',
      expect.arrayContaining([expect.any(File)]),
    )
    expect(removeSpy).toHaveBeenCalledWith('e-2', 'entries')
  })
})
