// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { ConflictResolutionService } from '@/services/sync/ConflictResolutionService';
import type { SyncConflictItem } from '@/services/syncService';

const mockResolveConflict = vi.fn();
const mockResolveConflictsBatch = vi.fn();
let mockConfigStore: Record<string, { id: string; value: unknown[] }> = {};

vi.mock('@/services/sync/SyncApiService', () => ({
  syncApiService: {
    resolveConflict: (...args: unknown[]) => mockResolveConflict(...args),
    resolveConflictsBatch: (...args: unknown[]) => mockResolveConflictsBatch(...args),
  },
}));

vi.mock('@/db/OneSpendDB', () => ({
  default: {
    config: {
      get: vi.fn(async (key: string) => mockConfigStore[key] ?? null),
      put: vi.fn(async (entry: { id: string; value: unknown[] }) => {
        mockConfigStore[entry.id] = entry;
      }),
    },
  },
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

function makeConflictItem(overrides: Partial<SyncConflictItem> & { sync_id: string }): SyncConflictItem {
  return {
    sync_id: overrides.sync_id,
    client_data: overrides.client_data ?? { name: 'client', updated_at: 1000 },
    server_data: overrides.server_data ?? { name: 'server', updated_at: 2000 },
    ...overrides,
  } as SyncConflictItem;
}

describe('ConflictResolutionService', () => {
  let service: ConflictResolutionService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockConfigStore = {};
    service = new ConflictResolutionService();
    await service.getStore().clear();
  });

  describe('ConflictStore', () => {
    test('add and getAll persist and retrieve conflicts', async () => {
      const store = service.getStore();
      const item = makeConflictItem({ sync_id: 's1' });

      await store.add({ entityType: 'budget_entry', item });
      const all = await store.getAll();

      expect(all).toHaveLength(1);
      expect(all[0].entityType).toBe('budget_entry');
      expect(all[0].item.sync_id).toBe('s1');
    });

    test('remove deletes specific conflict by entityType and sync_id', async () => {
      const store = service.getStore();
      await store.add({ entityType: 'budget_entry', item: makeConflictItem({ sync_id: 's1' }) });
      await store.add({ entityType: 'budget_entry', item: makeConflictItem({ sync_id: 's2' }) });
      await store.add({ entityType: 'account', item: makeConflictItem({ sync_id: 'a1' }) });

      await store.remove({ entityType: 'budget_entry', sync_id: 's1' });
      const all = await store.getAll();

      expect(all).toHaveLength(2);
      expect(all.find(c => c.item.sync_id === 's1')).toBeUndefined();
    });

    test('clear removes all conflicts', async () => {
      const store = service.getStore();
      await store.add({ entityType: 'budget_entry', item: makeConflictItem({ sync_id: 's1' }) });
      await store.add({ entityType: 'account', item: makeConflictItem({ sync_id: 'a1' }) });

      await store.clear();
      expect(await store.getCount()).toBe(0);
    });

    test('caps at 100 entries', async () => {
      const store = service.getStore();
      for (let i = 0; i < 110; i++) {
        await store.add({ entityType: 'budget_entry', item: makeConflictItem({ sync_id: `s${i}` }) });
      }
      expect(await store.getCount()).toBe(100);
    });
  });

  describe('handleConflicts', () => {
    test('stores version_mismatch conflicts for user resolution', async () => {
      const conflicts: Record<string, SyncConflictItem[]> = {
        budget_entry: [
          makeConflictItem({
            sync_id: 's1',
            conflict_type: 'version_mismatch',
          }),
        ],
      };

      await service.handleConflicts(conflicts);

      const stored = await service.getStore().getAll();
      expect(stored).toHaveLength(1);
      expect(stored[0].item.sync_id).toBe('s1');
      expect(mockResolveConflictsBatch).not.toHaveBeenCalled();
    });

    test('stores semantic conflicts with overlapping_fields for user resolution', async () => {
      const conflicts: Record<string, SyncConflictItem[]> = {
        budget_entry: [
          makeConflictItem({
            sync_id: 's1',
            conflict_type: 'semantic',
            overlapping_fields: ['name', 'amount'],
          }),
        ],
      };

      await service.handleConflicts(conflicts);

      const stored = await service.getStore().getAll();
      expect(stored).toHaveLength(1);
      expect(mockResolveConflictsBatch).not.toHaveBeenCalled();
    });

    test('does NOT store auto-resolvable conflicts', async () => {
      mockResolveConflictsBatch.mockResolvedValue(createOkResponse({ success: true, errors: [] }));

      const conflicts: Record<string, SyncConflictItem[]> = {
        budget_entry: [
          makeConflictItem({ sync_id: 's1' }),
        ],
      };

      await service.handleConflicts(conflicts);

      const stored = await service.getStore().getAll();
      expect(stored).toHaveLength(0);
    });

    test('calls resolveConflictsBatch for auto-resolvable conflicts', async () => {
      mockResolveConflictsBatch.mockResolvedValue(createOkResponse({ success: true, errors: [] }));

      const conflicts: Record<string, SyncConflictItem[]> = {
        budget_entry: [
          makeConflictItem({ sync_id: 's1' }),
        ],
      };

      await service.handleConflicts(conflicts);

      expect(mockResolveConflictsBatch).toHaveBeenCalledTimes(1);
      const callArg = mockResolveConflictsBatch.mock.calls[0][0];
      expect(callArg.resolutions).toHaveLength(1);
      expect(callArg.resolutions[0].entity_id).toBe('s1');
    });

    test('clears pre-existing conflict from store after successful batch resolve', async () => {
      const store = service.getStore();
      await store.add({ entityType: 'budget_entry', item: makeConflictItem({ sync_id: 's1' }) });

      mockResolveConflictsBatch.mockResolvedValue(createOkResponse({ success: true, errors: [] }));

      const conflicts: Record<string, SyncConflictItem[]> = {
        budget_entry: [
          makeConflictItem({ sync_id: 's1' }),
        ],
      };

      await service.handleConflicts(conflicts);

      const stored = await store.getAll();
      expect(stored).toHaveLength(0);
    });

    test('falls back to per-item resolveConflicts when batch fails', async () => {
      mockResolveConflictsBatch.mockResolvedValue(createErrorResponse(500, 'Server error'));
      mockResolveConflict.mockResolvedValue(createOkResponse({ success: true }));

      const conflicts: Record<string, SyncConflictItem[]> = {
        budget_entry: [
          makeConflictItem({ sync_id: 's1' }),
        ],
      };

      await service.handleConflicts(conflicts);

      expect(mockResolveConflict).toHaveBeenCalledTimes(1);
      const callArg = mockResolveConflict.mock.calls[0][0];
      expect(callArg.body.entity_id).toBe('s1');
    });

    test('clears pre-existing conflict from store after fallback resolve succeeds', async () => {
      const store = service.getStore();
      await store.add({ entityType: 'budget_entry', item: makeConflictItem({ sync_id: 's1' }) });

      mockResolveConflictsBatch.mockResolvedValue(createErrorResponse(500, 'Server error'));
      mockResolveConflict.mockResolvedValue(createOkResponse({ success: true }));

      const conflicts: Record<string, SyncConflictItem[]> = {
        budget_entry: [
          makeConflictItem({ sync_id: 's1' }),
        ],
      };

      await service.handleConflicts(conflicts);

      const stored = await store.getAll();
      expect(stored).toHaveLength(0);
    });

    test('does nothing for empty conflicts', async () => {
      await service.handleConflicts({});

      expect(mockResolveConflictsBatch).not.toHaveBeenCalled();
      expect(await service.getStore().getCount()).toBe(0);
    });
  });

  describe('resolveAuto', () => {
    test('defaults to server when both timestamps are missing', () => {
      const item = makeConflictItem({
        sync_id: 's1',
        client_data: { name: 'test' },
        server_data: { name: 'server' },
      });

      const result = service.resolveAuto('budget_entry', item);

      expect(result.resolution).toBe('server');
      expect(result.entity_id).toBe('s1');
      expect(result.client_data).toEqual({ name: 'test' });
    });

    test('chooses client when client timestamp > server timestamp', () => {
      const item = makeConflictItem({
        sync_id: 's1',
        client_data: { name: 'client', updated_at: 3000 },
        server_data: { name: 'server', updated_at: 2000 },
      });

      const result = service.resolveAuto('budget_entry', item);

      expect(result.resolution).toBe('client');
    });

    test('chooses server when server timestamp >= client timestamp', () => {
      const item = makeConflictItem({
        sync_id: 's1',
        client_data: { name: 'client', updated_at: 1000 },
        server_data: { name: 'server', updated_at: 2000 },
      });

      const result = service.resolveAuto('budget_entry', item);

      expect(result.resolution).toBe('server');
    });
  });
});
