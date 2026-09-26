// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach } from 'vitest';

import {
  advanceLastSyncMonotonic,
  advanceLastSyncAfterPull,
  readLastSync,
} from '@/services/sync/SyncQueueService';

const LAST_SYNC_KEY = 'last_sync';

beforeEach(() => {
  localStorage.clear();
});

describe('advanceLastSyncMonotonic (LBDS-276 class 5)', () => {
  it('writes the candidate when there is no stored value yet', () => {
    advanceLastSyncMonotonic({ candidate: 500 });
    expect(localStorage.getItem(LAST_SYNC_KEY)).toBe('500');
    expect(readLastSync()).toBe(500);
  });

  it('clamps upward when the candidate is greater than the stored value', () => {
    localStorage.setItem(LAST_SYNC_KEY, '100');
    advanceLastSyncMonotonic({ candidate: 250 });
    expect(localStorage.getItem(LAST_SYNC_KEY)).toBe('250');
  });

  it('does NOT decrease when the candidate is smaller than the stored value (client clock behind)', () => {
    localStorage.setItem(LAST_SYNC_KEY, '500');
    advanceLastSyncMonotonic({ candidate: 100 });
    expect(localStorage.getItem(LAST_SYNC_KEY)).toBe('500');
  });

  it('ignores non-finite or non-positive candidates', () => {
    localStorage.setItem(LAST_SYNC_KEY, '200');
    advanceLastSyncMonotonic({ candidate: 0 });
    advanceLastSyncMonotonic({ candidate: -10 });
    advanceLastSyncMonotonic({ candidate: Number.NaN });
    advanceLastSyncMonotonic({ candidate: Number.POSITIVE_INFINITY });
    advanceLastSyncMonotonic({ candidate: null });
    advanceLastSyncMonotonic({ candidate: undefined });
    expect(localStorage.getItem(LAST_SYNC_KEY)).toBe('200');
  });
});

describe('advanceLastSyncAfterPull (LBDS-276 class 3)', () => {
  it('prefers the max delivered updated_at over the serverTime', () => {
    // Server response last-page serverTime = 1000, but the rows it returned
    // top out at updated_at = 800. The new cursor must sit on 800 — not the
    // server now() — to close the skip window in `updated_at >= last_sync`:
    // any row committed with updated_at > 800 will be re-delivered next pull,
    // while advancing to 1000 would skip that gap.
    advanceLastSyncAfterPull({ serverTime: 1000, maxUpdatedAt: 800 });
    expect(readLastSync()).toBe(800);
  });

  it('falls back to serverTime when no rows were delivered (maxUpdatedAt=0)', () => {
    advanceLastSyncAfterPull({ serverTime: 1234, maxUpdatedAt: 0 });
    expect(readLastSync()).toBe(1234);
  });

  it('does nothing when neither signal is present', () => {
    localStorage.setItem(LAST_SYNC_KEY, '500');
    advanceLastSyncAfterPull({ serverTime: undefined, maxUpdatedAt: undefined });
    expect(readLastSync()).toBe(500);
  });

  it('preserves a higher stored value across the call', () => {
    localStorage.setItem(LAST_SYNC_KEY, '900');
    // Candidate is below the stored value; must remain.
    advanceLastSyncAfterPull({ serverTime: 800, maxUpdatedAt: 800 });
    expect(readLastSync()).toBe(900);
  });
});
