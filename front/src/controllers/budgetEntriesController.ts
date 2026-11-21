// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { budgetEntriesDb } from '@/db/controllers/budgetEntriesDb'
import { dataMediator } from '@/services/dataMediator';
import { toBudgetEntryRow } from '@/db/mappers'
import { useBudgetEntriesStore, mapEntryRow } from '@/stores/budgetEntriesStore';
import { useBudgetDayStore } from '@/stores/budgetDayStore';
import { syncQueue } from '@/services/syncQueue';
import { formatLocalDate } from '@/utils/date';
import type { Income, PaymentType, EntryType } from '@/stores/budgetEntriesStore';
import type { BudgetEntryRow } from '@/db/types';
import { generateSyncId } from '@/utils/generateSyncId';

export type { Income, PaymentType, EntryType };

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

  /**
   * Every entry, regardless of the selected date.
   *
   * The store exposes only the entries of the day being viewed, but the
   * balance of an account is cumulative (LBDS-277), so the account
   * configuration needs the whole history.
   */
  getAllEntries(): Income[] {
    return this.getStore().rawEntries.map((row) => mapEntryRow(row)) as unknown as Income[];
  }

  async getEntriesBetween(params: { start: Date; end: Date }): Promise<Income[]> {
    const { start, end } = params
    const fromStr = start.toISOString().slice(0, 10)
    const toStr = end.toISOString().slice(0, 10)
    const rows: BudgetEntryRow[] = await budgetEntriesDb.getByDateRange({ from: fromStr, to: toStr })
    return rows.map(mapEntryRow)
  }

  getEntriesForDate(params: { date: string }): Income[] {
    const rows = dataMediator.refs.entries.value as BudgetEntryRow[];
    return rows.filter((r) => r.date === params.date).map(mapEntryRow);
  }

  async addEntry(params: { entry: Income }) {
    const { entry: input } = params;
    const entry = input.sync_id
      ? input
      : { ...input, sync_id: generateSyncId() };
    if (import.meta.env.DEV) { console.log('[CTRL] addEntry:', entry.name, 'sync_id:', entry.sync_id, 'entryType:', entry.entryType); }

    await budgetEntriesDb.add({ entry: toBudgetEntryRow(entry) });
    syncQueue.syncEntry({ entry: entry as any, operation: 'create' });

    if (import.meta.env.DEV) { console.log('[CTRL] addEntry done, sync_id:', entry.sync_id); }
    return { ...entry, id: entry.sync_id as string | number };
  }

  async addIngreso(params: {
    name?: string;
    amount?: number;
    paymentType?: PaymentType;
    accountId?: string | number | null;
    groups?: Array<{ amount: number; accountId: string | number | null }>;
    date?: string;
    _fromRecurringId?: string;
    category?: string;
    // LBDS-275: notes must be carried on the create path. Previously the
    // entry form collected the note but the controller's fixed param list
    // dropped it, so the row was written without notes.
    notes?: string;
    // LBDS-273: optional HH:MM time of day. Same reasoning as `notes`:
    // the controller's fixed param list used to drop it, so the row was
    // written without the time the user picked in the form.
    time?: string;
  }) {
    const { name = '', amount = 0, paymentType = 'cash' as PaymentType, accountId = null, groups = [], date, _fromRecurringId, category, notes, time } = params;
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
      category,
      notes,
      time,
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
    category?: string;
    // LBDS-275: notes must be carried on the create path. Previously the
    // entry form collected the note but the controller's fixed param list
    // dropped it, so the row was written without notes.
    notes?: string;
    // LBDS-273: optional HH:MM time of day. Same reasoning as `notes`:
    // the controller's fixed param list used to drop it, so the row was
    // written without the time the user picked in the form.
    time?: string;
  }) {
    const { name = '', amount = 0, paymentType = 'cash' as PaymentType, accountId = null, groups = [], date, _fromRecurringId, category, notes, time } = params;
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
      category,
      notes,
      time,
    };

    return this.addEntry({ entry });
  }

  async updateEntry(params: { id: string | number; changes: Partial<Income> }) {
    const { id, changes } = params;
    const idStr = String(id);
    let entry = this.getStore().entries.find((e) => String(e.id) === idStr);
    if (!entry) {
      if (import.meta.env.DEV) { console.log('[CTRL] updateEntry — not in store, Dexie fallback. id:', id); }
      const row = await budgetEntriesDb.getBySyncId({ syncId: String(id) });
      if (!row) {
        if (import.meta.env.DEV) { console.log('[CTRL] updateEntry — not in Dexie either, bail. id:', id); }
        return;
      }
      entry = mapEntryRow(row) as unknown as Income;
    }
    const updated = { ...entry, ...changes, updatedAt: Date.now() };
    if (import.meta.env.DEV) { console.log('[CTRL] updateEntry:', id, 'name:', updated.name); }
    await budgetEntriesDb.put({ entry: toBudgetEntryRow(updated) });
    if (import.meta.env.DEV) { console.log('[CTRL] updateEntry — calling syncQueue.syncEntry'); }
    syncQueue.syncEntry({ entry: updated, operation: 'update' });
  }

  async updateIngreso(params: { id: string | number; changes: Partial<Income> }) {
    const { id, changes } = params;
    const idStr = String(id);
    let entry = this.getStore().entries.find((e) => String(e.id) === idStr);
    if (!entry) {
      if (import.meta.env.DEV) { console.log('[CTRL] updateIngreso — not in store, Dexie fallback. id:', id); }
      const row = await budgetEntriesDb.getBySyncId({ syncId: String(id) });
      if (!row) {
        if (import.meta.env.DEV) { console.log('[CTRL] updateIngreso — not in Dexie either, bail. id:', id); }
        return;
      }
      entry = mapEntryRow(row) as unknown as Income;
    }
    const updated = { ...entry, ...changes, updatedAt: Date.now() };
    if (import.meta.env.DEV) { console.log('[CTRL] updateIngreso:', id, 'name:', updated.name); }
    await budgetEntriesDb.put({ entry: toBudgetEntryRow(updated) });
    if (import.meta.env.DEV) { console.log('[CTRL] updateIngreso — calling syncQueue.syncEntry'); }
    syncQueue.syncEntry({ entry: updated, operation: 'update' });
  }

  async removeEntry(params: { id: string | number }) {
    const { id } = params;
    const idStr = String(id);

    // Prefer the date-filtered store (cheap, has all fields populated).
    let entry = this.getStore().entries.find((e) => String(e.id) === idStr);

    // Fallback: the entry may have been loaded directly from Dexie (deep link
    // to /budget/entry/edit?entryId=..., opened from Historial, etc.) without
    // going through BudgetView, so it is not in the date-filtered store. Look
    // it up in Dexie so the delete still goes through instead of being silently
    // skipped. Fixes LBDS-279 regression where confirmDelete() appeared to do
    // nothing when reached from outside the BudgetView flow.
    let syncId: string;
    if (entry) {
      syncId = entry.sync_id as string;
    } else {
      const row = await budgetEntriesDb.getBySyncId({ syncId: idStr });
      if (!row) return;
      syncId = row.sync_id;
      // Normalise the row through mapEntryRow so the entry shape matches what
      // the rest of the app sees (id === sync_id, same field names), and so
      // the sync payload produced by toApiFormat('budget_entry', entry) carries
      // exactly the data we deleted locally.
      entry = mapEntryRow(row) as unknown as Income;
    }

    await budgetEntriesDb.delete({ syncId });
    syncQueue.syncEntry({ entry, operation: 'delete' });
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
