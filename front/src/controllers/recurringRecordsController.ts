// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { recurringRecordsDb } from '@/db/controllers/recurringRecordsDb'
import { syncQueue } from '@/services/syncQueue'
import { ref } from 'vue'

// Reactive signal bumped whenever the recurring records set changes (add/update/remove/toggle).
// BudgetView watches it to re-run processRecurringForDate without a full page reload.
export const recurringRecordsChangeSignal = ref(0);

function generateId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(8 + parseInt(hex[16], 16) % 4).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export type RecurringType = 'cargo' | 'provedor';
export type RepeatFrequency = 'day' | 'week' | 'month' | 'year';

export interface RecurringProduct {
  sync_id?: string;
  supplierProductId?: string | number | null;
  productName: string;
  productPrice: number;
  quantity: number;
}

export interface RecurringItem {
  amount: number | string;
  accountId: string | number | { id: string | number } | null;
}

export interface RecurringRecord {
  id?: string | number;
  sync_id?: string;
  serverId?: number | null;
  type: RecurringType;
  entryType: 'ingreso' | 'egreso';
  name: string;
  amount?: number;
  accountId?: string | number | null;
  repeatFrequency: RepeatFrequency;
  repeatInterval: number;
  repeatDays?: number[];
  repeatMonthDay?: number;
  repeatMonthWeekdayMode?: boolean;
  repeatMonthWeekday?: number;
  repeatMonthWeekdayOrdinal?: number;
  repeatYearMonth?: number;
  repeatYearDay?: number;
  time?: string;
  autoInsert: boolean;
  startDate: string;
  endDate?: string | null;
  estimated?: number;
  products?: RecurringProduct[];
  items?: RecurringItem[];
  notes?: string;
  status: 'active' | 'paused' | 'deleted';
  createdAt?: number;
  pausedAt?: number;
  resumedAt?: number;
  synced_at?: number;
  _synced?: boolean;
}

export const RECURRING_FIELD_MAP: Record<string, keyof RecurringRecord> = {
  auto_insert: 'autoInsert',
  repeat_frequency: 'repeatFrequency',
  repeat_interval: 'repeatInterval',
  repeat_days: 'repeatDays',
  repeat_month_day: 'repeatMonthDay',
  repeat_month_weekday_mode: 'repeatMonthWeekdayMode',
  repeat_month_weekday: 'repeatMonthWeekday',
  repeat_month_weekday_ordinal: 'repeatMonthWeekdayOrdinal',
  repeat_year_month: 'repeatYearMonth',
  repeat_year_day: 'repeatYearDay',
  start_date: 'startDate',
  end_date: 'endDate',
  entry_type: 'entryType',
};

class RecurringRecordsController {
  async getAllRecords(): Promise<RecurringRecord[]> {
    return await recurringRecordsDb.getAll() as RecurringRecord[];
  }

  async getActiveRecords(): Promise<RecurringRecord[]> {
    return await recurringRecordsDb.getActive() as RecurringRecord[];
  }

  async addRecord(params: { record: RecurringRecord }): Promise<RecurringRecord> {
    const { record } = params;
    const newRecord: RecurringRecord = {
      ...record,
      sync_id: record.sync_id || generateId(),
      createdAt: record.createdAt || Date.now(),
      status: record.status || 'active',
    };

    if (newRecord.items) {
      newRecord.items = newRecord.items.map(item => ({
        ...item,
        amount: Number(item.amount) || 0,
      }));
    }

    const syncId = await recurringRecordsDb.add({ entry: newRecord as any });
    newRecord.id = typeof syncId === 'string' ? syncId : String(syncId);
    await syncQueue.syncRecurringRecord({ record: newRecord, operation: 'create' });
    recurringRecordsChangeSignal.value++;
    return newRecord;
  }

  async updateRecord(params: { id: string | number; changes: Partial<RecurringRecord> }): Promise<void> {
    const { id, changes } = params;
    const existing = await this.getRecordById({ id });
    if (!existing) return;
    const updated = { ...existing, ...changes };
    await recurringRecordsDb.put({ entry: updated as any });
    await syncQueue.syncRecurringRecord({ record: updated, operation: 'update' });
    recurringRecordsChangeSignal.value++;
  }

  async removeRecord(params: { id: string | number }): Promise<void> {
    const { id } = params;
    const existing = await this.getRecordById({ id });
    if (!existing) return;
    existing.status = 'deleted';
    await recurringRecordsDb.put({ entry: existing as any });
    await syncQueue.syncRecurringRecord({ record: existing, operation: 'delete' });
    recurringRecordsChangeSignal.value++;
  }

  async getRecordById(params: { id: string | number }): Promise<RecurringRecord | null> {
    const { id } = params;
    const all = await this.getAllRecords();
    // sync_id is the guaranteed primary key; id is optional, so match both.
        return (
          all.find(
            (r) => String(r.sync_id) === String(id) || String(r.id) === String(id),
          ) || null
        );
  }

  async getRecordBySyncId(params: { syncId: string }): Promise<RecurringRecord | null> {
    const { syncId } = params;
    return await recurringRecordsDb.getBySyncId({ syncId }) as RecurringRecord | null;
  }

  async toggleActive(params: { id: string | number }): Promise<void> {
    const { id } = params;
    const record = await this.getRecordById({ id });
    if (!record) return;
    const newStatus = record.status === 'active' ? 'paused' : 'active';
    record.status = newStatus;
    if (newStatus === 'paused') {
      record.pausedAt = Date.now();
    } else {
      record.resumedAt = Date.now();
    }
    await recurringRecordsDb.put({ entry: record as any });
    await syncQueue.syncRecurringRecord({ record, operation: 'update' });
    recurringRecordsChangeSignal.value++;
  }

  async repairRecords(): Promise<number> {
    const all = await this.getAllRecords();
    let repaired = 0;

    for (const record of all) {
      const raw = record as unknown as Record<string, unknown>;
      let needsRepair = false;

      for (const [snakeKey, camelKey] of Object.entries(RECURRING_FIELD_MAP)) {
        if (raw[snakeKey] !== undefined && raw[camelKey] === undefined) {
          raw[camelKey] = raw[snakeKey];
          needsRepair = true;
        }
      }

      if (needsRepair) {
        await recurringRecordsDb.put({ entry: record as any });
        repaired++;
      }
    }

    if (repaired > 0) {
      console.warn(`[recurring] repairRecords: fixed ${repaired} records with snake_case fields`);
    }
    return repaired;
  }
}

export const recurringRecordsController = new RecurringRecordsController();
export default recurringRecordsController;
export { RecurringRecordsController };
