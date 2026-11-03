// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { SyncQueueService } from '@/services/sync/SyncQueueService';
import type { SyncItem } from '@/services/syncService';

const mockGetChanges = vi.fn();
const mockFullSync = vi.fn();
const mockMerge = vi.fn();
const mockGetActiveConflicts = vi.fn();

function createOkResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    statusText: 'OK',
    headers: new Headers(),
  } as unknown as Response;
}

function createQueueItems(
  count: number,
  entityType = 'account' as SyncItem['entityType'],
  operation = 'create' as SyncItem['operation'],
): SyncItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    entityType,
    operation,
    data: { name: `Item ${i}` },
    timestamp: Date.now(),
    retryCount: 0,
  }));
}

vi.mock('@/services/sync/SyncApiService', () => ({
  AuthExpiredError: class AuthExpiredError extends Error {
    constructor() {
      super('Authentication expired');
      this.name = 'AuthExpiredError';
    }
  },
  syncApiService: {
    getChanges: (...args: unknown[]) => mockGetChanges(...args),
    fullSync: (...args: unknown[]) => mockFullSync(...args),
    merge: (...args: unknown[]) => mockMerge(...args),
    getActiveConflicts: (...args: unknown[]) => mockGetActiveConflicts(...args),
  },
}));

