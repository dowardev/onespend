// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineStore } from 'pinia';
import { computed } from 'vue';
import type { BudgetEntryRow } from '@/db/types';
import { dataMediator } from '@/services/dataMediator';
import { useBudgetDayStore } from './budgetDayStore';

export type PaymentType = 'cash' | 'digital';
export type EntryType = 'ingreso' | 'egreso';

export interface Income {
  id: string | number;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  amount: number;
  date: string;
  paymentType: PaymentType;
  entryType: EntryType;
  accountId?: string | number | null;
  groups?: Array<{ amount: number; accountId: string | number | null }>;
  createdAt: number;
  synced_at?: number;
  supplierId?: string;
  supplierName?: string;
  category?: string;
  // LBDS-275: notes must travel with the Income shape so the entry form
  // (EntryEditPage.loadEntry) can hydrate the notes field from the row.
  notes?: string;
  // LBDS-273 (GitLab #13): optional HH:MM mirror of recurring `time` so
  // the entry form can hydrate the time field from the row via
  // useEntryLoader.loadEntryFromDb.
  time?: string;
  _providerName?: string;
  _supplierId?: string | number;
  _fromProviderGroupId?: string | number;
  _fromRecurringId?: string;
}

export function mapEntryRow(row: BudgetEntryRow): Income {
  return {
    id: row.sync_id,
    sync_id: row.sync_id,
    serverId: row.serverId ?? null,
    name: row.name ?? '',
    amount: row.amount ?? 0,
    date: row.date ?? '',
    paymentType: (row.paymentType as PaymentType) || 'cash',
    entryType: (row.entryType as EntryType) || 'egreso',
    accountId: row.accountId ?? null,
    groups: row.groups?.map((g) => ({ amount: g.amount, accountId: g.accountId ?? null })),
    supplierId: row.supplierId as string,
    supplierName: row.supplierName,
    category: row.category != null ? String(row.category) : undefined,
    // LBDS-275: copy notes from the row so useEntryLoader.loadEntryFromDb
    // returns the notes the user typed. Without this, the entry form's
    // `entryAny.notes` was always undefined and re-saves wiped the note.
    notes: row.notes != null ? String(row.notes) : undefined,
    // LBDS-273 (GitLab #13): copy time from the row so the entry form's
    // `entryAny.time` is hydrated on edit. Without this, re-editing an
    // existing entry loses the time on first save.
    time: row.time != null ? String(row.time) : undefined,
    _providerName: row.providerName ?? row.supplierName ?? undefined,
    _fromRecurringId: row.fromRecurringId ?? undefined,
    createdAt: row.createdAt || Date.now(),
    synced_at: row.syncedAt,
  }
}

export const useBudgetEntriesStore = defineStore('budgetEntries', () => {
  const rawEntries = dataMediator.refs.entries;

  const entries = computed<Income[]>(() => {
    const dayStore = useBudgetDayStore();
    const currentDate = dayStore.selectedDate;
    return rawEntries.value
      .filter(row => row.date === currentDate)
      .map(mapEntryRow)
  });

  async function reload() {
    await dataMediator.reload('entries')
  }

  const financialSummary = computed(() => {
    let ingresos = 0, egresos = 0, ingresosEfectivo = 0, ingresosTarjeta = 0, egresosEfectivo = 0, egresosTarjeta = 0;
    let netTotal = 0;

    for (const entry of entries.value) {
      const amount = Number(entry.amount || 0);
      netTotal += entry.entryType === 'egreso' ? -amount : amount;

      if (entry.entryType === 'ingreso') {
        ingresos += amount;
        if (entry.paymentType === 'cash') {
          ingresosEfectivo += amount;
        } else if (entry.paymentType === 'digital') {
          ingresosTarjeta += amount;
        }
      } else {
        egresos += amount;
        if (entry.paymentType === 'cash') {
          egresosEfectivo += amount;
        } else if (entry.paymentType === 'digital') {
          egresosTarjeta += amount;
        }
      }
    }

    return { ingresos, egresos, netTotal, ingresosEfectivo, ingresosTarjeta, egresosEfectivo, egresosTarjeta };
  });

  const ingresos = computed(() => entries.value.filter((e) => e.entryType === 'ingreso'));
  const egresos = computed(() => entries.value.filter((e) => e.entryType === 'egreso'));
  const totalIngresos = computed(() => financialSummary.value.ingresos);
  const totalEgresos = computed(() => financialSummary.value.egresos);
  const netTotal = computed(() => financialSummary.value.netTotal);
  const ingresosEfectivo = computed(() => financialSummary.value.ingresosEfectivo);
  const ingresosTarjeta = computed(() => financialSummary.value.ingresosTarjeta);
  const egresosEfectivo = computed(() => financialSummary.value.egresosEfectivo);
  const egresosTarjeta = computed(() => financialSummary.value.egresosTarjeta);

  function removeEgresosGroup(supplierId: string | number) {
    const targetId = String(supplierId);
    for (let i = rawEntries.value.length - 1; i >= 0; i--) {
      if (String((rawEntries.value[i] as any).supplierId) === targetId) {
        rawEntries.value.splice(i, 1);
      }
    }
  }

  function clearEntries() {
    rawEntries.value.splice(0, rawEntries.value.length);
  }

  return {
    rawEntries,
    entries,
    ingresos, egresos,
    totalIngresos, totalEgresos, netTotal,
    ingresosEfectivo, ingresosTarjeta, egresosEfectivo, egresosTarjeta,
    financialSummary,
    removeEgresosGroup, clearEntries,
    reload,
  };
});
