// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { collectAckIds, extractAckId, normalizeServerTime, partitionChunkIds } from '../SyncQueueService';

// LBDS-244: the merge ack used to answer deletes as [{sync_id: null, id: null}]
// and serverTime as an ISO-8601 string. These helpers centralize the tolerant
// parsing so the queue drains and last_sync stays numeric.
describe('extractAckId', () => {
  it('returns plain string items as-is', () => {
    expect(extractAckId({ item: 'sync-1' })).toBe('sync-1');
  });

  it('returns null for empty strings', () => {
    expect(extractAckId({ item: '' })).toBeNull();
  });

  it('prefers sync_id when present', () => {
    expect(extractAckId({ item: { sync_id: 'a', id: 'b' } })).toBe('a');
  });

  it('falls back to id when sync_id is null (legacy delete ack)', () => {
    expect(extractAckId({ item: { sync_id: null, id: 'b' } })).toBe('b');
  });

  it('returns null when both sync_id and id are null', () => {
    expect(extractAckId({ item: { sync_id: null, id: null } })).toBeNull();
  });

  it('stringifies finite numeric ids', () => {
    expect(extractAckId({ item: { sync_id: 42 } })).toBe('42');
  });

  it('returns null for nullish and scalar non-string items', () => {
    expect(extractAckId({ item: null })).toBeNull();
    expect(extractAckId({ item: undefined })).toBeNull();
    expect(extractAckId({ item: 42 })).toBeNull();
  });
});

describe('normalizeServerTime', () => {
  it('passes unix seconds through', () => {
    expect(normalizeServerTime({ serverTime: 1789200337 })).toBe(1789200337);
  });

  it('floors fractional timestamps', () => {
    expect(normalizeServerTime({ serverTime: 1789200337.9 })).toBe(1789200337);
  });

  it('parses numeric strings', () => {
    expect(normalizeServerTime({ serverTime: '1789200337' })).toBe(1789200337);
  });

  it('parses legacy ISO-8601 strings to unix seconds', () => {
    expect(normalizeServerTime({ serverTime: '2026-09-12T08:05:37+00:00' })).toBe(
      Math.floor(Date.parse('2026-09-12T08:05:37+00:00') / 1000),
    );
  });

  it('returns null for garbage, empty, nullish and non-finite input', () => {
    expect(normalizeServerTime({ serverTime: 'garbage' })).toBeNull();
    expect(normalizeServerTime({ serverTime: '' })).toBeNull();
    expect(normalizeServerTime({ serverTime: null })).toBeNull();
    expect(normalizeServerTime({ serverTime: undefined })).toBeNull();
    expect(normalizeServerTime({ serverTime: Number.NaN })).toBeNull();
    expect(normalizeServerTime({ serverTime: Number.POSITIVE_INFINITY })).toBeNull();
  });
});

describe('extractAckId legacy shapes', () => {
  it('falls back to id on empty-string sync_id', () => {
    expect(extractAckId({ item: { sync_id: '', id: 'b' } })).toBe('b');
  });
});

describe('normalizeServerTime bounds', () => {
  it('rejects zero and negative timestamps', () => {
    expect(normalizeServerTime({ serverTime: 0 })).toBeNull();
    expect(normalizeServerTime({ serverTime: -5 })).toBeNull();
    expect(normalizeServerTime({ serverTime: '-5' })).toBeNull();
  });
});

describe('collectAckIds', () => {
  it('collects ids from mixed-shape buckets', () => {
    expect(collectAckIds({ bucket: ['a', { sync_id: 'b' }, { sync_id: null, id: 'c' }, { sync_id: null }] })).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('returns empty for non-array buckets', () => {
    expect(collectAckIds({ bucket: 5 })).toEqual([]);
    expect(collectAckIds({ bucket: null })).toEqual([]);
  });
});

describe('partitionChunkIds', () => {
  it('removes acked ids unless errored', () => {
    expect(
      partitionChunkIds({ chunkItemIds: ['a', 'b', 'c'], succeededIds: ['a', 'b'], errorIds: ['b'], conflictIds: [] }),
    ).toEqual({ toRemove: ['a'], missed: ['c'] });
  });

  it('never reports conflicted ids as missed', () => {
    expect(partitionChunkIds({ chunkItemIds: ['a'], succeededIds: [], errorIds: [], conflictIds: ['a'] })).toEqual({
      toRemove: [],
      missed: [],
    });
  });
});

describe('refreshOnlineStatus (stale offline flag)', () => {
  it('recovers a stale offline flag from the live navigator value', async () => {
    const { syncQueueService } = await import('../SyncQueueService');
    const seen: boolean[] = [];
    const off = syncQueueService.onOnlineChange((online) => seen.push(online));
    try {
      // Simulate the missed-'online'-event state on a real device: the cached
      // flag says offline while the browser is actually online (jsdom defaults
      // navigator.onLine to true).
      syncQueueService.setOnline(false);
      expect(syncQueueService.getOnlineStatus()).toBe(false);
      expect(syncQueueService.refreshOnlineStatus()).toBe(true);
      expect(syncQueueService.getOnlineStatus()).toBe(true);
      expect(seen).toContain(true);
    } finally {
      off();
      syncQueueService.setOnline(true);
    }
  });

  it('keeps a genuine offline state when navigator agrees', async () => {
    const { syncQueueService } = await import('../SyncQueueService');
    const original = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    try {
      syncQueueService.setOnline(false);
      expect(syncQueueService.refreshOnlineStatus()).toBe(false);
    } finally {
      if (original) Object.defineProperty(window.navigator, 'onLine', original);
      syncQueueService.setOnline(true);
    }
  });
});
