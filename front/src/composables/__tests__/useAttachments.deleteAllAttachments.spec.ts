// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { ref, type Ref } from 'vue'

const {
  mockListAttachments,
  mockListProviderAttachments,
  mockDeleteAttachments,
  mockPendingRemovePending,
  mockListForEntity,
  mockMarkPendingDelete,
  mockSyncAttachment,
} = vi.hoisted(() => ({
  mockListAttachments: vi.fn(async () => ({ data: [], total: 0 })) as Mock<(...args: unknown[]) => Promise<{ data: unknown[]; total: number }>> & { mock: { calls: unknown[][] } },
  mockListProviderAttachments: vi.fn(async () => ({ data: [], total: 0 })) as Mock<(...args: unknown[]) => Promise<{ data: unknown[]; total: number }>> & { mock: { calls: unknown[][] } },
  mockDeleteAttachments: vi.fn(async () => undefined) as Mock<(...args: unknown[]) => Promise<void>> & { mock: { calls: unknown[][] } },
  mockPendingRemovePending: vi.fn(async () => undefined) as Mock<(...args: unknown[]) => Promise<void>> & { mock: { calls: unknown[][] } },
  mockListForEntity: vi.fn(async () => []) as Mock<(...args: unknown[]) => Promise<unknown[]>> & { mock: { calls: unknown[][] } },
  mockMarkPendingDelete: vi.fn(async () => undefined) as Mock<(...args: unknown[]) => Promise<void>> & { mock: { calls: unknown[][] } },
  mockSyncAttachment: vi.fn(async () => 0) as Mock<(...args: unknown[]) => Promise<number>> & { mock: { calls: unknown[][] } },
}))

vi.mock('@/services/attachmentService', () => ({
  default: {
    listAttachments: mockListAttachments,
    listProviderAttachments: mockListProviderAttachments,
    deleteAttachments: mockDeleteAttachments,
    uploadAttachments: vi.fn(async () => ({ uploaded: [], errors: [], total_uploaded: 0, total_errors: 0 })),
    uploadProviderAttachments: vi.fn(async () => ({ uploaded: [], errors: [], total_uploaded: 0, total_errors: 0 })),
    downloadAttachment: vi.fn(async () => new Blob()),
    deleteAttachment: vi.fn(async () => undefined),
  },
}))

vi.mock('@/services/pendingAttachmentsService', () => ({
  default: {
    removePendingAttachment: mockPendingRemovePending,
    getPendingAttachment: vi.fn(async () => null),
    addPendingAttachment: vi.fn(async () => undefined),
    removeFileFromPending: vi.fn(async () => undefined),
    getAllPendingAttachments: vi.fn(async () => []),
    hasPendingAttachments: vi.fn(async () => false),
    base64ToFile: vi.fn((b: string, name: string, type: string) => new File([b], name, { type })),
  },
}))

vi.mock('@/db/controllers/attachmentsDb', () => ({
  default: {
    listForEntity: mockListForEntity,
    markPendingDelete: mockMarkPendingDelete,
    syncFromServerList: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined),
    bulkPut: vi.fn(async () => undefined),
    getById: vi.fn(async () => null),
    getByIds: vi.fn(async () => []),
    clearPendingDelete: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    clearForEntity: vi.fn(async () => undefined),
  },
}))

vi.mock('@/services/syncQueue', () => ({
  syncQueue: {
    syncAccount: vi.fn(async () => 0),
    syncEntry: vi.fn(async () => 0),
    syncProvider: vi.fn(async () => 0),
    syncSupplierProduct: vi.fn(async () => 0),
    syncBudgetProvider: vi.fn(async () => 0),
    syncRecurringRecord: vi.fn(async () => 0),
    syncAttachment: mockSyncAttachment,
  },
}))

// Import after mocks so the composable picks them up.
const { useAttachments } = await import('../useAttachments')

