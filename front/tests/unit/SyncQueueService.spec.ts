// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { SyncQueueService } from '@/services/sync/SyncQueueService';
import { AuthExpiredError } from '@/services/sync/SyncApiService';
import type { SyncItem } from '@/services/syncService';

const mockGetChanges = vi.fn();
const mockFullSync = vi.fn();
const mockMerge = vi.fn();
const mockGetActiveConflicts = vi.fn();

function createOkResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    statusText: 'OK',
    headers: new Headers(),
  } as unknown as Response;
}

function createErrorResponse(status: number, statusText: string): Response {
  return {
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve(null),
    headers: new Headers(),
  } as unknown as Response;
}

function createQueueItems(count: number, entityType = 'account' as SyncItem['entityType'], operation = 'create' as SyncItem['operation']): SyncItem[] {
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
vi.mock('@/db/controllers/suppliersDb', () => ({ suppliersDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) } }));
vi.mock('@/db/controllers/supplierProductsDb', () => ({ supplierProductsDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn() } }));
vi.mock('@/db/controllers/accountsDb', () => ({ accountsDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) } }));
vi.mock('@/db/controllers/recurringRecordsDb', () => ({ recurringRecordsDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) } }));
vi.mock('@/db/controllers/budgetEntriesDb', () => ({ budgetEntriesDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) } }));
vi.mock('@/db/controllers/budgetProvidersDb', () => ({ budgetProvidersDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) } }));
vi.mock('@/db/controllers/budgetProviderProductsDb', () => ({ budgetProviderProductsDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) } }));
vi.mock('@/db/OneSpendDB', () => ({ default: { entries: vi.fn(() => ({ toArray: vi.fn(() => []) })), suppliers: { bulkGet: vi.fn(() => []) }, recurringRecords: { bulkGet: vi.fn(() => []) } } }));
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
vi.mock('@/services/pendingAttachmentsService', () => ({ default: { getAllPendingAttachments: vi.fn(() => []), base64ToFile: vi.fn(), removePendingAttachment: vi.fn(), hasPendingAttachments: vi.fn(() => false), uploadPendingAttachments: vi.fn(), removeFileFromPending: vi.fn() } }));
vi.mock('@/services/attachmentService', () => ({ default: vi.fn() }));

describe('SyncQueueService.pullChanges', () => {
  let service: SyncQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    service = new SyncQueueService();
    service.setOnline(true);
  });

  test('retries on transient failures then succeeds', async () => {
    mockGetChanges
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('5xx server error'))
      .mockResolvedValueOnce(createOkResponse({ changes: {}, cursor: null, serverTime: 1000 }));

    const result = await service.pullChanges();

    expect(result).toEqual({});
    expect(mockGetChanges).toHaveBeenCalledTimes(3);
    expect(mockFullSync).not.toHaveBeenCalled();
  });

  test('falls back to fullSync after all retries exhausted', async () => {
    mockGetChanges.mockRejectedValue(new Error('Persistent error'));
    mockFullSync.mockResolvedValue(createOkResponse({ data: {}, serverTime: 2000 }));

    const result = await service.pullChanges();

    expect(result).toEqual({});
    expect(mockGetChanges).toHaveBeenCalledTimes(3);
    expect(mockFullSync).toHaveBeenCalledTimes(1);
  });

  test('does not retry AuthExpiredError', async () => {
    mockGetChanges.mockRejectedValue(new AuthExpiredError());

    await expect(service.pullChanges()).rejects.toThrow('Authentication expired');
    expect(mockGetChanges).toHaveBeenCalledTimes(1);
    expect(mockFullSync).not.toHaveBeenCalled();
  });

  test('succeeds on first attempt with no retries', async () => {
    mockGetChanges.mockResolvedValue(createOkResponse({ changes: {}, cursor: null, serverTime: 1000 }));

    const result = await service.pullChanges();

    expect(result).toEqual({});
    expect(mockGetChanges).toHaveBeenCalledTimes(1);
    expect(mockFullSync).not.toHaveBeenCalled();
  });
});

