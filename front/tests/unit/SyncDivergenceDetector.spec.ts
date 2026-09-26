// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';

import { compareEntitySets, LocalOnlyFieldRegistry, type LocalRowSnapshot, type ServerSnapshotRow } from '@/services/sync/SyncDivergenceDetector';

const entityType = 'budget_entry';

/**
 * Helper to build a local row with sensible defaults.
 */
function localRow(p: Partial<LocalRowSnapshot> & { sync_id: string }): LocalRowSnapshot {
  return { sync_id: p.sync_id, version: 1, updatedAt: 100, deleted: false, ...p };
}

/** Helper to build a server row with sensible defaults (unix seconds). */
function serverRow(p: Partial<ServerSnapshotRow> & { sync_id: string }): ServerSnapshotRow {
  return { sync_id: p.sync_id, version: 1, updated_at: 100, ...p };
}

describe('compareEntitySets — baselines (no drift)', () => {
  it('returns no drift when both sides are empty', () => {
    const result = compareEntitySets({ entityType, localRows: [], serverRows: [] });
    expect(result.missingOnServer).toEqual([]);
    expect(result.missingOnLocal).toEqual([]);
    expect(result.versionMismatch).toEqual([]);
    expect(result.localOnlyFields).toEqual([]);
    expect(result.danglingCategoryIds).toEqual([]);
    expect(result.serverTombstoneUnapplied).toEqual([]);
    expect(result.hasDrift).toBe(false);
  });

  it('returns no drift when local and server carry the same rows with matching versions', () => {
    const rows = [localRow({ sync_id: 'a' }), localRow({ sync_id: 'b' })];
    const sRows = [serverRow({ sync_id: 'a' }), serverRow({ sync_id: 'b' })];
    const result = compareEntitySets({ entityType, localRows: rows, serverRows: sRows });
    expect(result.hasDrift).toBe(false);
  });

  it('ignores rows currently in the local queue (they are pending intent, not drift)', () => {
    const rows = [localRow({ sync_id: 'a', version: 5 })];
    const sRows = [serverRow({ sync_id: 'a', version: 4 })];
    const result = compareEntitySets({
      entityType,
      localRows: rows,
      serverRows: sRows,
      locallyQueuedIds: new Set(['a']),
    });
    expect(result.versionMismatch).toEqual([]);
  });
});

describe('compareEntitySets — acceptance criterion (a): row the server never received', () => {
  it('reports missingOnServer for a local-only live row', () => {
    const rows = [localRow({ sync_id: 'local-only-1' })];
    const sRows: ServerSnapshotRow[] = [];
    const result = compareEntitySets({ entityType, localRows: rows, serverRows: sRows });
    expect(result.missingOnServer).toContain('local-only-1');
    expect(result.hasDrift).toBe(true);
  });

  it('excludes rows that are locally soft-deleted from missingOnServer', () => {
    const rows = [localRow({ sync_id: 'deleted', deleted: true })];
    const sRows: ServerSnapshotRow[] = [];
    const result = compareEntitySets({ entityType, localRows: rows, serverRows: sRows });
    expect(result.missingOnServer).not.toContain('deleted');
  });

  it('reports missingOnLocal for a server-side row the client has not pulled yet', () => {
    const sRows = [serverRow({ sync_id: 'server-only-1' })];
    const result = compareEntitySets({ entityType, localRows: [], serverRows: sRows });
    expect(result.missingOnLocal).toContain('server-only-1');
  });
});

describe('compareEntitySets — acceptance criterion (b): local-only field dropped by a pull', () => {
  it('lists localOnlyFields for rows whose value would not survive the next pull', () => {
    // BudgetEntryRow has two fields with NO server column: providerGroupId +
    // providerName (per `LocalOnlyFieldRegistry`). A local row that holds a
    // value for either of those, when not present on the server, would be
    // dropped by a pull of "fresh" rows.
    const registry = LocalOnlyFieldRegistry.budget_entry;
    expect(registry).toContain('providerGroupId');
    expect(registry).toContain('providerName');

    const row = localRow({
      sync_id: 'with-local-fields',
      providerGroupId: 'group-42',
      providerName: 'Cafetería',
    });
    const result = compareEntitySets({
      entityType,
      localRows: [row],
      serverRows: [serverRow({ sync_id: 'with-local-fields' })],
      localOnlyFieldSet: registry,
    });
    expect(result.localOnlyFields).toEqual([
      { sync_id: 'with-local-fields', fields: ['providerGroupId', 'providerName'] },
    ]);
    expect(result.hasDrift).toBe(true);
  });

  it('does not flag rows whose local-only fields are empty / undefined', () => {
    const registry = LocalOnlyFieldRegistry.budget_entry;
    const row = localRow({ sync_id: 'plain', providerGroupId: undefined, providerName: '' });
    const result = compareEntitySets({
      entityType,
      localRows: [row],
      serverRows: [serverRow({ sync_id: 'plain' })],
      localOnlyFieldSet: registry,
    });
    expect(result.localOnlyFields).toEqual([]);
  });
});

describe('compareEntitySets — acceptance criterion (c): dangling category id', () => {
  it('reports danglingCategoryIds for budget_entry references unknown to entryCategories', () => {
    const rows = [
      localRow({ sync_id: 'be-1', category: 'food' }), // resolved
      localRow({ sync_id: 'be-2', category: 'cat-1234-fake' }), // dangling
    ];
    const sRows: ServerSnapshotRow[] = [];
    const result = compareEntitySets({
      entityType,
      localRows: rows,
      serverRows: sRows,
      resolvedCategoryIds: new Set(['food', 'salary']),
    });
    expect(result.danglingCategoryIds).toEqual([
      { sync_id: 'be-2', name: undefined, categoryId: 'cat-1234-fake' },
    ]);
    expect(result.hasDrift).toBe(true);
  });

  it('does not flag dangling-category evidence when the resolved set is not provided', () => {
    // Defensive: a caller that does not supply `resolvedCategoryIds` (e.g. a
    // unit test for a non-budget_entry) gets no dangling report. The detector
    // only raises it when there is something to compare against.
    const row = localRow({ sync_id: 'be-1', category: 'unknown' });
    const result = compareEntitySets({ entityType, localRows: [row], serverRows: [] });
    expect(result.danglingCategoryIds).toEqual([]);
  });
});

describe('compareEntitySets — server tombstones (class 4)', () => {
  it('reports tombstones that have no local row and no locally deleted row', () => {
    const rows = [localRow({ sync_id: 'a' })];
    const result = compareEntitySets({
      entityType,
      localRows: rows,
      serverRows: [serverRow({ sync_id: 'a' })],
      serverTombstoneIds: ['a', 'gone-1'],
    });
    expect(result.serverTombstoneUnapplied).toEqual(['gone-1']);
  });

  it('does not flag a tombstone that the client already deleted locally', () => {
    const rows = [localRow({ sync_id: 'gone-1', deleted: true })];
    const result = compareEntitySets({
      entityType,
      localRows: rows,
      serverRows: [],
      serverTombstoneIds: ['gone-1'],
    });
    expect(result.serverTombstoneUnapplied).toEqual([]);
  });
});
