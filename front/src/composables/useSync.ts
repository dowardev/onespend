import { ref, onMounted, onUnmounted } from 'vue';
import { syncService, type SyncItemData, AuthExpiredError } from '@/services/syncService';
import { syncQueue } from '@/services/syncQueue';
import { useBudgetEntriesStore, type PaymentType, type EntryType } from '@/stores/budgetEntriesStore';
import { useBudgetProvidersStore } from '@/stores/budgetProvidersStore';
import { useSuppliersStore } from '@/stores/suppliersStore';
import { recurringRecordsController, type RecurringRecord, RECURRING_FIELD_MAP } from '@/controllers/recurringRecordsController';
import type { BudgetProviderProduct } from '@/stores/budgetProvidersStore';
import { suppliersDb } from '@/db/controllers/suppliersDb';
import { supplierProductsDb } from '@/db/controllers/supplierProductsDb';

function mapServerRecurringToLocal(params: { item: Record<string, unknown> }): RecurringRecord {
  const { item } = params;
  const mapped: Record<string, unknown> = {};

  const directFields = new Set([
    'sync_id', 'serverId', 'type', 'entryType', 'name', 'amount',
    'accountId', 'repeatFrequency', 'repeatInterval', 'repeatDays',
    'repeatMonthDay', 'repeatMonthWeekdayMode', 'repeatMonthWeekday',
    'repeatMonthWeekdayOrdinal', 'repeatYearMonth', 'repeatYearDay',
    'time', 'autoInsert', 'startDate', 'endDate', 'estimated',
    'products', 'items', 'notes', 'status', 'createdAt', 'synced_at', '_synced',
  ]);

  for (const [key, value] of Object.entries(item)) {
    if (key === '_deleted') continue;
    if (RECURRING_FIELD_MAP[key]) {
      mapped[RECURRING_FIELD_MAP[key]] = value;
    } else if (directFields.has(key)) {
      mapped[key] = value;
    }
  }

  if (item.id && !mapped.sync_id) {
    mapped.sync_id = String(item.id);
  }

  return mapped as unknown as RecurringRecord;
}

export interface SyncEntryParams {
  id?: string | number;
  sync_id?: string;
  name?: string | number | null;
  amount?: number | string | null;
  date?: string | null;
  paymentType?: string | null;
  entryType?: string | null;
  accountId?: number | string | null;
  groups?: Array<{ sync_id?: string; amount: number; accountId: string | number }>;
  supplierId?: string | null;
  supplierName?: string | null;
  [key: string]: unknown;
}

export interface SyncProviderParams {
  name?: string | null;
  date?: string | null;
  estimated?: number | string | null;
  accountId?: number | null;
  efectivo?: number | string | null;
  tarjeta?: number | string | null;
  credito?: number | string | null;
  notes?: string | null;
  visited?: boolean | null;
  _supplierId?: number | string | null;
  _supplierName?: string | null;
  [key: string]: unknown;
}

export interface SyncAccountParams {
  name?: string | null;
  initialBalance?: number | string | null;
  [key: string]: unknown;
}

export interface SyncSupplierProductParams {
  supplierId?: number | string | null;
  supplier_id?: number | string | null;
  name?: string | null;
  price?: number | string | null;
  imageBase64?: string | null;
  [key: string]: unknown;
}

export interface SyncBudgetParams {
  date?: string | null;
  isDayClosed?: boolean | null;
  finishDayData?: unknown;
  [key: string]: unknown;
}

export interface SyncBudgetProviderParams {
  date?: string | null;
  name?: string | null;
  estimated?: number | string | null;
  accountId?: number | null;
  efectivo?: number | string | null;
  tarjeta?: number | string | null;
  credito?: number | string | null;
  notes?: string | null;
  visited?: boolean | null;
  _supplierId?: number | string | null;
  _supplierName?: string | null;
  [key: string]: unknown;
}

export interface SyncBudgetProviderProductParams {
  sync_id?: string;
  id?: number | string;
  budgetProviderId?: number | null;
  supplierProductId?: number | null;
  productName?: string | null;
  productPrice?: number | null;
  quantity?: number | null;
}

