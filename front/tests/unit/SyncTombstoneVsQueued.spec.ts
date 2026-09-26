// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { SyncQueueService } from '@/services/sync/SyncQueueService';
import type { SyncItem } from '@/services/syncService';

const mockGetChanges = vi.fn();
const mockQueueGetAll = vi.fn();
const mockQueueBulkDelete = vi.fn();
const mockConflictAdd = vi.fn();

function createOkResponse(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

vi.mock('@/services/sync/SyncApiService', () => ({
  AuthExpiredError: class AuthExpiredError extends Error {},
  syncApiService: {
    getChanges: (...args: unknown[]) => mockGetChanges(...args),
    fullSync: vi.fn(),
    merge: vi.fn(),
    getActiveConflicts: vi.fn().mockResolvedValue(createOkResponse({ conflicts: [] })),
  },
}));

const mockAccountsBulkDelete = vi.fn();
const mockAccountsBulkPut = vi.fn();
const mockAccountsGetAll = vi.fn();
const mockAccountsBulkGet = vi.fn();
vi.mock('@/db/controllers/accountsDb', () => ({
  accountsDb: {
    getAll: (...args: unknown[]) => mockAccountsGetAll(...args),
    bulkPut: (...args: unknown[]) => mockAccountsBulkPut(...args),
    bulkDeleteBySyncIds: (...args: unknown[]) => mockAccountsBulkDelete(...args),
    bulkGet: (...args: unknown[]) => mockAccountsBulkGet(...args),
  },
}));

vi.mock('@/db/controllers/budgetEntriesDb', () => ({
  budgetEntriesDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) },
}));
vi.mock('@/db/controllers/budgetProvidersDb', () => ({
  budgetProvidersDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) },
}));
vi.mock('@/db/controllers/budgetProviderProductsDb', () => ({
  budgetProviderProductsDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) },
}));
vi.mock('@/db/controllers/suppliersDb', () => ({
  suppliersDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) },
}));
vi.mock('@/db/controllers/supplierProductsDb', () => ({
  supplierProductsDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) },
}));
vi.mock('@/db/controllers/recurringRecordsDb', () => ({
  recurringRecordsDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) },
}));
vi.mock('@/db/controllers/recurringRecordProductsDb', () => ({
  recurringRecordProductsDb: { getAll: vi.fn(() => []), bulkPut: vi.fn(), bulkDelete: vi.fn(), bulkGet: vi.fn(() => []) },
}));

vi.mock('@/db/controllers/syncQueueDb', () => ({
  syncQueueDb: {
    getAll: (...args: unknown[]) => mockQueueGetAll(...args),
    bulkDelete: (...args: unknown[]) => mockQueueBulkDelete(...args),
    count: vi.fn(() => 0),
    add: vi.fn(),
    put: vi.fn(),
    getById: vi.fn(),
    getByIds: vi.fn(() => []),
  },
}));

vi.mock('@/db/controllers/deadLetterQueueDb', () => ({ deadLetterQueueDb: { add: vi.fn(), bulkAdd: vi.fn() } }));

vi.mock('@/services/sync/ConflictResolutionService', () => ({
  conflictResolutionService: {
    getStore: () => ({ add: (...args: unknown[]) => mockConflictAdd(...args) }),
    handleConflicts: vi.fn(),
  },
}));

vi.mock('@/db/OneSpendDB', () => ({ default: { config: { put: vi.fn(), get: vi.fn(() => undefined) } } }));

beforeEach(() => {
  vi.clearAllMocks();
  // Default: there are no local Dexie accounts rows, but Dexie hooks are
  // bypassed here so the sync logic exercises cleanly.
  mockAccountsGetAll.mockResolvedValue([]);
  mockAccountsBulkGet.mockResolvedValue([]);
});