describe('SyncQueueService.processQueue', () => {
  let service: SyncQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    service = new SyncQueueService();
    service.setOnline(true);
  });

  function mockSuccessResponse(items: string[], serverTime?: number) {
    return createOkResponse({
      success: true,
      results: {
        created: {
          account: items.map((id) => ({ sync_id: id })),
        },
      },
      serverTime: serverTime ?? Date.now(),
    });
  }

  test('returns null when queue is empty', async () => {
    const result = await service.processQueue();
    expect(result).toBeNull();
  });

  test('processes a single chunk successfully', async () => {
    const items = createQueueItems(10);
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    const ids = items.map((i) => i.id);
    mockMerge.mockResolvedValue(mockSuccessResponse(ids, 1000));

    const result = await service.processQueue();

    expect(result).not.toBeNull();
    expect(result?.serverTime).toBe(1000);
    expect(mockMerge).toHaveBeenCalledTimes(1);
    expect(syncQueueDb.bulkDelete).toHaveBeenCalledWith({ ids });
  });

  test('processes multiple chunks concurrently (3 batches of 50)', async () => {
    const items = createQueueItems(150);
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    mockMerge.mockImplementation(async ({ data }: { data: Record<string, unknown[]> }) => {
      const ids: string[] = [];
      for (const arr of Object.values(data)) {
        for (const item of arr) {
          const id = (item as Record<string, unknown>).id;
          if (id) ids.push(String(id));
        }
      }
      return mockSuccessResponse(ids, Date.now());
    });

    const result = await service.processQueue();

    expect(result).not.toBeNull();
    expect(mockMerge).toHaveBeenCalledTimes(3);
    expect(syncQueueDb.bulkDelete).toHaveBeenCalled();
  });

  test('processes chunks in batches of 3 concurrency', async () => {
    const items = createQueueItems(200);
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    let concurrentCalls = 0;
    let maxConcurrent = 0;

    mockMerge.mockImplementation(async () => {
      concurrentCalls++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
      await new Promise((r) => setTimeout(r, 10));
      concurrentCalls--;
      return mockSuccessResponse([], Date.now());
    });

    await service.processQueue();

    expect(mockMerge).toHaveBeenCalledTimes(4);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  test('aborts entire sync on AuthExpiredError in any chunk', async () => {
    const items = createQueueItems(150);
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    mockMerge
      .mockResolvedValueOnce(createOkResponse({
        success: true,
        results: { created: { account: [{ sync_id: 'id-0' }] } },
        serverTime: 100,
      }))
      .mockResolvedValueOnce(createOkResponse({
        success: true,
        results: { created: { account: [{ sync_id: 'id-50' }] } },
        serverTime: 200,
      }))
      .mockRejectedValueOnce(new AuthExpiredError());

    const result = await service.processQueue();

    expect(result).toBeNull();

    const { syncLockService } = await import('@/services/sync/SyncLockService');
    expect(syncLockService.release).toHaveBeenCalled();
  });

  test('handles HTTP error in one chunk without aborting other chunks in same batch', async () => {
    const items = createQueueItems(150);
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (syncQueueDb.getByIds as ReturnType<typeof vi.fn>).mockResolvedValue(items.map((i) => ({ ...i, retryCount: 0 })));

    const _successIds = items.slice(50, 150).map((i) => i.id);
    mockMerge
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockSuccessResponse(items.slice(50, 100).map((i) => i.id), 200))
      .mockResolvedValueOnce(mockSuccessResponse(items.slice(100, 150).map((i) => i.id), 300));

    const result = await service.processQueue();

    expect(result).not.toBeNull();
    expect(mockMerge).toHaveBeenCalledTimes(3);
    expect(result?.serverTime).toBe(300);
  });

  test('handles non-ok HTTP response without aborting other chunks', async () => {
    const items = createQueueItems(150);
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (syncQueueDb.getByIds as ReturnType<typeof vi.fn>).mockResolvedValue(items.slice(0, 50).map((i) => ({ ...i, retryCount: 0 })));

    mockMerge
      .mockResolvedValueOnce(createErrorResponse(500, 'Internal Server Error'))
      .mockResolvedValueOnce(mockSuccessResponse(items.slice(50, 100).map((i) => i.id), 200))
      .mockResolvedValueOnce(mockSuccessResponse(items.slice(100, 150).map((i) => i.id), 300));

    const result = await service.processQueue();

    expect(result).not.toBeNull();
    expect(mockMerge).toHaveBeenCalledTimes(3);
    expect(result?.serverTime).toBe(300);
  });

  test('saves lastSync when all chunks succeed with serverTime', async () => {
    const items = createQueueItems(50);
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    localStorage.setItem('last_sync', '1');

    mockMerge.mockResolvedValue(mockSuccessResponse(items.map((i) => i.id), 5000));

    await service.processQueue();

    expect(localStorage.getItem('last_sync')).toBe('5000');
  });

  test('removes only successfully processed item IDs from queue', async () => {
    const items = createQueueItems(100);
    const { syncQueueDb } = await import('@/db/controllers/syncQueueDb');
    (syncQueueDb.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    const firstChunkIds = items.slice(0, 50).map((i) => i.id);
    const secondChunkIds = items.slice(50, 100).map((i) => i.id);

    mockMerge
      .mockResolvedValueOnce(mockSuccessResponse(firstChunkIds, 100))
      .mockResolvedValueOnce(mockSuccessResponse(secondChunkIds, 200));

    await service.processQueue();

    expect(syncQueueDb.bulkDelete).toHaveBeenCalledTimes(2);
    expect(syncQueueDb.bulkDelete).toHaveBeenNthCalledWith(1, { ids: firstChunkIds });
    expect(syncQueueDb.bulkDelete).toHaveBeenNthCalledWith(2, { ids: secondChunkIds });
  });

  // Additional error handling tests

  test('returns null when offline', async () => {
    service.setOnline(false);
    const result = await service.processQueue();
    expect(result).toBeNull();
  });

  test('returns null when lock cannot be acquired', async () => {
    const { syncLockService } = await import('@/services/sync/SyncLockService');
    (syncLockService.acquire as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await service.processQueue();
    expect(result).toBeNull();
  });
});

describe('SyncQueueService.reconcileLocalConflictsFromServer', () => {
  let service: SyncQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    service = new SyncQueueService();
    service.setOnline(true);
  });

  test('removes local conflicts not active on server', async () => {
    mockGetActiveConflicts.mockResolvedValue(
      createOkResponse({ conflicts: [{ entity_type: 'budget_entry', entity_id: 'active-1' }] })
    );
    mockConflictStoreGetAll.mockResolvedValue([
      { entityType: 'budget_entry', item: { sync_id: 'active-1' } },
      { entityType: 'budget_entry', item: { sync_id: 'stale-1' } },
    ]);

    await (service as any).reconcileLocalConflictsFromServer();

    expect(mockConflictStoreRemove).toHaveBeenCalledTimes(1);
    expect(mockConflictStoreRemove).toHaveBeenCalledWith({
      entityType: 'budget_entry',
      sync_id: 'stale-1',
    });
  });

  test('keeps local conflicts that are active on server', async () => {
    mockGetActiveConflicts.mockResolvedValue(
      createOkResponse({ conflicts: [{ entity_type: 'budget_entry', entity_id: 'active-1' }] })
    );
    mockConflictStoreGetAll.mockResolvedValue([
      { entityType: 'budget_entry', item: { sync_id: 'active-1' } },
    ]);

    await (service as any).reconcileLocalConflictsFromServer();

    expect(mockConflictStoreRemove).not.toHaveBeenCalled();
  });

  test('does not throw on network error', async () => {
    mockGetActiveConflicts.mockRejectedValue(new Error('Network error'));
    mockConflictStoreGetAll.mockResolvedValue([
      { entityType: 'budget_entry', item: { sync_id: 's1' } },
    ]);

    await expect(
      (service as any).reconcileLocalConflictsFromServer()
    ).resolves.toBeUndefined();

    expect(mockConflictStoreRemove).not.toHaveBeenCalled();
  });

  test('does nothing when server returns no conflicts', async () => {
    mockGetActiveConflicts.mockResolvedValue(
      createOkResponse({ conflicts: [] })
    );
    mockConflictStoreGetAll.mockResolvedValue([
      { entityType: 'budget_entry', item: { sync_id: 's1' } },
    ]);

    await (service as any).reconcileLocalConflictsFromServer();

    expect(mockConflictStoreRemove).toHaveBeenCalledWith({
      entityType: 'budget_entry',
      sync_id: 's1',
    });
  });

  test('does nothing when server response is not ok', async () => {
    mockGetActiveConflicts.mockResolvedValue(createErrorResponse(500, 'Server error'));
    mockConflictStoreGetAll.mockResolvedValue([
      { entityType: 'budget_entry', item: { sync_id: 's1' } },
    ]);

    await (service as any).reconcileLocalConflictsFromServer();

    expect(mockConflictStoreRemove).not.toHaveBeenCalled();
  });
});

