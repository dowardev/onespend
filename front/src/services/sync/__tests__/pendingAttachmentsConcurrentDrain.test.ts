// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// LBDS-287 regression: when two drain triggers fire concurrently
// (processQueue finally + scheduler timer, or two saveAttachments in quick
// succession), both reads the same pending row and both call the upload
// endpoint, producing two server rows with distinct sync_ids. The mobile
// then mirrors both as a "double attachment". The fix is a single
// in-flight flag on SyncQueueService that serialises the calls.
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

interface DrainProbe {
  processPendingAttachments(): Promise<void>
  pendingDrainInFlight: boolean
}

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
      { name: 'invoice.txt', type: 'text/plain', size: 1, data: 'eA==' },
    ],
    timestamp: Date.now(),
  }
}

describe('SyncQueueService processPendingAttachments is serialised (LBDS-287)', () => {
  let service: SyncQueueService
  let probe: DrainProbe

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
    service.setOnline(true)
    probe = service as unknown as DrainProbe
    vi.spyOn(syncLockService, 'release').mockImplementation(() => {})
    vi.spyOn(syncApiService, 'cancelActiveRequests').mockImplementation(() => {})
    vi.spyOn(pendingAttachmentsService, 'base64ToFile').mockImplementation((data, name, type) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
      return new File([bytes], name, { type })
    })
    vi.spyOn(pendingAttachmentsService, 'removePendingAttachment').mockResolvedValue(undefined)
  })

  afterEach(() => {
    service.dispose()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('two concurrent drain calls upload the same file exactly once', async () => {
    // The upload is intentionally slow: it only resolves when we call
    // releaseUpload(). While it is pending, a second drain fires and
    // must short-circuit instead of issuing a second upload.
    let releaseUpload!: () => void
    const uploadStarted = new Promise<void>((resolve) => {
      uploadAttachments.mockImplementation(async () => {
        resolve()
        await new Promise<void>((r) => {
          releaseUpload = r
        })
        return { uploaded: [], errors: [], total_uploaded: 0, total_errors: 0 }
      })
    })
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      makePendingAttachment('e-1'),
    ])

    const first = probe.processPendingAttachments()
    await uploadStarted
    // First drain is mid-flight. The flag must be set.
    expect(probe.pendingDrainInFlight).toBe(true)

    // Second drain fires while the first is still awaiting the upload.
    // Without the guard it would call uploadAttachments again, producing
    // a server-side duplicate. With the guard it short-circuits.
    const second = probe.processPendingAttachments()

    releaseUpload!()
    await Promise.all([first, second])

    expect(uploadAttachments).toHaveBeenCalledTimes(1)
    expect(probe.pendingDrainInFlight).toBe(false)
  })

  it('a drain that throws still releases the in-flight flag', async () => {
    uploadAttachments.mockRejectedValue(new Error('boom'))
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      makePendingAttachment('e-2'),
    ])

    await probe.processPendingAttachments()

    expect(probe.pendingDrainInFlight).toBe(false)
    // A subsequent drain must be allowed to run (not blocked by a stuck
    // flag). The previous upload failed and the row is still in
    // pendingAttachments, so the retry should call uploadAttachments
    // again. We assert after awaiting, not before.
    await probe.processPendingAttachments()

    expect(uploadAttachments).toHaveBeenCalledTimes(2)
  })

  it('a drain that exits immediately (offline) releases the flag', async () => {
    service.setOnline(false)
    vi.spyOn(pendingAttachmentsService, 'getAllPendingAttachments').mockResolvedValue([
      makePendingAttachment('e-3'),
    ])

    await probe.processPendingAttachments()

    expect(probe.pendingDrainInFlight).toBe(false)
  })
})