describe('saveChangesToLocalDb — LBDS-276 class 4 (tombstone vs locally queued)', () => {
  test('queued CREATE + incoming tombstone → drop the queue entry + delete locally (no resurrection)', async () => {
    mockQueueGetAll.mockResolvedValue([
      { id: 'a-1', entityType: 'account', operation: 'create', data: { name: 'X' }, timestamp: 0, retryCount: 0 } satisfies SyncItem,
    ]);

    const svc = new SyncQueueService();
    // The path under test is private-ish; we drive it through the public
    // service entry that the rest of the app uses during a pull.
    await (svc as unknown as {
      saveChangesToLocalDb: (changes: Record<string, unknown[]>) => Promise<{ failedEntityTypes: string[] }>;
    }).saveChangesToLocalDb({
      account: [{ id: 'a-1', _deleted: true }] as unknown as unknown[],
    });

    expect(mockAccountsBulkDelete).toHaveBeenCalledWith({ syncIds: ['a-1'] });
    expect(mockQueueBulkDelete).toHaveBeenCalledWith({ ids: ['a-1'] });
    expect(mockConflictAdd).not.toHaveBeenCalled();
  });

  test('queued UPDATE + incoming tombstone → escalate a conflict (no silent skip, no resurrection)', async () => {
    mockQueueGetAll.mockResolvedValue([
      { id: 'a-2', entityType: 'account', operation: 'update', data: { name: 'X' }, timestamp: 0, retryCount: 0 } satisfies SyncItem,
    ]);

    const svc = new SyncQueueService();
    await (svc as unknown as {
      saveChangesToLocalDb: (changes: Record<string, unknown[]>) => Promise<{ failedEntityTypes: string[] }>;
    }).saveChangesToLocalDb({
      account: [{ id: 'a-2', _deleted: true }] as unknown as unknown[],
    });

    // Local row must NOT be deleted (the queued update intent wins locally).
    expect(mockAccountsBulkDelete).not.toHaveBeenCalled();
    // The conflict store receives the divergence for the user to resolve.
    expect(mockConflictAdd).toHaveBeenCalledTimes(1);
    const [arg] = mockConflictAdd.mock.calls[0]! as [{ entityType: string; item: { sync_id: string; reason: string; server_data?: unknown } }];
    expect(arg.entityType).toBe('account');
    expect(arg.item.sync_id).toBe('a-2');
    expect(arg.item.reason).toMatch(/server tombstone unapplied/);
    expect(arg.item.server_data).toMatchObject({ id: 'a-2', _deleted: true });
    // The queue entry is *not* dropped; the queued update still drains.
    expect(mockQueueBulkDelete).not.toHaveBeenCalled();
  });

  test('queued DELETE + incoming tombstone → pass-through: server + client agree', async () => {
    mockQueueGetAll.mockResolvedValue([
      { id: 'a-3', entityType: 'account', operation: 'delete', data: {}, timestamp: 0, retryCount: 0 } satisfies SyncItem,
    ]);

    const svc = new SyncQueueService();
    await (svc as unknown as {
      saveChangesToLocalDb: (changes: Record<string, unknown[]>) => Promise<{ failedEntityTypes: string[] }>;
    }).saveChangesToLocalDb({
      account: [{ id: 'a-3', _deleted: true }] as unknown as unknown[],
    });

    // Local row is deleted; no conflict (both sides agree).
    expect(mockAccountsBulkDelete).toHaveBeenCalledWith({ syncIds: ['a-3'] });
    // The queued delete is now satisfied; it must be dropped from the queue
    // so the next drain does not re-send a no-op delete.
    expect(mockQueueBulkDelete).toHaveBeenCalledWith({ ids: ['a-3'] });
    expect(mockConflictAdd).not.toHaveBeenCalled();
  });

  test('queued UPDATE + non-deleting incoming change → queued op wins (existing behavior preserved)', async () => {
    mockQueueGetAll.mockResolvedValue([
      { id: 'a-4', entityType: 'account', operation: 'update', data: { name: 'X' }, timestamp: 0, retryCount: 0 } satisfies SyncItem,
    ]);
    mockAccountsBulkGet.mockResolvedValue([]);

    const svc = new SyncQueueService();
    await (svc as unknown as {
      saveChangesToLocalDb: (changes: Record<string, unknown[]>) => Promise<{ failedEntityTypes: string[] }>;
    }).saveChangesToLocalDb({
      account: [{ id: 'a-4', name: 'ServerSide' }] as unknown as unknown[],
    });

    // No local delete, no conflict escalation; the queued op keeps winning
    // and drains on its own path.
    expect(mockAccountsBulkDelete).not.toHaveBeenCalled();
    expect(mockConflictAdd).not.toHaveBeenCalled();
    // The non-deleted pending change is NOT applied (queued op is authoritative).
    expect(mockAccountsBulkPut).not.toHaveBeenCalled();
  });
});