describe('SyncQueueService.bulkUpsertByEntityType (public)', () => {
  let service: SyncQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    service = new SyncQueueService();
    service.setOnline(true);
  });

  test('calls the correct db accessor with mapped rows', async () => {
    const { accountsDb } = await import('@/db/controllers/accountsDb');
    (accountsDb.bulkGet as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await service.bulkUpsertByEntityType('account', [
      { item: { id: 'acc-1', name: 'Test Account', initial_balance: 100, status: 'active' } as any, syncId: 'acc-1' },
    ]);

    expect(accountsDb.bulkGet).toHaveBeenCalled();
    expect(accountsDb.bulkPut).toHaveBeenCalled();
    const putCall = (accountsDb.bulkPut as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(putCall.entries).toHaveLength(1);
    expect(putCall.entries[0].sync_id).toBe('acc-1');
    expect(putCall.entries[0].name).toBe('Test Account');
  });

  test('skips entity types without a db accessor', async () => {
    const { accountsDb } = await import('@/db/controllers/accountsDb');
    await service.bulkUpsertByEntityType('unknown_type', [
      { item: { id: 'x' }, syncId: 'x' },
    ]);
    expect(accountsDb.bulkPut).not.toHaveBeenCalled();
  });

  test('merges server data onto existing local row', async () => {
    const { accountsDb } = await import('@/db/controllers/accountsDb');
    (accountsDb.bulkGet as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sync_id: 'acc-1', name: 'Old Name', initial_balance: 50, status: 'active', syncedAt: 100 },
    ]);

    await service.bulkUpsertByEntityType('account', [
      { item: { id: 'acc-1', name: 'New Name', initial_balance: 200, status: 'active' } as any, syncId: 'acc-1' },
    ]);

    const putCall = (accountsDb.bulkPut as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(putCall.entries[0].name).toBe('New Name');
    expect(putCall.entries[0].initialBalance).toBe(200);
  });
});