export function useSync() {
  const isOnline = ref(syncService.getOnlineStatus());
  const isSyncing = ref(false);
  const pendingChanges = ref(0);
  const lastSyncTime = ref(0);
  const syncError = ref<string | null>(null);

  const budgetEntriesStore = useBudgetEntriesStore();
  const budgetProvidersStore = useBudgetProvidersStore();
  const suppliersStore = useSuppliersStore();
let cleanupOnlineListener: (() => void) | null = null;
let cleanupAuthExpired: (() => void) | null = null;
let cleanupAutoSync: (() => void) | null = null;

  async function syncEntry(params: { entry: SyncEntryParams; operation?: 'create' | 'update' | 'delete' }) {
    await syncQueue.syncEntry(params);
    pendingChanges.value = await syncService.getQueueCount();
  }

  async function syncProvider(params: { provider: SyncProviderParams; operation?: 'create' | 'update' | 'delete' }) {
    await syncQueue.syncProvider(params);
    pendingChanges.value = await syncService.getQueueCount();
  }

  async function syncAccount(params: { account: SyncAccountParams; operation?: 'create' | 'update' | 'delete' }) {
    await syncQueue.syncAccount(params);
    pendingChanges.value = await syncService.getQueueCount();
  }

  async function syncSupplierProduct(params: { product: SyncSupplierProductParams; operation?: 'create' | 'update' | 'delete' }) {
    await syncQueue.syncSupplierProduct(params);
    pendingChanges.value = await syncService.getQueueCount();
  }

  async function syncBudgetProvider(params: { provider: SyncBudgetProviderParams; operation?: 'create' | 'update' | 'delete'; products?: SyncBudgetProviderProductParams[]; supplierSyncId?: string }) {
    await syncQueue.syncBudgetProvider(params);
    pendingChanges.value = await syncService.getQueueCount();
  }

  async function syncBudgetProviderProduct(params: { product: SyncBudgetProviderProductParams; operation?: 'create' | 'update' | 'delete' }) {
    await syncQueue.syncBudgetProviderProduct(params);
    pendingChanges.value = await syncService.getQueueCount();
  }

  async function syncRecurringRecord(params: { record: RecurringRecord; operation?: 'create' | 'update' | 'delete' }) {
    await syncQueue.syncRecurringRecord(params);
    pendingChanges.value = await syncService.getQueueCount();
  }

  async function syncNow(): Promise<boolean> {
    if (!isOnline.value) {
      syncError.value = 'Cannot sync while offline';
      return false;
    }
    isSyncing.value = true;
    syncError.value = null;
    try {
      const queueLength = await syncService.getQueueCount();
      const result = await syncService.processQueue();
      if (result === null && queueLength > 0) {
        return false;
      }
      if (isOnline.value) {
        await syncService.pullChanges(async (changes) => {
          await applyServerChanges({ changes });
        });
      }
      lastSyncTime.value = syncService.getLastSyncTime();
      pendingChanges.value = await syncService.getQueueCount();
      return true;
    } catch (error) {
      if (error instanceof AuthExpiredError) {
        syncError.value = 'Session expired. Please log in again.';
        window.location.hash = '#/login';
        return false;
      }
      syncError.value = error instanceof Error ? error.message : 'Sync failed';
      return false;
    } finally {
      isSyncing.value = false;
    }
  }

  async function pullFromServer() {
    if (!isOnline.value) {
      syncError.value = 'Cannot pull while offline';
      return;
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      await syncService.pullChanges(async (changes) => {
        await applyServerChanges({ changes });
      });
      lastSyncTime.value = syncService.getLastSyncTime();
    } catch (error) {
      if (error instanceof AuthExpiredError) {
        syncError.value = 'Session expired. Please log in again.';
        window.location.hash = '#/login';
        return;
      }
      syncError.value = error instanceof Error ? error.message : 'Pull failed';
    } finally {
      isSyncing.value = false;
    }
  }

  interface ServerChangesResult {
    changes?: Record<string, SyncItemData[]>;
    serverTime?: number;
  }

  async function applyServerChanges(result: ServerChangesResult) {
    const { changes } = result;

    if (!changes) return;

    if (changes.budget_entry) {
      const entries = Array.isArray(changes.budget_entry) ? changes.budget_entry : [];
      const entryMap = new Map(budgetEntriesStore.entries.map(e => [e.sync_id, e]));
      for (const entry of entries) {
        if (entry._deleted) {
          const localId = entry.id;
          budgetEntriesStore.removeEntry(localId as string | number);
        } else {
        const mappedGroups = (
          entry.groups as
            | Array<{ sync_id?: string; id?: number; account_id?: number | null; amount: number }>
            | undefined
        )?.map((g) => ({
          sync_id: g.sync_id,
          amount: g.amount,
          accountId: g.account_id,
        }));

          const existing = entryMap.get(String(entry.id));
          const validPaymentTypes: PaymentType[] = ['cash', 'digital'];
          const validEntryTypes: EntryType[] = ['ingreso', 'egreso'];
          const paymentType: PaymentType = validPaymentTypes.includes(entry.payment_type as PaymentType) ? entry.payment_type as PaymentType : 'cash';
          const entryType: EntryType = validEntryTypes.includes(entry.entry_type as EntryType) ? entry.entry_type as EntryType : 'egreso';
          if (existing) {
            budgetEntriesStore.updateEntry(entry.id as string | number, {
              name: entry.name as string,
              amount: entry.amount as number,
              date: entry.date,
              paymentType,
              entryType,
              accountId: entry.account_id ? parseInt(entry.account_id as string, 10) : null,
              groups: mappedGroups,
              supplierId: entry.supplier_id as string,
              supplierName: entry.supplier_name as string,
            });
          } else {
            budgetEntriesStore.addEntry({
              id: entry.id as string | number,
              name: entry.name as string,
              amount: entry.amount as number,
              date: entry.date,
              paymentType,
              entryType,
              accountId: entry.account_id ? parseInt(entry.account_id as string, 10) : null,
              groups: mappedGroups,
              supplierId: entry.supplier_id as string,
              supplierName: entry.supplier_name as string,
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    if (changes.supplier) {
      const suppliers = Array.isArray(changes.supplier) ? changes.supplier : [];
      const supplierMap = new Map(suppliersStore.suppliers.map(s => [s.sync_id, s]));

      // Phase 1: Synchronous — all store mutations (batched by Vue)
      const toDeleteSyncIds: string[] = [];
      const toUpsert: Array<{ syncId: string; entry: any }> = [];

      for (const supplier of suppliers) {
        const s = supplier as any;
        const syncId = String(supplier.id);

        if (supplier._deleted) {
          const existing = supplierMap.get(syncId);
          if (existing) {
            const idx = suppliersStore.suppliers.indexOf(existing);
            if (idx >= 0) suppliersStore.suppliers.splice(idx, 1);
          }
          toDeleteSyncIds.push(syncId);
        } else {
          const existing = supplierMap.get(syncId);
          const entry = {
            sync_id: syncId,
            name: s.name,
            serverId: s.id_server ?? s.id,
            synced_at: Date.now(),
            products: (s.products || []).map((p: any) => ({
              sync_id: p.sync_id || p.id,
              name: p.name,
              price: p.price,
              imageBase64: p.image_base64 || p.imageBase64,
              imageUrl: p.image_url || p.imageUrl,
              serverId: p.id,
              synced_at: Date.now(),
            })),
          };

          if (existing) {
            Object.assign(existing, entry);
          } else {
            suppliersStore.suppliers.push(entry);
          }
          toUpsert.push({ syncId, entry });
        }
      }

      // Phase 2: Async — IndexedDB operations in bulk
      for (const syncId of toDeleteSyncIds) {
        await suppliersDb.delete({ syncId }).catch(() => {});
        await supplierProductsDb.deleteBySupplierId({ supplierSyncId: syncId }).catch(() => {});
      }

      for (const { syncId, entry } of toUpsert) {
        const dbEntry = await suppliersDb.getBySyncId({ syncId });
        if (dbEntry) {
          await suppliersDb.put({ entry: { ...dbEntry, ...entry } });
        } else {
          await suppliersDb.put({ entry: { ...entry, sync_id: syncId } });
        }
      }
    }

  if (changes.budget_provider) {
      const providers = Array.isArray(changes.budget_provider) ? changes.budget_provider : [];
      const providerMap = new Map(budgetProvidersStore.providers.map(p => [p.sync_id, p]));
      for (const provider of providers) {
        if (provider._deleted) {
          const localId = provider.id;
          budgetProvidersStore.removeProvider(localId as string | number);
        } else {
          const existing = providerMap.get(String(provider.id));
          if (existing) {
            budgetProvidersStore.updateProvider(provider.id as string | number, {
              name: provider.name as string,
              date: provider.date,
              estimated: provider.estimated as number,
              accountId: provider.account_id ? parseInt(provider.account_id as string, 10) : null,
              efectivo: provider.efectivo as number,
              tarjeta: provider.tarjeta as number,
              credito: provider.credito as number,
              notes: provider.notes as string,
              visited: provider.visited as boolean,
            });
          } else {
            budgetProvidersStore.addProvider({
              id: provider.id as string | number,
              name: provider.name as string,
              date: provider.date,
              estimated: provider.estimated as number,
              accountId: provider.account_id ? parseInt(provider.account_id as string, 10) : null,
              efectivo: provider.efectivo as number,
              tarjeta: provider.tarjeta as number,
              credito: provider.credito as number,
              notes: provider.notes as string,
              visited: provider.visited as boolean,
            });
          }
        }
      }
    }

  if (changes.recurring_record) {
    const records = Array.isArray(changes.recurring_record) ? changes.recurring_record : [];
    for (const item of records) {
      if (item._deleted) {
        const localId = item.id;
        await recurringRecordsController.removeRecord({ id: localId as string | number });
      } else {
        const localRecord = mapServerRecurringToLocal({ item: item as Record<string, unknown> });
        const syncId = localRecord.sync_id || String(item.id);
        const existing = await recurringRecordsController.getRecordBySyncId({ syncId });
        if (existing) {
          const { id: _id, ...safeChanges } = localRecord;
          await recurringRecordsController.updateRecord({ id: existing.id, changes: safeChanges });
        } else {
          await recurringRecordsController.addRecord({ record: localRecord });
        }
      }
    }
  }

    if (changes.budget_provider_product) {
      const products = Array.isArray(changes.budget_provider_product)
        ? changes.budget_provider_product
        : [];
      const productsByProvider: Record<string, BudgetProviderProduct[]> = {};

      for (const product of products) {
        if (!product._deleted) {
          const providerId = product.budget_provider_id;
          if (!productsByProvider[providerId]) {
            productsByProvider[providerId] = [];
          }
          productsByProvider[providerId].push({
            id: product.id as string | number,
            sync_id: product.sync_id as string,
            supplierProductId: product.supplier_product_id,
            productName: product.product_name,
            productPrice: product.product_price as number,
            quantity: product.quantity,
          });
        }
      }

      const providerMap = new Map(budgetProvidersStore.providers.map(p => [p.sync_id, p]));
      for (const [providerId, prods] of Object.entries(productsByProvider)) {
        const provider = providerMap.get(String(providerId));
        if (provider) {
          budgetProvidersStore.updateProvider(Number(providerId), { products: prods });
        }
      }
    }
  }

  function startAutoSync(baseIntervalMs: number = 30000) {
    let currentInterval = baseIntervalMs;
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;
    let isCleanedUp = false;

    async function tick() {
      if (isCleanedUp) return;

      if (!isOnline.value || isSyncing.value) {
        currentInterval = baseIntervalMs;
        syncTimeout = setTimeout(tick, currentInterval);
        return;
      }

      if (pendingChanges.value > 0) {
        const success = await syncNow();
        currentInterval = success ? baseIntervalMs : Math.min(Math.round(currentInterval * 2), 300000);
      } else {
        currentInterval = baseIntervalMs;
      }

      if (!isCleanedUp) {
        syncTimeout = setTimeout(tick, currentInterval);
      }
    }

    syncTimeout = setTimeout(tick, baseIntervalMs);

    return () => {
      isCleanedUp = true;
      if (syncTimeout !== null) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
      }
    };
  }

  onMounted(async () => {
    cleanupOnlineListener = syncService.onOnlineChange((online) => {
      isOnline.value = online;
      if (online) {
        syncNow();
      }
    });

    cleanupAuthExpired = syncService.onAuthExpired(() => {
      isSyncing.value = false;
      syncError.value = 'Session expired. Please log in again.';
      window.location.hash = '#/login';
    });

  pendingChanges.value = await syncService.getQueueCount();
  lastSyncTime.value = syncService.getLastSyncTime();
  cleanupAutoSync = startAutoSync();
});

onUnmounted(() => {
  if (cleanupAutoSync) {
    cleanupAutoSync();
  }
  if (cleanupOnlineListener) {
    cleanupOnlineListener();
  }
  if (cleanupAuthExpired) {
    cleanupAuthExpired();
  }
});

  async function syncAfterLogin() {
    if (!isOnline.value) return;
    try {
      isSyncing.value = true;
      await syncService.pullChanges(async (changes) => {
        await applyServerChanges({ changes });
      });
      await syncService.processQueue();
      lastSyncTime.value = syncService.getLastSyncTime();
      pendingChanges.value = await syncService.getQueueCount();
    } catch (error) {
      if (error instanceof AuthExpiredError) {
        syncError.value = 'Session expired.';
        window.location.hash = '#/login';
        return;
      }
      syncError.value = error instanceof Error ? error.message : 'Sync after login failed';
    } finally {
      isSyncing.value = false;
    }
  }

  async function getConflicts(): Promise<Record<string, import('@/services/syncService').SyncConflictItem[]>> {
    return syncService.getConflicts();
  }

  function getConflictStore() {
    return syncService.getConflictStore();
  }

  return {
    isOnline,
    isSyncing,
    pendingChanges,
    lastSyncTime,
    syncError,
    syncEntry,
    syncProvider,
    syncAccount,

    syncBudgetProvider,
    syncBudgetProviderProduct,
    syncRecurringRecord,
    syncSupplierProduct,
    syncNow,
    syncAfterLogin,
    getConflicts,
    getConflictStore,
    pullFromServer,
    startAutoSync,
  };
}