vi.mock('@/db/controllers/syncQueueDb', () => ({
  syncQueueDb: {
    getAll: vi.fn(() => []),
    count: vi.fn(() => 0),
    bulkDelete: vi.fn(),
    getByIds: vi.fn(() => []),
    bulkPut: vi.fn(),
    delete: vi.fn(),
    add: vi.fn(),
    put: vi.fn(),
    getById: vi.fn(),
  },
}));
vi.mock('@/db/controllers/deadLetterQueueDb', () => ({ deadLetterQueueDb: { add: vi.fn(), bulkAdd: vi.fn() } }));
vi.mock('@/db/controllers/suppliersDb', () => ({
  suppliersDb: {
    getAll: vi.fn(() => []),
    bulkPut: vi.fn(),
    bulkDelete: vi.fn(),
    bulkGet: vi.fn(() => []),
    bulkDeleteBySyncIds: vi.fn(),
  },
}));
vi.mock('@/db/controllers/supplierProductsDb', () => ({
  supplierProductsDb: {
    getAll: vi.fn(() => []),
    bulkPut: vi.fn(),
    bulkDelete: vi.fn(),
    bulkGet: vi.fn(() => []),
    bulkDeleteBySyncIds: vi.fn(),
  },
}));
vi.mock('@/db/controllers/accountsDb', () => ({
  accountsDb: {
    getAll: vi.fn(() => []),
    bulkPut: vi.fn(),
    bulkDelete: vi.fn(),
    bulkGet: vi.fn(() => []),
    bulkDeleteBySyncIds: vi.fn(),
  },
}));
vi.mock('@/db/controllers/recurringRecordsDb', () => ({
  recurringRecordsDb: {
    getAll: vi.fn(() => []),
    bulkPut: vi.fn(),
    bulkDelete: vi.fn(),
    bulkGet: vi.fn(() => []),
    bulkDeleteBySyncIds: vi.fn(),
  },
}));
vi.mock('@/db/controllers/budgetEntriesDb', () => ({
  budgetEntriesDb: {
    getAll: vi.fn(() => []),
    bulkPut: vi.fn(),
    bulkDelete: vi.fn(),
    bulkGet: vi.fn(() => []),
    bulkDeleteBySyncIds: vi.fn(),
  },
}));
vi.mock('@/db/controllers/budgetProvidersDb', () => ({
  budgetProvidersDb: {
    getAll: vi.fn(() => []),
    bulkPut: vi.fn(),
    bulkDelete: vi.fn(),
    bulkGet: vi.fn(() => []),
    bulkDeleteBySyncIds: vi.fn(),
  },
}));
vi.mock('@/db/controllers/budgetProviderProductsDb', () => ({
  budgetProviderProductsDb: {
    getAll: vi.fn(() => []),
    bulkPut: vi.fn(),
    bulkDelete: vi.fn(),
    bulkGet: vi.fn(() => []),
    bulkDeleteBySyncIds: vi.fn(),
  },
}));
vi.mock('@/db/controllers/recurringRecordProductsDb', () => ({
  recurringRecordProductsDb: {
    getAll: vi.fn(() => []),
    bulkPut: vi.fn(),
    bulkDelete: vi.fn(),
    bulkGet: vi.fn(() => []),
    bulkDeleteBySyncIds: vi.fn(),
  },
}));
vi.mock('@/db/OneSpendDB', () => ({
  default: {
    entries: vi.fn(() => ({ toArray: vi.fn(() => []) })),
    suppliers: { bulkGet: vi.fn(() => []) },
    recurringRecords: { bulkGet: vi.fn(() => []) },
  },
}));
vi.mock('@/services/sync/SyncLockService', () => {
  const mockAcquire = vi.fn().mockResolvedValue(true);
  const mockRelease = vi.fn();
  return { syncLockService: { acquire: mockAcquire, release: mockRelease } };
});
const mockConflictStoreRemove = vi.fn();
const mockConflictStoreGetAll = vi.fn();
const mockConflictStoreAdd = vi.fn();
vi.mock('@/services/sync/ConflictResolutionService', () => ({
  conflictResolutionService: {
    resolveConflicts: vi.fn(),
    handleConflicts: vi.fn(),
    getStore: vi.fn(() => ({
      remove: mockConflictStoreRemove,
      getAll: mockConflictStoreGetAll,
      add: mockConflictStoreAdd,
    })),
  },
}));
vi.mock('@/services/pendingAttachmentsService', () => ({
  default: {
    getAllPendingAttachments: vi.fn(() => []),
    base64ToFile: vi.fn(),
    removePendingAttachment: vi.fn(),
    hasPendingAttachments: vi.fn(() => false),
    uploadPendingAttachments: vi.fn(),
    removeFileFromPending: vi.fn(),
  },
}));
vi.mock('@/services/attachmentService', () => ({ default: vi.fn() }));
vi.mock('@/db/controllers/configDb', () => ({
  configDb: {
    get: vi.fn(async ({ key }: { key: string }) => {
      if (key === 'syncEnabled') return true;
      if (key === 'syncServerUrl') return 'https://example.test';
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  },
}));

describe('SyncQueueService version alignment on merge ack (GitLab #15)', () => {
  let service: SyncQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    service = new SyncQueueService();
    service.setOnline(true);
  });

  function mockMergeResponse(params: {
    created?: Record<string, Array<{ sync_id: string; version?: number } | string>>;
    updated?: Record<string, Array<{ sync_id: string; version?: number } | string>>;
    serverTime?: number;
  }) {
    return createOkResponse({
      success: true,
      results: {
        created: params.created ?? {},
        updated: params.updated ?? {},
        deleted: {},
        skipped: {},
      },
      serverTime: params.serverTime ?? Date.now(),
    });
  }

  test('created ack sets the local version to the version the server reports (account)', async () => {
    const items = createQueueItems(1, 'account', 'create');
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (syncQueueDb.getByIds as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    // Local row exists with version 0 (or undefined)
    const { accountsDb } = await import('@/db/controllers/accountsDb');
    (accountsDb.bulkGet as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sync_id: 'id-0', name: 'Test Account', version: 0, serverId: 123 },
    ]);
    (accountsDb.bulkPut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    mockMerge.mockResolvedValue(
      mockMergeResponse({
        created: { account: [{ sync_id: 'id-0', version: 1 }] },
        serverTime: 1000,
      }),
    );

    await service.processQueue();

    // Verify bulkGet was called with the sync_id from the ack
    expect(accountsDb.bulkGet).toHaveBeenCalledWith({ syncIds: ['id-0'] });
    // Verify bulkPut was called with the version the server reported
    expect(accountsDb.bulkPut).toHaveBeenCalled();
    const putCall = (accountsDb.bulkPut as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(putCall.entries).toHaveLength(1);
    expect(putCall.entries[0].sync_id).toBe('id-0');
    expect(putCall.entries[0].version).toBe(1);
  });

  test('updated ack sets the local version to the version the server reports (supplier)', async () => {
    const items = createQueueItems(1, 'supplier', 'update');
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (syncQueueDb.getByIds as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    // Local row exists with version 3
    const { suppliersDb } = await import('@/db/controllers/suppliersDb');
    (suppliersDb.bulkGet as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sync_id: 'id-0', name: 'Test Supplier', version: 3, serverId: 456 },
    ]);
    (suppliersDb.bulkPut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    mockMerge.mockResolvedValue(
      mockMergeResponse({
        updated: { supplier: [{ sync_id: 'id-0', version: 7 }] },
        serverTime: 2000,
      }),
    );

    await service.processQueue();

    // Verify bulkGet was called with the sync_id from the ack
    expect(suppliersDb.bulkGet).toHaveBeenCalledWith({ syncIds: ['id-0'] });
    // Verify bulkPut was called with the version the server reported
    expect(suppliersDb.bulkPut).toHaveBeenCalled();
    const putCall = (suppliersDb.bulkPut as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(putCall.entries).toHaveLength(1);
    expect(putCall.entries[0].sync_id).toBe('id-0');
    expect(putCall.entries[0].version).toBe(7);
  });

  test('no write when the local version already matches the server', async () => {
    const items = createQueueItems(1, 'budget_entry', 'create');
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (syncQueueDb.getByIds as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    // Local row already has the version the server reports
    const { budgetEntriesDb } = await import('@/db/controllers/budgetEntriesDb');
    (budgetEntriesDb.bulkGet as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sync_id: 'id-0', name: 'Test Entry', version: 1, serverId: 789 },
    ]);
    (budgetEntriesDb.bulkPut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    mockMerge.mockResolvedValue(
      mockMergeResponse({
        created: { budget_entry: [{ sync_id: 'id-0', version: 1 }] },
        serverTime: 3000,
      }),
    );

    await service.processQueue();

    // bulkGet called but bulkPut should NOT be called since version doesn't change
    expect(budgetEntriesDb.bulkGet).toHaveBeenCalledWith({ syncIds: ['id-0'] });
    expect(budgetEntriesDb.bulkPut).not.toHaveBeenCalled();
  });

  test('updated ack does not write when row not found locally', async () => {
    const items = createQueueItems(1, 'recurring_record', 'update');
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (syncQueueDb.getByIds as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    // Row not found locally (returns undefined)
    const { recurringRecordsDb } = await import('@/db/controllers/recurringRecordsDb');
    (recurringRecordsDb.bulkGet as ReturnType<typeof vi.fn>).mockResolvedValue([undefined]);
    (recurringRecordsDb.bulkPut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    mockMerge.mockResolvedValue(
      mockMergeResponse({
        updated: { recurring_record: [{ sync_id: 'id-0' }] },
        serverTime: 4000,
      }),
    );

    await service.processQueue();

    // bulkGet called but bulkPut should NOT be called
    expect(recurringRecordsDb.bulkGet).toHaveBeenCalledWith({ syncIds: ['id-0'] });
    expect(recurringRecordsDb.bulkPut).not.toHaveBeenCalled();
  });

  test('unknown entity type in ack is skipped (e.g. attachment)', async () => {
    const items = createQueueItems(1, 'account', 'create');
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (syncQueueDb.getByIds as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    const { accountsDb } = await import('@/db/controllers/accountsDb');
    (accountsDb.bulkGet as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sync_id: 'id-0', name: 'Test Account', version: 0, serverId: 123 },
    ]);
    (accountsDb.bulkPut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    // Ack contains an unknown entity type 'attachment' which has no db accessor
    mockMerge.mockResolvedValue(
      mockMergeResponse({
        created: {
          account: [{ sync_id: 'id-0', version: 1 }],
          attachment: [{ sync_id: 'attach-1' }], // unknown type -> skipped
        },
        serverTime: 5000,
      }),
    );

    await service.processQueue();

    // account should be processed
    expect(accountsDb.bulkGet).toHaveBeenCalledWith({ syncIds: ['id-0'] });
    expect(accountsDb.bulkPut).toHaveBeenCalled();
    // No error thrown, sync continues
  });

  test('ack items as bare strings are handled', async () => {
    const items = createQueueItems(1, 'budget_provider', 'create');
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (syncQueueDb.getByIds as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    const { budgetProvidersDb } = await import('@/db/controllers/budgetProvidersDb');
    (budgetProvidersDb.bulkGet as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sync_id: 'id-0', name: 'Test Provider', version: 0, serverId: 111 },
    ]);
    (budgetProvidersDb.bulkPut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    // Ack items as bare strings (legacy shape): no version to align
    mockMerge.mockResolvedValue(
      mockMergeResponse({
        created: { budget_provider: ['id-0'] },
        serverTime: 6000,
      }),
    );

    await service.processQueue();

    expect(budgetProvidersDb.bulkGet).toHaveBeenCalledWith({ syncIds: ['id-0'] });
    expect(budgetProvidersDb.bulkPut).not.toHaveBeenCalled();
  });

  test('both created and updated buckets processed in same response', async () => {
    const items = createQueueItems(2, 'account', 'create');
    items[1] = { ...items[1], id: 'id-1', operation: 'update' };
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (syncQueueDb.getByIds as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    const { accountsDb } = await import('@/db/controllers/accountsDb');
    (accountsDb.bulkGet as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ sync_id: 'id-0', name: 'Created', version: 0, serverId: 1 }]) // for created
      .mockResolvedValueOnce([{ sync_id: 'id-1', name: 'Updated', version: 5, serverId: 2 }]); // for updated
    (accountsDb.bulkPut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    mockMerge.mockResolvedValue(
      mockMergeResponse({
        created: { account: [{ sync_id: 'id-0', version: 1 }] },
        updated: { account: [{ sync_id: 'id-1', version: 6 }] },
        serverTime: 7000,
      }),
    );

    await service.processQueue();

    // bulkGet called twice (once per bucket)
    expect(accountsDb.bulkGet).toHaveBeenCalledTimes(2);
    // bulkPut called twice (once per bucket)
    expect(accountsDb.bulkPut).toHaveBeenCalledTimes(2);

    // First call: created -> version 1
    const putCall1 = (accountsDb.bulkPut as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(putCall1.entries[0].sync_id).toBe('id-0');
    expect(putCall1.entries[0].version).toBe(1);

    // Second call: updated -> version 6
    const putCall2 = (accountsDb.bulkPut as ReturnType<typeof vi.fn>).mock.calls[1][0];
    expect(putCall2.entries[0].sync_id).toBe('id-1');
    expect(putCall2.entries[0].version).toBe(6);
  });
});