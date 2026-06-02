import { DixieController } from '@/controllers/dixie';

function generateId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(8 + parseInt(hex[16], 16) % 4).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export type RecurringType = 'cargo' | 'provedor';
export type RepeatFrequency = 'day' | 'week' | 'month' | 'year';

export interface RecurringProduct {
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

class RecurringController {
  private dixie: DixieController;

  constructor() {
    this.dixie = new DixieController({ storeName: 'recurring_records' });
  }

  async getAllRecords(): Promise<RecurringRecord[]> {
    const db = await this.dixie.openDB();
    const tx = db.transaction('recurring_records', 'readonly');
    const store = tx.objectStore('recurring_records');
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getActiveRecords(): Promise<RecurringRecord[]> {
    const all = await this.getAllRecords();
    return all.filter((r) => r.status === 'active');
  }

  async addRecord(params: { record: RecurringRecord }): Promise<RecurringRecord> {
    const { record } = params;
    const newRecord: RecurringRecord = {
      ...record,
      sync_id: record.sync_id || generateId(),
      createdAt: record.createdAt || Date.now(),
      status: record.status || 'active',
    };
    const id = await this.dixie.addEntry({ entry: newRecord });
    newRecord.id = typeof id === 'number' ? id : String(id);
    return newRecord;
  }

  async updateRecord(params: { id: string | number; changes: Partial<RecurringRecord> }): Promise<void> {
    const { id, changes } = params;
    const existing = await this.getRecordById({ id });
    if (!existing) return;
    const updated = { ...existing, ...changes };
    await this.dixie.putEntry({ entry: updated });
  }

  async removeRecord(params: { id: string | number }): Promise<void> {
    const { id } = params;
    const existing = await this.getRecordById({ id });
    if (!existing) return;
    existing.status = 'deleted';
    await this.dixie.putEntry({ entry: existing });
  }

  async getRecordById(params: { id: string | number }): Promise<RecurringRecord | null> {
    const { id } = params;
    const all = await this.getAllRecords();
    return all.find((r) => String(r.id) === String(id)) || null;
  }

  async getRecordBySyncId(params: { syncId: string }): Promise<RecurringRecord | null> {
    const { syncId } = params;
    const all = await this.getAllRecords();
    return all.find((r) => r.sync_id === syncId) || null;
  }

  async toggleActive(params: { id: string | number }): Promise<void> {
    const { id } = params;
    const record = await this.getRecordById({ id });
    if (!record) return;
    record.status = record.status === 'active' ? 'paused' : 'active';
    await this.dixie.putEntry({ entry: record });
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
        await this.dixie.putEntry({ entry: record });
        repaired++;
      }
    }

    if (repaired > 0) {
      console.warn(`[recurring] repairRecords: fixed ${repaired} records with snake_case fields`);
    }
    return repaired;
  }
}

export const recurringController = new RecurringController();
export default recurringController;
