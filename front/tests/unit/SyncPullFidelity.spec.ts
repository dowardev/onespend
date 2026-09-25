// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';

import { mapServerItemToRow } from '@/services/sync/SyncQueueService';
import type { SyncItemData } from '@/services/syncService';

const emptyMaps = () => ({
  accountIdMap: new Map<number, string>(),
  providerIdMap: new Map<number, string>(),
  supplierProductIdMap: new Map<number, string>(),
  recurringRecordIdMap: new Map<number, string>(),
});

describe('mapServerItemToRow — budget_entry (LBDS-276 class 1 / 2)', () => {
  it('restores category and _fromRecurringId from the server payload (no local base)', async () => {
    const item: SyncItemData = {
      id: 'remote-sync-id-1',
      id_server: 42,
      name: 'Lunch',
      amount: 1200,
      date: '2026-09-21',
      payment_type: 'cash',
      entry_type: 'egreso',
      account_id: 7,
      supplier_id: null,
      supplier_name: '',
      category: 'food',
      _from_recurring_id: 'recurring-abc',
      version: 3,
      status: 'active',
    } as unknown as SyncItemData;

    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item,
      base: {},
      ...emptyMaps(),
    });

    expect(row.sync_id).toBe('remote-sync-id-1');
    expect(row.serverId).toBe(42);
    expect(row.name).toBe('Lunch');
    // The fix under test:
    expect(row.category).toBe('food');
    expect(row._fromRecurringId).toBe('recurring-abc');
  });

  it('falls back to base when the server payload omits category / _from_recurring_id', async () => {
    const item: SyncItemData = {
      id: 'remote-sync-id-2',
      id_server: 43,
      name: 'Coffee',
      amount: 500,
      date: '2026-09-21',
      payment_type: 'cash',
      entry_type: 'egreso',
      account_id: 7,
      version: 1,
      status: 'active',
    } as unknown as SyncItemData;

    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item,
      // A local base where the user already had a category set; the pull must
      // not clobber it with `undefined`.
      base: { category: 'food', _fromRecurringId: 'recurring-keep-me' },
      ...emptyMaps(),
    });

    expect(row.category).toBe('food');
    expect(row._fromRecurringId).toBe('recurring-keep-me');
  });

  it('does not lose category when the server value is explicitly null', async () => {
    const item: SyncItemData = {
      id: 'remote-sync-id-3',
      id_server: 44,
      name: 'Mystery',
      amount: 1,
      date: '2026-09-21',
      payment_type: 'cash',
      entry_type: 'egreso',
      account_id: 7,
      category: null,
      version: 1,
      status: 'active',
    } as unknown as SyncItemData;

    const row = await mapServerItemToRow({
      entityType: 'budget_entry',
      item,
      base: {},
      ...emptyMaps(),
    });

    // Server didn't carry a category for this entry; the field should be
    // absent, not "" (which would still try to resolve to a label).
    expect(row.category).toBeUndefined();
  });
});

describe('mapServerItemToRow — recurring_record (LBDS-276 class 2)', () => {
  it('maps every server-persisted repeat-* / time / notes / status onto the camelCase front keys', async () => {
    const item: SyncItemData = {
      id: 'rec-1',
      id_server: 1001,
      name: 'Monthly rent',
      amount: 80000,
      type: 'expense',
      entry_type: 'egreso',
      account_id: 7,
      repeat_frequency: 'monthly',
      repeat_interval: 1,
      repeat_days: null,
      repeat_month_day: 5,
      repeat_month_weekday_mode: null,
      repeat_month_weekday: null,
      repeat_month_weekday_ordinal: null,
      repeat_year_month: null,
      repeat_year_day: null,
      time: '09:00',
      auto_insert: true,
      start_date: '2026-09-21',
      end_date: null,
      estimated: 80000,
      items: ['rent', 'tax'],
      notes: 'monthly subscription',
      status: 'active',
      version: 4,
      payment_type: 'cash',
    } as unknown as SyncItemData;

    const row = await mapServerItemToRow({
      entityType: 'recurring_record',
      item,
      base: {},
      ...emptyMaps(),
    });

    expect(row.sync_id).toBe('rec-1');
    expect(row.serverId).toBe(1001);
    expect(row.type).toBe('expense');
    expect(row.repeatFrequency).toBe('monthly');
    expect(row.repeatInterval).toBe(1);
    expect(row.repeatMonthDay).toBe(5);
    expect(row.time).toBe('09:00');
    expect(row.autoInsert).toBe(true);
    expect(row.estimated).toBe(80000);
    expect(row.notes).toBe('monthly subscription');
    expect(row.status).toBe('active');
    expect(row.amount).toBe(80000);
    // Front key (`repeatFrequency`) is the one the rest of the app reads —
    // the legacy `r.frequency` write would have left these undefined.
    expect(row.repeatFrequency).toBeDefined();
    expect((row as { frequency?: unknown }).frequency).toBeUndefined();
  });

  it('falls back to base values when the server payload omits optional repeat-* fields', async () => {
    const item: SyncItemData = {
      id: 'rec-2',
      id_server: 1002,
      name: 'Paycheck',
      amount: 200000,
      type: 'income',
      entry_type: 'ingreso',
      account_id: 7,
      repeat_frequency: 'monthly',
      repeat_interval: 1,
      // The server is allowed to omit repeat_days etc. when not applicable.
      start_date: '2026-09-21',
      end_date: null,
      notes: undefined,
      version: 1,
      status: 'active',
      payment_type: 'cash',
    } as unknown as SyncItemData;

    const row = await mapServerItemToRow({
      entityType: 'recurring_record',
      item,
      // A local row that the user already had with `time` and `notes`. Pull
      // must preserve them.
      base: { time: '08:30', notes: 'pre-existing note' },
      ...emptyMaps(),
    });

    expect(row.time).toBe('08:30');
    expect(row.notes).toBe('pre-existing note');
  });
});
