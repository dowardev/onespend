// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

const { mockQueueOperation, mockGetQueueCount } = vi.hoisted(() => ({
  mockQueueOperation: vi.fn(async () => undefined) as Mock<(...args: unknown[]) => Promise<void>> & { mock: { calls: unknown[][] } },
  mockGetQueueCount: vi.fn(async () => 0) as Mock<(...args: unknown[]) => Promise<number>> & { mock: { calls: unknown[][] } },
}))

const { mockSyncId } = vi.hoisted(() => ({ mockSyncId: vi.fn(() => 'generated-uuid') }))

vi.mock('@/services/syncService', () => ({
  syncService: {
    queueOperation: mockQueueOperation,
    getQueueCount: mockGetQueueCount,
  },
}))

vi.mock('@/utils/UuidGenerator', () => ({
  generateSyncId: mockSyncId,
}))

import { syncQueue } from '../syncQueue'

describe('syncQueue.syncAttachment (LBDS-280)', () => {
  beforeEach(() => {
    mockQueueOperation.mockClear()
    mockGetQueueCount.mockClear()
    mockSyncId.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('enqueues a delete with entityType "attachment" and the row sync_id', async () => {
    const row = {
      sync_id: 'att-123',
      serverId: 42,
      entitySyncId: 'entry-1',
      entityType: 'entries',
      name: 'invoice.pdf',
      size: 1000,
      mimeType: 'application/pdf',
    }

    await syncQueue.syncAttachment({ attachment: row, operation: 'delete' })

    expect(mockQueueOperation).toHaveBeenCalledTimes(1)
    const call = (mockQueueOperation.mock.calls[0]?.[0] as {
      id: string
      entityType: string
      operation: string
      data: Record<string, unknown>
    } | undefined)
    expect(call).toBeDefined()
    expect(call!.id).toBe('att-123')
    expect(call.entityType).toBe('attachment')
    expect(call.operation).toBe('delete')
    expect(call.data).toMatchObject({
      sync_id: 'att-123',
      entity_type: 'entries',
      budget_entry_sync_id: 'entry-1',
      name: 'invoice.pdf',
    })
    expect(mockSyncId).not.toHaveBeenCalled()
  })

  it('generates a sync_id when the caller hands us one without it', async () => {
    mockSyncId.mockReturnValueOnce('generated-att-sync-id')

    await syncQueue.syncAttachment({
      attachment: { name: 'no-sync-id-yet.bin' },
      operation: 'delete',
    })

    expect(mockSyncId).toHaveBeenCalledTimes(1)
    const call = mockQueueOperation.mock.calls[0]?.[0] as {
      id: string
      entityType: string
      operation: string
      data: Record<string, unknown>
    }
    expect(call.id).toBe('generated-att-sync-id')
    expect(call.entityType).toBe('attachment')
    expect(call.operation).toBe('delete')
  })

  it('routes provider attachments to budget_provider_sync_id, not entry', async () => {
    const row = {
      sync_id: 'att-456',
      entityType: 'providers',
      entitySyncId: 'provider-1',
      name: 'quote.png',
    }

    await syncQueue.syncAttachment({ attachment: row, operation: 'delete' })

    const call = mockQueueOperation.mock.calls[0]?.[0] as { data: Record<string, unknown> }
    expect(call.data['entity_type']).toBe('providers')
    expect(call.data['budget_provider_sync_id']).toBe('provider-1')
    expect(call.data['budget_entry_sync_id']).toBeNull()
  })

  it('defaults operation to delete (LBDS-280 only wires the delete path)', async () => {
    const row = { sync_id: 'att-789', entityType: 'entries', entitySyncId: 'entry-2' }

    await syncQueue.syncAttachment({ attachment: row })

    const call = mockQueueOperation.mock.calls[0]?.[0] as { operation: string }
    expect(call.operation).toBe('delete')
  })
})