describe('useAttachments.deleteAllAttachments (LBDS-280)', () => {
  beforeEach(() => {
    mockListAttachments.mockClear()
    mockListProviderAttachments.mockClear()
    mockDeleteAttachments.mockClear()
    mockPendingRemovePending.mockClear()
    mockListForEntity.mockClear()
    mockMarkPendingDelete.mockClear()
    mockSyncAttachment.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does NOT call any HTTP layer (acceptance hint AC6)', async () => {
    const syncId = ref<string | null>('entry-1')
    const { deleteAllAttachments } = useAttachments({ entityType: 'entries', syncId })

    mockListForEntity.mockResolvedValueOnce([
      { sync_id: 'att-1', serverId: 100, entitySyncId: 'entry-1', entityType: 'entries', name: 'a.bin' },
      { sync_id: 'att-2', serverId: 101, entitySyncId: 'entry-1', entityType: 'entries', name: 'b.bin' },
    ])

    await deleteAllAttachments()

    expect(mockListAttachments).not.toHaveBeenCalled()
    expect(mockListProviderAttachments).not.toHaveBeenCalled()
    expect(mockDeleteAttachments).not.toHaveBeenCalled()
  })

  it('walks the local mirror and enqueues one sync op per row', async () => {
    const syncId = ref<string | null>('entry-1')
    const { deleteAllAttachments } = useAttachments({ entityType: 'entries', syncId })

    mockListForEntity.mockResolvedValueOnce([
      { sync_id: 'att-1', serverId: 100, entitySyncId: 'entry-1', entityType: 'entries', name: 'a.bin' },
      { sync_id: 'att-2', serverId: 101, entitySyncId: 'entry-1', entityType: 'entries', name: 'b.bin' },
    ])

    await deleteAllAttachments()

    expect(mockListForEntity).toHaveBeenCalledTimes(1)
    expect(mockMarkPendingDelete).toHaveBeenCalledTimes(1)
    expect(mockMarkPendingDelete).toHaveBeenCalledWith({ syncIds: ['att-1', 'att-2'] })

    expect(mockSyncAttachment).toHaveBeenCalledTimes(2)
    const calls = mockSyncAttachment.mock.calls.map((c) => c[0])
    expect(calls).toEqual([
      { attachment: expect.objectContaining({ sync_id: 'att-1' }), operation: 'delete' },
      { attachment: expect.objectContaining({ sync_id: 'att-2' }), operation: 'delete' },
    ])
  })

  it('skips rows that are already flagged pendingDelete (idempotent)', async () => {
    const syncId = ref<string | null>('entry-1')
    const { deleteAllAttachments } = useAttachments({ entityType: 'entries', syncId })

    mockListForEntity.mockResolvedValueOnce([
      { sync_id: 'att-1', serverId: 100, entitySyncId: 'entry-1', entityType: 'entries', name: 'a.bin', pendingDelete: true },
      { sync_id: 'att-2', serverId: 101, entitySyncId: 'entry-1', entityType: 'entries', name: 'b.bin', pendingDelete: false },
    ])

    const result = await deleteAllAttachments()

    expect(result.deletedCount).toBe(1)
    expect(mockSyncAttachment).toHaveBeenCalledTimes(1)
    const call = (mockSyncAttachment.mock.calls[0]?.[0]) as { attachment: { sync_id: string } }
    expect(call.attachment.sync_id).toBe('att-2')
  })

  it('returns deletedCount=0 without crashing when syncId is null', async () => {
    const syncId: Ref<string | null> = ref(null)
    const { deleteAllAttachments } = useAttachments({ entityType: 'entries', syncId })

    const result = await deleteAllAttachments()

    expect(result.deletedCount).toBe(0)
    expect(mockListForEntity).not.toHaveBeenCalled()
    expect(mockSyncAttachment).not.toHaveBeenCalled()
  })

  it('uses listProviderAttachments for entityType=providers ONLY inside openAttachments; delete path stays entity-type agnostic', async () => {
    const syncId = ref<string | null>('provider-1')
    const { deleteAllAttachments, openAttachments } = useAttachments({ entityType: 'providers', syncId })

    mockListProviderAttachments.mockResolvedValueOnce({ data: [], total: 0 })
    mockListForEntity.mockResolvedValueOnce([])
    mockListForEntity.mockResolvedValueOnce([])

    await deleteAllAttachments()
    await openAttachments()

    // deleteAllAttachments + openAttachments both walk the local mirror.
    expect(mockListForEntity).toHaveBeenCalledTimes(2)
    expect(mockSyncAttachment).not.toHaveBeenCalled()
    // openAttachments refresh path: it calls listProviderAttachments once
    // (read-side); the delete path itself called neither list variant.
    expect(mockListProviderAttachments).toHaveBeenCalledTimes(1)
  })

  it('drops the pendingAttachments row alongside the queue ops (orphaned queued uploads)', async () => {
    const syncId = ref<string | null>('entry-1')
    const { deleteAllAttachments } = useAttachments({ entityType: 'entries', syncId })

    mockListForEntity.mockResolvedValueOnce([
      { sync_id: 'att-1', serverId: 100, entitySyncId: 'entry-1', entityType: 'entries', name: 'a.bin' },
    ])

    await deleteAllAttachments()

    expect(mockPendingRemovePending).toHaveBeenCalledWith('entry-1', 'entries')
  })
})