describe('SyncQueueService.getConflicts (new implementation)', () => {
  let service: SyncQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    service = new SyncQueueService();
    service.setOnline(true);
  });

  test('returns mapped conflicts from server', async () => {
    mockGetActiveConflicts.mockResolvedValue(createOkResponse({
      conflicts: [
        {
          entity_type: 'budget_entry',
          entity_id: 'be-1',
          sync_status: 'conflict',
          conflict_data: {
            server_data: { name: 'server', amount: 100 },
            client_data: { name: 'client', amount: 200 },
            conflict_type: 'semantic',
            overlapping_fields: ['name'],
          },
        },
      ],
    }));

    const result = await service.getConflicts();

    expect(result.budget_entry).toHaveLength(1);
    expect(result.budget_entry[0].sync_id).toBe('be-1');
    expect(result.budget_entry[0].client_data).toEqual({ name: 'client', amount: 200 });
    expect(result.budget_entry[0].server_data).toEqual({ name: 'server', amount: 100 });
    expect(result.budget_entry[0].conflict_type).toBe('semantic');
    expect(mockGetActiveConflicts).toHaveBeenCalledTimes(1);
  });

  test('returns empty object when no active conflicts', async () => {
    mockGetActiveConflicts.mockResolvedValue(createOkResponse({ conflicts: [] }));

    const result = await service.getConflicts();

    expect(result).toEqual({});
  });

  test('returns empty on API error', async () => {
    mockGetActiveConflicts.mockResolvedValue(createErrorResponse(500, 'Server error'));

    const result = await service.getConflicts();

    expect(result).toEqual({});
  });
});
