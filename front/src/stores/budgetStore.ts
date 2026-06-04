import { defineStore } from 'pinia';
import { ref, computed, reactive, watch } from 'vue';
import { formatLocalDate } from '@/utils/date';
import type { Supplier } from '@/controllers/suppliersController';

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

export interface BudgetProviderProduct {
  id?: string | number;
  sync_id?: string;
  serverId?: number | null;
  supplierProductId?: string | number | null;
  productName: string;
  productPrice: number;
  quantity: number;
}

export interface Provider {
  id: string | number;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  date: string;
  estimated: number;
  accountId: number | null;
  efectivo: number;
  tarjeta: number;
  credito: number;
  products?: BudgetProviderProduct[];
  items?: Array<{ amount: number; accountId: string | number | null }>;
  notes: string;
  visited: boolean;
  synced_at?: number;
  createdAt?: number;
  _justAdded?: boolean;
  _pendingProducts?: BudgetProviderProduct[];
  _supplierKey?: string;
  _supplierId?: string | number;
  _supplierName?: string;
  _supplierProducts?: BudgetProviderProduct[];
  _supplier?: Supplier;
  _fromRecurringId?: string;
}

interface FinishDayData {
  totalSalesEfectivo: number;
  totalSalesTarjeta: number;
  totalSalesCredito: number;
  type: '%' | 'fixed';
  margin: number;
}

interface SyncSupplier {
  id: string | number;
  sync_id?: string | number;
  name: string;
  products?: Array<{
    id?: string | number;
    sync_id?: string | number;
    name: string;
    price: number;
  }>;
}

