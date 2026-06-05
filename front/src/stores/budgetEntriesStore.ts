import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

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
  _providerName?: string;
  _supplierId?: string | number;
  _fromProviderGroupId?: string | number;
  _fromRecurringId?: string;
}

export const useBudgetEntriesStore = defineStore('budgetEntries', () => {
  const entries = ref<Income[]>([]);

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

  function loadEntries(items: Income[]) {
    entries.value.splice(0, entries.value.length, ...items);
  }

  function addEntry(entry: Income) {
    entries.value.push(entry);
  }

  function updateEntry(id: string | number, changes: Partial<Income>) {
    const idx = entries.value.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const updated = { ...entries.value[idx], ...changes };
    entries.value.splice(idx, 1, updated);
  }

  function removeEntry(id: string | number) {
    const idx = entries.value.findIndex((e) => e.id === id);
    if (idx >= 0) entries.value.splice(idx, 1);
  }

  function removeEgresosGroup(supplierId: string | number) {
    const targetId = String(supplierId);
    for (let i = entries.value.length - 1; i >= 0; i--) {
      if (String(entries.value[i].supplierId) === targetId) {
        entries.value.splice(i, 1);
      }
    }
  }

  function clearEntries() {
    entries.value.splice(0, entries.value.length);
  }

  return {
    entries,
    ingresos, egresos,
    totalIngresos, totalEgresos, netTotal,
    ingresosEfectivo, ingresosTarjeta, egresosEfectivo, egresosTarjeta,
    financialSummary,
    loadEntries, addEntry, updateEntry, removeEntry, removeEgresosGroup, clearEntries,
  };
});
