// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { SyncController } from '@/controllers/syncController';

const mockResolveConflictApi = vi.fn();
const mockApplyServerItem = vi.fn();
const mockSyncQueueDbDelete = vi.fn();
const mockConflictStoreRemove = vi.fn();
const mockConflictStoreClear = vi.fn();

vi.mock('@/services/syncService', () => ({
  syncService: {
    getOnlineStatus: vi.fn(() => true),
    onOnlineChange: vi.fn(() => vi.fn()),
    getQueueCount: vi.fn(async () => 0),
    getLastSyncTime: vi.fn(() => 0),
    getLastSyncDisplayTime: vi.fn(() => 0),
    processQueue: vi.fn(),
    pullChanges: vi.fn(),
    getConflicts: vi.fn(),
    getConflictStore: vi.fn(),
    getQueueItems: vi.fn(),
    clearQueue: vi.fn(),
    fullSyncAndSave: vi.fn(),
    applyServerItem: (...args: unknown[]) => mockApplyServerItem(...args),
  },
}));

vi.mock('@/db/controllers/syncQueueDb', () => ({
  syncQueueDb: {
    getAll: vi.fn(() => []),
    count: vi.fn(() => 0),
    bulkDelete: vi.fn(),
    getByIds: vi.fn(() => []),
    bulkPut: vi.fn(),
    delete: (...args: unknown[]) => mockSyncQueueDbDelete(...args),
    add: vi.fn(),
    put: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('@/db/controllers/deadLetterQueueDb', () => ({ deadLetterQueueDb: { getAll: vi.fn(() => []), count: vi.fn(() => 0), clear: vi.fn(), delete: vi.fn(), bulkDelete: vi.fn(), bulkAdd: vi.fn() } }));

vi.mock('@/services/sync/SyncApiService', () => ({
  syncApiService: {
    resolveConflict: (...args: unknown[]) => mockResolveConflictApi(...args),
    getResolvedConflicts: vi.fn(),
  },
}));

vi.mock('@/services/sync/ConflictResolutionService', () => ({
  conflictResolutionService: {
    getStore: vi.fn(() => ({
      remove: (...args: unknown[]) => mockConflictStoreRemove(...args),
      getAll: vi.fn(async () => []),
      add: vi.fn(),
      clear: (...args: unknown[]) => mockConflictStoreClear(...args),
      getCount: vi.fn(async () => 0),
    })),
  },
}));

vi.mock('@/stores/budgetDayStore', () => ({
  useBudgetDayStore: vi.fn(() => ({
    selectedDate: '2026-07-07',
    loadBudgetForDate: vi.fn(async () => {}),
  })),
}));

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

describe('SyncController.resolveConflict', () => {
  let controller: SyncController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new (SyncController as any).constructor();
    vi.spyOn(controller, 'getIsOnline' as any, 'get').mockReturnValue(true);
  });

  test('keep-server: calls API, writes entity to Dexie, dequeues, removes conflict', async () => {
    const serverEntity = { id: 'acc-1', name: 'Server Name', initial_balance: 100 };
    mockResolveConflictApi.mockResolvedValue(
      createOkResponse({ success: true, entity: serverEntity })
    );

    const result = await controller.resolveConflict({
      entity_type: 'account',
      entity_id: 'acc-1',
      resolution: 'server',
    });

    expect(result).toEqual({ ok: true });
    expect(mockResolveConflictApi).toHaveBeenCalledWith({
      body: { entity_type: 'account', entity_id: 'acc-1', resolution: 'server', client_data: undefined },
    });
    expect(mockApplyServerItem).toHaveBeenCalledWith({
      entityType: 'account',
      item: serverEntity,
      syncId: 'acc-1',
    });
    expect(mockSyncQueueDbDelete).toHaveBeenCalledWith({ id: 'acc-1' });
    expect(mockConflictStoreRemove).toHaveBeenCalledWith({
      entityType: 'account',
      sync_id: 'acc-1',
    });
  });

  test('keep-server: works without entity in response', async () => {
    mockResolveConflictApi.mockResolvedValue(
      createOkResponse({ success: true })
    );

    const result = await controller.resolveConflict({
      entity_type: 'account',
      entity_id: 'acc-1',
      resolution: 'server',
    });

    expect(result).toEqual({ ok: true });
    expect(mockApplyServerItem).not.toHaveBeenCalled();
    expect(mockSyncQueueDbDelete).toHaveBeenCalledWith({ id: 'acc-1' });
    expect(mockConflictStoreRemove).toHaveBeenCalled();
  });

  test('keep-client: calls API, does not write entity, does not dequeue', async () => {
    mockResolveConflictApi.mockResolvedValue(
      createOkResponse({ success: true })
    );

    const result = await controller.resolveConflict({
      entity_type: 'account',
      entity_id: 'acc-1',
      resolution: 'client',
      client_data: { name: 'Client Name' },
    });

    expect(result).toEqual({ ok: true });
    expect(mockResolveConflictApi).toHaveBeenCalledWith({
      body: { entity_type: 'account', entity_id: 'acc-1', resolution: 'client', client_data: { name: 'Client Name' } },
    });
    expect(mockApplyServerItem).not.toHaveBeenCalled();
    expect(mockSyncQueueDbDelete).toHaveBeenCalledWith({ id: 'acc-1' });
    expect(mockConflictStoreRemove).toHaveBeenCalled();
  });

  test('returns {ok:false} when API returns non-ok', async () => {
    mockResolveConflictApi.mockResolvedValue(createErrorResponse(409, 'Conflict'));

    const result = await controller.resolveConflict({
      entity_type: 'account',
      entity_id: 'acc-1',
      resolution: 'server',
    });

    expect(result).toEqual({ ok: false, error: undefined });
    expect(mockApplyServerItem).not.toHaveBeenCalled();
    expect(mockSyncQueueDbDelete).not.toHaveBeenCalled();
    expect(mockConflictStoreRemove).not.toHaveBeenCalled();
  });

  test('returns {ok:false} when API throws', async () => {
    mockResolveConflictApi.mockRejectedValue(new Error('Network error'));

    const result = await controller.resolveConflict({
      entity_type: 'account',
      entity_id: 'acc-1',
      resolution: 'server',
    });

    expect(result).toEqual({ ok: false });
  });

  test('returns error message from 422 response', async () => {
    const errorResponse = {
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: () => Promise.resolve({
        message: 'The given data was invalid.',
        errors: {
          account_id: ['The account id field must be an integer.'],
        },
      }),
      headers: new Headers(),
    } as unknown as Response;

    mockResolveConflictApi.mockResolvedValue(errorResponse);

    const result = await controller.resolveConflict({
      entity_type: 'budget_entry',
      entity_id: 'be-1',
      resolution: 'client',
      client_data: { account_id: 'some-uuid' },
    });

    expect(result).toEqual({ ok: false, error: 'The account id field must be an integer.' });
  });
});
