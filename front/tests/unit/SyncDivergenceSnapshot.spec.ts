// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi } from 'vitest';

import {
  fetchServerSnapshot,
  readLocalSnapshots,
  type LocalDbLike,
  type ServerSnapshotRow,
  type SnapshotServiceLike,
} from '@/services/sync/SyncDivergenceDetector';

function okResponse(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

function makeRow(p: Partial<ServerSnapshotRow> & { sync_id: string }): ServerSnapshotRow {
  return { sync_id: p.sync_id, version: 1, updated_at: 100, ...p };
}

describe('fetchServerSnapshot — runtime wrapper', () => {
  it('tracks tombstones per entity type (regression guard for LBDS-276 review finding #2)', async () => {
    const getChanges = vi.fn(async () =>
      okResponse({
        changes: {
          account: [{ sync_id: 'acct-tomb-1', _deleted: true }],
          budget_entry: [{ sync_id: 'be-live-1', name: 'Lunch' }],
        },
        serverTime: 1000,
      }),
    );
    const api: SnapshotServiceLike = { getChanges };
    const out = await fetchServerSnapshot(api);
    expect(out.rowsByType.account).toHaveLength(0);
    expect(out.rowsByType.budget_entry).toHaveLength(1);
    expect(out.tombstoneIdsByType.account).toEqual(['acct-tomb-1']);
    // budget_entry must NOT inherit account's tombstone — pre-fix it did.
    expect(out.tombstoneIdsByType.budget_entry).toEqual([]);
  });

  it('paginates with cursor until exhausted', async () => {
    const getChanges = vi
      .fn()
      .mockResolvedValueOnce(okResponse({
        changes: { account: [makeRow({ sync_id: 'a-1' })] },
        cursor: 'page-2-token',
        serverTime: 100,
      }))
      .mockResolvedValueOnce(okResponse({
        changes: { account: [makeRow({ sync_id: 'a-2' })] },
        cursor: null,
        serverTime: 200,
      }));
    const out = await fetchServerSnapshot({ getChanges });
    expect(getChanges).toHaveBeenCalledTimes(2);
    expect(out.rowsByType.account.map((r) => r.sync_id)).toEqual(['a-1', 'a-2']);
    expect(out.serverTime).toBe(200);
  });

  it('throws on a non-2xx server response', async () => {
    const api: SnapshotServiceLike = {
      getChanges: vi.fn(async () => ({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      } as unknown as Response)),
    };
    await expect(fetchServerSnapshot(api)).rejects.toThrow(/500/);
  });

  it('falls back to empty per-entity buckets when the entityTypes filter narrows the scope', async () => {
    const api: SnapshotServiceLike = {
      getChanges: vi.fn(async () => okResponse({
        changes: { account: [makeRow({ sync_id: 'a-1' })] },
        serverTime: 50,
      })),
    };
    const out = await fetchServerSnapshot(api, { entityTypes: ['account'] });
    expect(out.rowsByType.account).toHaveLength(1);
    expect(out.tombstoneIdsByType).toEqual({ account: [] });
  });
});

describe('readLocalSnapshots — Dexie wrapper', () => {
  function makeDb(
    overrides: Partial<{
      accounts: { toArray: () => Promise<unknown[]> };
      budgetEntries: { toArray: () => Promise<unknown[]> };
      entryCategories: { toArray: () => Promise<unknown[]> };
      syncQueue: { toArray: () => Promise<unknown[]> };
    }> = {},
  ): LocalDbLike {
    const emptyTable = { toArray: async () => [] };
    return {
      accounts: overrides.accounts ?? emptyTable,
      budgetEntries: overrides.budgetEntries ?? emptyTable,
      budgetProviders: emptyTable,
      budgetProviderProducts: emptyTable,
      suppliers: emptyTable,
      supplierProducts: emptyTable,
      recurringRecords: emptyTable,
      recurringRecordProducts: emptyTable,
      entryCategories: overrides.entryCategories ?? emptyTable,
      syncQueue: overrides.syncQueue ?? emptyTable,
    };
  }

  it('treats rows with status === "deleted" as deleted (not as live)', async () => {
    const db = makeDb({
      accounts: { toArray: async () => [{ sync_id: 'a-1', name: 'X', status: 'deleted' }] },
    });
    const out = await readLocalSnapshots(db);
    expect(out.rowsByType.account).toHaveLength(1);
    expect(out.rowsByType.account[0]!.deleted).toBe(true);
  });

  it('reads queued sync ids into queuedIds', async () => {
    const db = makeDb({
      syncQueue: { toArray: async () => [{ id: 'q-1' }, { id: 'q-2' }] },
    });
    const out = await readLocalSnapshots(db);
    expect([...out.queuedIds]).toEqual(['q-1', 'q-2']);
  });

  it('reads entryCategories ids into resolvedCategoryIds', async () => {
    const db = makeDb({
      entryCategories: { toArray: async () => [{ id: 'food' }, { id: 'salary' }] },
    });
    const out = await readLocalSnapshots(db);
    expect([...out.resolvedCategoryIds]).toEqual(['food', 'salary']);
  });
});
