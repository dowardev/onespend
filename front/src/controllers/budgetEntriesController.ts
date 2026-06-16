import { budgetDaySnapshotsDb } from '@/db/controllers/budgetDaySnapshotsDb'
import { budgetEntriesDb } from '@/db/controllers/budgetEntriesDb'
import { useBudgetEntriesStore } from '@/stores/budgetEntriesStore';
import { useBudgetDayStore } from '@/stores/budgetDayStore';
import { syncQueue } from '@/services/syncQueue';
import { formatLocalDate } from '@/utils/date';
import type { Income, PaymentType, EntryType } from '@/stores/budgetEntriesStore';
import { generateSyncId } from '@/utils/generateSyncId';

export type { Income, PaymentType, EntryType };

interface BudgetData {
  entries: Income[];
  proveedores: any[];
  isDayClosed?: boolean;
  finishDayData?: any;
}

class BudgetEntriesController {
  getStore() {
    return useBudgetEntriesStore();
  }

  getEntries() {
    return this.getStore().entries;
  }

  async getAll(): Promise<Income[]> {
    return [...this.getStore().entries];
  }

  async addEntry(params: { entry: Income }) {
    const { entry } = params;
    const store = this.getStore();
    if (!entry.sync_id) {
      entry.sync_id = generateSyncId();
    }

    syncQueue.syncEntry({ entry: entry as any, operation: 'create' });

    const id = await budgetEntriesDb.add({ entry: entry as any });
    const newEntry: Income = { ...entry, id: id as string | number };
    store.addEntry(newEntry);
    return newEntry;
  }

  async addIngreso(params: {
    name?: string;
    amount?: number;
    paymentType?: PaymentType;
    accountId?: string | number | null;
    groups?: Array<{ amount: number; accountId: string | number | null }>;
    date?: string;
    _fromRecurringId?: string;
  }) {
    const { name = '', amount = 0, paymentType = 'cash' as PaymentType, accountId = null, groups = [], date, _fromRecurringId } = params;
    const dayStore = useBudgetDayStore();
    const entryDate = date || dayStore.selectedDate;

    const entry: Income = {
      id: Date.now() + Math.random(),
      sync_id: generateSyncId(),
      name,
      amount: Number(amount) || 0,
      date: entryDate,
      paymentType,
      entryType: 'ingreso',
      accountId,
      groups,
      createdAt: Date.now(),
      _fromRecurringId,
    };

    return this.addEntry({ entry });
  }

  async addEgreso(params: {
    name?: string;
    amount?: number;
    paymentType?: PaymentType;
    accountId?: string | number | null;
    groups?: Array<{ amount: number; accountId: string | number | null }>;
    date?: string;
    _fromRecurringId?: string;
  }) {
    const { name = '', amount = 0, paymentType = 'cash' as PaymentType, accountId = null, groups = [], date, _fromRecurringId } = params;
    const dayStore = useBudgetDayStore();
    const entryDate = date || dayStore.selectedDate;

    const entry: Income = {
      id: Date.now() + Math.random(),
      sync_id: generateSyncId(),
      name,
      amount: Number(amount) || 0,
      date: entryDate,
      paymentType,
      entryType: 'egreso',
      accountId,
      groups,
      createdAt: Date.now(),
      _fromRecurringId,
    };

    return this.addEntry({ entry });
  }

  async updateEntry(params: { id: string | number; changes: Partial<Income> }) {
    const { id, changes } = params;
    const store = this.getStore();

    store.updateEntry(id, changes);
    const entry = store.entries.find((e) => e.id === id);
    if (entry) {
      syncQueue.syncEntry({ entry, operation: 'update' });
    }
  }

  async updateIngreso(params: { id: string | number; changes: Partial<Income> }) {
    const { id, changes } = params;
    const store = this.getStore();
    const dayStore = useBudgetDayStore();

    const newDate = changes.date;
    const currentDate = dayStore.selectedDate;

    if (newDate && newDate !== currentDate) {
      const entry = store.entries.find((e) => e.id === id);
      if (!entry) return;

      const updatedEntry = { ...entry, ...changes };
      store.removeEntry(id);

      const dateKey = `budget:${currentDate}`;
      const existing = await budgetDaySnapshotsDb.getById({ id: dateKey }) as { data?: BudgetData } | null;
      const entries = existing?.data?.entries ? JSON.parse(JSON.stringify(existing.data.entries)).filter((e: any) => String(e.id) !== String(id)) : [];
      const providers = existing?.data?.proveedores ? JSON.parse(JSON.stringify(existing.data.proveedores)) : [];
      await budgetDaySnapshotsDb.put({
        entry: {
          id: dateKey,
          data: { entries, proveedores: providers, isDayClosed: dayStore.isDayClosed, finishDayData: dayStore.finishDayData },
        },
      });

      const targetKey = `budget:${newDate}`;
      const targetData = await budgetDaySnapshotsDb.getById({ id: targetKey }) as { data?: BudgetData } | null;
      const targetEntries = targetData?.data?.entries ? JSON.parse(JSON.stringify(targetData.data.entries)) : [];
      const targetProviders = targetData?.data?.proveedores ? JSON.parse(JSON.stringify(targetData.data.proveedores)) : [];
      targetEntries.push(JSON.parse(JSON.stringify(updatedEntry)));
      await budgetDaySnapshotsDb.put({
        entry: {
          id: targetKey,
          data: { entries: targetEntries, proveedores: targetProviders, isDayClosed: false, finishDayData: { totalSalesEfectivo: 0, totalSalesTarjeta: 0, totalSalesCredito: 0, type: '%', margin: 0 } },
        },
      });

      syncQueue.syncEntry({ entry: updatedEntry, operation: 'update' });
    } else {
      store.updateEntry(id, changes);
      const entry = store.entries.find((e) => e.id === id);
      if (entry) {
        syncQueue.syncEntry({ entry, operation: 'update' });
      }
    }
  }

  async removeEntry(params: { id: string | number }) {
    const { id } = params;
    const store = this.getStore();
    const entry = store.entries.find((e) => e.id === id);

    store.removeEntry(id);

    if (entry) {
      syncQueue.syncEntry({ entry, operation: 'delete' });
    }
  }

  async removeIngreso(params: { id: string | number }) {
    await this.removeEntry({ id: params.id });
  }

  removeEgresosGroup(params: { groupId: string | number }) {
    const { groupId } = params;
    this.getStore().removeEgresosGroup(groupId);
  }

  async setDate(params: { date: string }) {
    const { date } = params;
    const dayStore = useBudgetDayStore();
    if (date === dayStore.selectedDate) return;
    dayStore.setSelectedDate(date);
    await dayStore.loadBudgetForDate({ date });
  }

  async changeDate(params: { days: number }) {
    const { days } = params;
    const dayStore = useBudgetDayStore();
    const d = new Date(dayStore.selectedDate);
    d.setDate(d.getDate() + days);
    const newDate = formatLocalDate({ d });
    await this.setDate({ date: newDate });
  }
}

const budgetEntriesController = new BudgetEntriesController();
export default budgetEntriesController;
export { BudgetEntriesController };