export const useBudgetStore = defineStore('budget', () => {
  const selectedDate = ref(formatLocalDate({ d: new Date() }));

  const entries = reactive<Income[]>([]);
  const providers = reactive<Provider[]>([]);
  const isDayClosed = ref(false);
  const finishDayData = reactive<FinishDayData>({
    totalSalesEfectivo: 0,
    totalSalesTarjeta: 0,
    totalSalesCredito: 0,
    type: '%',
    margin: 0,
  });

  const isLoading = ref(false);
  const frozenSnapshot = ref<{
    entries: Income[];
    providers: Provider[];
    finishDayData: FinishDayData;
    timestamp: number;
  } | null>(null);

  // Optimized single-pass financial calculations
  const financialSummary = computed(() => {
    let ingresos = 0,
      egresos = 0,
      ingresosEfectivo = 0,
      ingresosTarjeta = 0,
      egresosEfectivo = 0,
      egresosTarjeta = 0;
    let netTotal = 0;

    for (const entry of entries) {
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

    return {
      ingresos,
      egresos,
      netTotal,
      ingresosEfectivo,
      ingresosTarjeta,
      egresosEfectivo,
      egresosTarjeta,
    };
  });

  const ingresos = computed(() => entries.filter((e) => e.entryType === 'ingreso'));

  const egresos = computed(() => entries.filter((e) => e.entryType === 'egreso'));

  const totalIngresos = computed(() => financialSummary.value.ingresos);

  const totalEgresos = computed(() => financialSummary.value.egresos);

  const netTotal = computed(() => financialSummary.value.netTotal);

  const totalEfectivo = computed(() => providers.reduce((s, p) => s + Number(p.efectivo || 0), 0));

  const totalTarjeta = computed(() => providers.reduce((s, p) => s + Number(p.tarjeta || 0), 0));

  const totalCredito = computed(() => providers.reduce((s, p) => s + Number(p.credito || 0), 0));

  const totalEstimacion = computed(() =>
    providers.reduce((s, p) => s + Number(p.efectivo || 0) + Number(p.tarjeta || 0), 0),
  );

  const faltante = computed(() => netTotal.value - totalEstimacion.value);

  const ingresosEfectivo = computed(() => financialSummary.value.ingresosEfectivo);

  const ingresosTarjeta = computed(() => financialSummary.value.ingresosTarjeta);

  const egresosEfectivo = computed(() => financialSummary.value.egresosEfectivo);

  const egresosTarjeta = computed(() => financialSummary.value.egresosTarjeta);

  const providerIdsWithEntries = computed(() => {
    const ids = new Set<string | number>();
    // Obtener todos los supplierIds de las entries
    const entrySupplierIds = new Set<string | number>();
    for (const entry of entries) {
      if (entry.supplierId) {
        entrySupplierIds.add(entry.supplierId);
      }
    }
    // Buscar providers que tengan ese _supplierId
    for (const provider of providers) {
      if (provider._supplierId && entrySupplierIds.has(provider._supplierId)) {
        ids.add(provider.id);
      }
    }
    return ids;
  });

  function setSelectedDate(date: string) {
    selectedDate.value = date;
  }

  function setIsLoading(value: boolean) {
    isLoading.value = value;
  }

  function setIsDayClosed(value: boolean) {
    isDayClosed.value = value;
  }

  function setFrozenSnapshot(snapshot: typeof frozenSnapshot.value) {
    frozenSnapshot.value = snapshot;
  }

  function setEntries(data: Income[]) {
    const dataArray = Array.isArray(data) ? data : [];
    entries.splice(0, entries.length, ...dataArray);
  }

  function setProviders(data: Provider[]) {
    const dataArray = Array.isArray(data) ? data : [];
    providers.splice(0, providers.length, ...dataArray);
  }

  function setFinishDayData(data: FinishDayData) {
    finishDayData.totalSalesEfectivo = data.totalSalesEfectivo;
    finishDayData.totalSalesTarjeta = data.totalSalesTarjeta;
    finishDayData.totalSalesCredito = data.totalSalesCredito;
    finishDayData.type = data.type;
    finishDayData.margin = data.margin;
  }

  function addEntry(entry: Income) {
    entries.push(entry);
  }

  function addProvider(provider: Provider) {
    providers.push(provider);
  }

  function updateEntry(id: string | number, changes: Partial<Income>) {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const updated = { ...entries[idx], ...changes };
    entries.splice(idx, 1, updated);
  }

  function removeEntry(id: string | number) {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx >= 0) entries.splice(idx, 1);
  }

  function removeEgresosGroup(supplierId: string | number) {
    const targetId = String(supplierId);
    for (let i = entries.length - 1; i >= 0; i--) {
      const it = entries[i];
      if (String(it.supplierId) === targetId) {
        entries.splice(i, 1);
      }
    }
  }

  function updateProvider(id: string | number, changes: Partial<Provider>) {
    const idx = providers.findIndex((p) => p.id === id);
    if (idx === -1) return;

    const provider = providers[idx];
    const updatedProvider = { ...provider };

    const numericFields = ['estimated', 'accountId', 'efectivo', 'tarjeta', 'credito'];
    for (const field of numericFields) {
      if (changes[field as keyof Provider] !== undefined) {
        (updatedProvider as Provider)[field] = Number(changes[field as keyof Provider]) || 0;
      }
    }

    if (changes.name !== undefined) updatedProvider.name = String(changes.name);
    if (changes.date !== undefined) updatedProvider.date = String(changes.date);
    if (changes.notes !== undefined) updatedProvider.notes = String(changes.notes);
    if (changes.visited !== undefined) updatedProvider.visited = !!changes.visited;
    if (changes._justAdded !== undefined) updatedProvider._justAdded = changes._justAdded;
    if (changes._supplierId !== undefined) updatedProvider._supplierId = changes._supplierId;
    if (changes._supplierName !== undefined) updatedProvider._supplierName = changes._supplierName;
    if (changes.products !== undefined) updatedProvider.products = changes.products;
    if (changes.items !== undefined) updatedProvider.items = changes.items;

    providers.splice(idx, 1, updatedProvider);
  }

  function removeProvider(id: string | number) {
    const idx = providers.findIndex((p) => p.id === id);
    if (idx >= 0) providers.splice(idx, 1);
  }

  function clearDay() {
    entries.splice(0, entries.length);
    providers.splice(0, providers.length);
    isDayClosed.value = false;
  }

  function clearAll() {
    entries.splice(0, entries.length);
    providers.splice(0, providers.length);
    isDayClosed.value = false;
    finishDayData.totalSalesEfectivo = 0;
    finishDayData.totalSalesTarjeta = 0;
    finishDayData.totalSalesCredito = 0;
    finishDayData.type = '%';
    finishDayData.margin = 0;
  }

  function syncProvidersWithSuppliers(suppliers: SyncSupplier[]) {
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      if (provider._supplierId) {
        const supplierSyncId = provider._supplierId;
        const matchingSupplier = suppliers.find(
          (s) =>
            String(s.sync_id) === String(supplierSyncId) || String(s.id) === String(supplierSyncId),
        );

        if (matchingSupplier) {
          let needsUpdate = false;
          const updates: Partial<Provider> = {};

          if (provider._supplierName !== matchingSupplier.name) {
            updates._supplierName = matchingSupplier.name;
            needsUpdate = true;
          }

          if (matchingSupplier.products && matchingSupplier.products.length > 0) {
            const serverProducts = matchingSupplier.products;
            const localProducts = provider._supplierProducts || [];

            const syncedProducts = serverProducts.map((serverProduct) => {
              const localMatch = localProducts.find(
                (lp) => lp.name === serverProduct.name && lp.price === serverProduct.price,
              );
              return {
                ...serverProduct,
                sync_id: serverProduct.sync_id || serverProduct.id,
              };
            });

            provider._supplierProducts = syncedProducts;
          }

          if (needsUpdate) {
            const updatedProvider = { ...provider, ...updates };
            providers.splice(i, 1, updatedProvider);
          }
        }
      }
    }
  }

  return {
    selectedDate,
    entries,
    providers,
    isDayClosed,
    finishDayData,
    isLoading,
    ingresos,
    egresos,
    totalIngresos,
    totalEgresos,
    netTotal,
    totalEfectivo,
    totalTarjeta,
    totalCredito,
    totalEstimacion,
    faltante,
    ingresosEfectivo,
    ingresosTarjeta,
    egresosEfectivo,
    egresosTarjeta,
    providerIdsWithEntries,
    frozenSnapshot,
    setSelectedDate,
    setIsLoading,
    setIsDayClosed,
    setFrozenSnapshot,
    setEntries,
    setProviders,
    setFinishDayData,
    addEntry,
    addProvider,
    updateEntry,
    removeEntry,
    removeEgresosGroup,
    updateProvider,
    removeProvider,
    clearDay,
    clearAll,
    syncProvidersWithSuppliers,
  };
});
