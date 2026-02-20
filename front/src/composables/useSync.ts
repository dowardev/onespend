import { ref, onMounted, onUnmounted, toRaw } from 'vue';
import { syncService, type SyncItem, type SyncItemData } from '@/services/syncService';
import { useBudgetStore } from '@/stores/budgetStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { useSuppliersStore } from '@/stores/suppliersStore';
import { useTemplatesStore } from '@/stores/templatesStore';

export interface SyncEntryParams {
  name?: string | number | null;
  amount?: number | string | null;
  date?: string | null;
  paymentType?: string | null;
  entryType?: string | null;
  accountId?: number | null;
  groups?: string[];
  _fromProviderGroupId?: number | string | null;
  _providerName?: string | null;
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

export interface SyncTemplateParams {
  name?: string | null;
  description?: string | null;
  suppliers?: string[];
  suppliersSnapshot?: string[];
  [key: string]: unknown;
}

export interface SyncSupplierProductParams {
  supplierId?: number | string | null;
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

  const budgetStore = useBudgetStore();
  const accountsStore = useAccountsStore();
  const suppliersStore = useSuppliersStore();
  const templatesStore = useTemplatesStore();

  let cleanupOnlineListener: (() => void) | null = null;

  function generateSyncId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function syncEntry(params: { entry: SyncEntryParams; operation?: 'create' | 'update' | 'delete' }) {
    const { entry, operation = 'create' } = params;
    let syncId = entry.sync_id;
    
    if (!syncId) {
      syncId = entry.sync_id = String(entry.id || generateSyncId());
    }
    
    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'entry',
      operation,
      data: {
        name: entry.name as string,
        amount: entry.amount,
        date: entry.date,
        payment_type: entry.paymentType as string,
        entry_type: entry.entryType as string,
        account_id: entry.accountId as string,
        groups: entry.groups as string[],
        _from_provider_group_id: entry._fromProviderGroupId as string,
        _provider_name: entry._providerName as string,
        updated_at: Date.now(),
      },
    };

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();
  }

  function syncProvider(
    paramsOrProvider: { provider?: SyncProviderParams; operation?: 'create' | 'update' | 'delete' } | SyncProviderParams,
    maybeOperation?: 'create' | 'update' | 'delete'
  ) {
    // Support two calling styles:
    // 1) syncProvider({ provider: {...}, operation: 'create' })
    // 2) syncProvider(providerObject, 'create')
    let provider: SyncProviderParams | undefined;
    let operation: 'create' | 'update' | 'delete' = 'create';

    if (!paramsOrProvider) {
      console.error('[useSync] syncProvider called with no arguments');
      return;
    }

    if ((paramsOrProvider as any).provider !== undefined) {
      provider = (paramsOrProvider as any).provider as SyncProviderParams;
      operation = (paramsOrProvider as any).operation || maybeOperation || 'create';
    } else {
      provider = paramsOrProvider as SyncProviderParams;
      operation = maybeOperation || (provider as any).operation || 'create';
    }

    if (!provider) {
      console.error('[useSync] syncProvider: provider is undefined or null', { paramsOrProvider, maybeOperation });
      return;
    }

    // If provider is a reactive proxy, get the raw object to avoid trapped getters
    const prov = toRaw(provider) as SyncProviderParams;

    console.log('%c[useSync] 🔵 syncProvider LLAMADO', 'color: blue; font-weight: bold', {
      name: prov?.name as string,
      operation,
      sync_id: prov?.sync_id,
      id: (prov as any).id,
    });

    let syncId = prov.sync_id as string | undefined;

    if (!syncId) {
      syncId = prov.sync_id = String((prov as any).id || generateSyncId());
      console.log('[useSync] syncId generado:', syncId);
    }

    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'supplier',
      operation,
      data: {
        name: prov?.name as string || null,
        products: (prov as any)?.products || null,
        updated_at: Date.now(),
      },
    };

    console.log('[useSync] syncItem creado:', syncItem);
    console.log('[useSync] Llamando syncService.queueOperation...');

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();

    console.log('[useSync] ✅ queueOperation completado, pendingChanges:', pendingChanges.value);
  }

  function syncAccount(
    paramsOrAccount: { account?: SyncAccountParams; operation?: 'create' | 'update' | 'delete' } | SyncAccountParams,
    maybeOperation?: 'create' | 'update' | 'delete'
  ) {
    // Support two calling styles for robustness:
    // 1) syncAccount({ account: {...}, operation: 'create' })
    // 2) syncAccount(accountObject, 'create')
    let account: SyncAccountParams | undefined;
    let operation: 'create' | 'update' | 'delete' = 'create';

    if (!paramsOrAccount) {
      console.error('[useSync] syncAccount called with no arguments');
      return;
    }

    if ((paramsOrAccount as any).account !== undefined) {
      account = (paramsOrAccount as any).account as SyncAccountParams;
      operation = (paramsOrAccount as any).operation || maybeOperation || 'create';
    } else {
      account = paramsOrAccount as SyncAccountParams;
      operation = maybeOperation || (account as any).operation || 'create';
    }

    if (!account) {
      console.error('[useSync] syncAccount: account is undefined or null', { paramsOrAccount, maybeOperation });
      return;
    }

    // If account is a reactive proxy, get the raw object to avoid trapped getters.
    // toRaw may return undefined for non-object inputs, so fall back to the original
    // value. Be defensive: ensure we always have an object before accessing properties
    // like `sync_id` to avoid runtime TypeErrors when callers pass `undefined`.
    const accRaw = toRaw(account) as SyncAccountParams | undefined;
    const acc = (accRaw ?? (account as SyncAccountParams)) as SyncAccountParams | undefined;

    if (!acc) {
      console.error('[useSync] syncAccount: resolved account is not an object', { paramsOrAccount, maybeOperation });
      return;
    }

    let syncId = (acc.sync_id as string | undefined) ?? undefined;

    if (!syncId) {
      // Ensure we can write a stable sync_id back onto the object when missing.
      // Only do this for actual objects.
      try {
        syncId = acc.sync_id = String((acc as any).id || generateSyncId());
      } catch (e) {
        // In the unlikely event acc is non-writable, fall back to a generated id
        syncId = String((acc as any)?.id || generateSyncId());
      }
    }

    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'account',
      operation,
      data: {
        name: acc.name || null,
        initial_balance: acc.initialBalance ?? null,
        updated_at: Date.now(),
      },
    };

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();
  }

  function syncTemplate(params: { template: SyncTemplateParams; operation?: 'create' | 'update' | 'delete' }) {
    const { template, operation = 'create' } = params;
    let syncId = template.sync_id;
    
    if (!syncId) {
      syncId = template.sync_id = String(template.id || generateSyncId());
    }
    
    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'template',
      operation,
      data: {
        name: template.name,
        description: template.description,
        suppliers: template.suppliers,
        suppliers_snapshot: template.suppliersSnapshot,
        updated_at: Date.now(),
      },
    };

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();
  }

  function syncSupplierProduct(
    paramsOrProduct: { product?: SyncSupplierProductParams; operation?: 'create' | 'update' | 'delete' } | SyncSupplierProductParams,
    maybeOperation?: 'create' | 'update' | 'delete'
  ) {
    // Support two calling styles for robustness:
    // 1) syncSupplierProduct({ product: {...}, operation: 'create' })
    // 2) syncSupplierProduct(productObject, 'create')
    let product: SyncSupplierProductParams | undefined;
    let operation: 'create' | 'update' | 'delete' = 'create';

    if (!paramsOrProduct) {
      console.error('[useSync] syncSupplierProduct called with no arguments');
      return;
    }

    if ((paramsOrProduct as any).product !== undefined) {
      product = (paramsOrProduct as any).product as SyncSupplierProductParams;
      operation = (paramsOrProduct as any).operation || maybeOperation || 'create';
    } else {
      product = paramsOrProduct as SyncSupplierProductParams;
      operation = maybeOperation || (product as any).operation || 'create';
    }

    if (!product) {
      console.error('[useSync] syncSupplierProduct: product is undefined or null', { paramsOrProduct, maybeOperation });
      return;
    }

    console.log('%c[useSync] 🔵 syncSupplierProduct LLAMADO', 'color: purple; font-weight: bold', {
      name: product?.name,
      operation,
      sync_id: product?.sync_id,
      supplierId: product?.supplierId
    });

    let syncId = product.sync_id as string | undefined;
    
    if (!syncId) {
      // Generate a unique sync_id for the product
      const baseId = product.supplierId
        ? `${product.supplierId}-${product.name}-${product.price}`
        : `${product.name}-${product.price}-${Date.now()}`;
      syncId = product.sync_id = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[useSync] syncId generado para producto:', syncId);
    }
    
    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'supplier_product',
      operation,
      data: {
        supplier_id: product.supplierId || product.supplier_id,
        name: product.name,
        price: product.price,
        image_base64: product.imageBase64 || product.image_base64,
        updated_at: Date.now(),
      },
    };

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();
  }

  function syncBudget(params: { budgetData: SyncBudgetParams; operation?: 'create' | 'update' | 'delete' }) {
    const { budgetData, operation = 'create' } = params;
    let syncId = budgetData.sync_id;
    
    if (!syncId) {
      syncId = budgetData.sync_id = String(budgetData.id || `budget-${budgetData.date}`);
    }
    
    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'budget',
      operation,
      data: {
        date: budgetData.date,
        is_day_closed: budgetData.isDayClosed,
        finish_day_data: budgetData.finishDayData,
        updated_at: Date.now(),
      },
    };

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();
  }

  function syncBudgetProvider(params: { provider: SyncBudgetProviderParams; operation?: 'create' | 'update' | 'delete'; products?: SyncBudgetProviderProductParams[]; supplierSyncId?: string }) {
    const { provider, operation = 'create', products, supplierSyncId } = params;
    let syncId = provider.sync_id;
    
    if (!syncId) {
      syncId = provider.sync_id = String(provider.id || generateSyncId());
    }
    
    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'budget_provider',
      operation,
      data: {
        date: provider.date,
        name: provider.name as string,
        estimated: provider.estimated as number,
        account_id: provider.accountId as string,
        efectivo: provider.efectivo as number,
        tarjeta: provider.tarjeta as number,
        credito: provider.credito as number,
        notes: provider.notes as string,
        visited: provider.visited as boolean,
        _supplier_id: provider._supplierId || supplierSyncId,
        _supplier_name: provider._supplierName as string,
        products: products ? products.map((p: SyncBudgetProviderProductParams) => ({
          sync_id: p.sync_id,
          supplier_product_id: p.supplierProductId,
          product_name: p.productName,
          product_price: p.productPrice,
          quantity: p.quantity,
          updated_at: Date.now(),
        })) : [],
        updated_at: Date.now(),
      },
    };

    console.log('syncBudgetProvider - Enviando payload:', JSON.stringify({
      id: syncItem.id,
      entityType: syncItem.entityType,
      operation: syncItem.operation,
      data: syncItem.data,
      productsDetails: (syncItem.data as any).products?.map((p: SyncBudgetProviderProductParams) => ({
        supplierProductId: p.supplierProductId,
        productName: p.productName,
        quantity: p.quantity
      }))
    }, null, 2));

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();
  }

  function syncBudgetProviderProduct(params: { product: SyncBudgetProviderProductParams; operation?: 'create' | 'update' | 'delete' }) {
    const { product, operation = 'create' } = params;
    let syncId = product.sync_id;
    
    if (!syncId) {
      syncId = product.sync_id = String(product.id || generateSyncId());
    }
    
    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'budget_provider_product',
      operation,
      data: {
        budget_provider_id: product.budgetProviderId,
        supplier_product_id: product.supplierProductId,
        product_name: product.productName,
        product_price: product.productPrice,
        quantity: product.quantity,
        updated_at: Date.now(),
      },
    };

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();
  }

  async function syncNow(): Promise<boolean> {
    if (!isOnline.value) {
      syncError.value = 'Cannot sync while offline';
      return false;
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      const result = await syncService.processQueue();
      
      console.log('syncNow - result from server:', JSON.stringify(result, null, 2));
      
      if (result) {
        await applyServerChanges({ changes: (result as any).results || {}, serverTime: result.serverTime });
      }

      lastSyncTime.value = syncService.getLastSyncTime();
      pendingChanges.value = syncService.getQueueCount();
      
      return true;
    } catch (error) {
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
      const changes = await (syncService as any).pullChanges();
      await applyServerChanges({ changes, serverTime: Date.now() });
      lastSyncTime.value = syncService.getLastSyncTime();
    } catch (error) {
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

    if (changes.entry) {
      const entries = Array.isArray(changes.entry) ? changes.entry : [];
      for (const entry of entries) {
        if (entry._deleted) {
          const localId = entry.id;
          budgetStore.removeEntry(localId);
        } else {
          const existing = budgetStore.entries.find(e => String(e.id) === String(entry.id));
          if (existing) {
            budgetStore.updateEntry(entry.id, {
              name: entry.name as string,
              amount: entry.amount,
              date: entry.date,
              paymentType: entry.payment_type,
              entryType: entry.entry_type,
              accountId: entry.account_id ? parseInt(entry.account_id, 10) : null,
              groups: entry.groups as string[],
            });
          } else {
            budgetStore.addEntry({
              id: entry.id,
              name: entry.name as string,
              amount: entry.amount,
              date: entry.date,
              paymentType: entry.payment_type,
              entryType: entry.entry_type,
              accountId: entry.account_id ? parseInt(entry.account_id, 10) : null,
              groups: entry.groups as string[],
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    if (changes.supplier) {
      const suppliers = Array.isArray(changes.supplier) ? changes.supplier : [];
      for (const supplier of suppliers) {
        if (supplier._deleted) {
          const localId = supplier.id;
          budgetStore.removeProvider(localId);
        } else {
          const existing = budgetStore.providers.find(p => String(p.id) === String(supplier.id));
          const s = supplier as any;
          if (existing) {
            budgetStore.updateProvider(supplier.id, {
              name: s.name as string,
              date: s.date,
              estimated: s.estimated as number,
              accountId: s.account_id ? parseInt(s.account_id, 10) : null,
              efectivo: s.efectivo as number,
              tarjeta: s.tarjeta as number,
              credito: s.credito as number,
              notes: s.notes as string,
              visited: s.visited as boolean,
            });
          } else {
            budgetStore.addProvider({
              id: supplier.id,
              name: s.name as string,
              date: s.date,
              estimated: s.estimated as number,
              accountId: s.account_id ? parseInt(s.account_id, 10) : null,
              efectivo: s.efectivo as number,
              tarjeta: s.tarjeta as number,
              credito: s.credito as number,
              notes: s.notes as string,
              visited: s.visited as boolean,
            });
          }
        }
      }
    }

    if (changes.account) {
      const accounts = Array.isArray(changes.account) ? changes.account : [];
      for (const account of accounts) {
        if (!account._deleted) {
          accountsStore.upsertAccount({
            id: account.id,
            sync_id: account.id,
            name: account.name,
            initialBalance: account.initial_balance,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    }

    if (changes.template) {
      const templates = Array.isArray(changes.template) ? changes.template : [];
      for (const template of templates) {
        if (!template._deleted) {
          templatesStore.upsertTemplate({
            id: template.id,
            sync_id: template.id,
            name: template.name,
            description: template.description,
            suppliers: template.suppliers,
            suppliersSnapshot: template.suppliers_snapshot,
          });
        }
      }
    }

    if (changes.budget) {
      const budgets = Array.isArray(changes.budget) ? changes.budget : [];
      for (const budget of budgets) {
        if (budget._deleted) {
          const localId = budget.id;
          budgetStore.clearAll();
        } else {
          budgetStore.setSelectedDate(budget.date);
          budgetStore.setIsDayClosed(!!budget.is_day_closed);
          if (budget.finish_day_data) {
            budgetStore.setFinishDayData(budget.finish_day_data);
          }
        }
      }
    }

    if (changes.budget_provider) {
      const providers = Array.isArray(changes.budget_provider) ? changes.budget_provider : [];
      for (const provider of providers) {
        if (provider._deleted) {
          const localId = provider.id;
          budgetStore.removeProvider(localId);
        } else {
          const existing = budgetStore.providers.find(p => String(p.id) === String(provider.id));
          if (existing) {
            budgetStore.updateProvider(provider.id, {
              name: provider.name as string,
              date: provider.date,
              estimated: provider.estimated as number,
              accountId: provider.account_id ? parseInt(provider.account_id, 10) : null,
              efectivo: provider.efectivo as number,
              tarjeta: provider.tarjeta as number,
              credito: provider.credito as number,
              notes: provider.notes as string,
              visited: provider.visited as boolean,
            });
          } else {
            budgetStore.addProvider({
              id: provider.id,
              name: provider.name as string,
              date: provider.date,
              estimated: provider.estimated as number,
              accountId: provider.account_id ? parseInt(provider.account_id, 10) : null,
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

    if (changes.budget_provider_product) {
      const products = Array.isArray(changes.budget_provider_product) ? changes.budget_provider_product : [];
      const productsByProvider: Record<string, BudgetProviderProduct[]> = {};
      
      for (const product of products) {
        if (!product._deleted) {
          const providerId = product.budget_provider_id;
          if (!productsByProvider[providerId]) {
            productsByProvider[providerId] = [];
          }
          productsByProvider[providerId].push({
            id: product.id,
            sync_id: product.id,
            supplierProductId: product.supplier_product_id,
            productName: product.product_name,
            productPrice: product.product_price,
            quantity: product.quantity,
          });
        }
      }
      
      for (const [providerId, prods] of Object.entries(productsByProvider)) {
        const provider = budgetStore.providers.find(p => String(p.id) === String(providerId));
        if (provider) {
          budgetStore.updateProvider(Number(providerId), { products: prods });
        }
      }
    }
  }

  // Usa BudgetProviderProduct del store (budgetStore.ts)

  function startAutoSync(intervalMs: number = 30000) {
    const interval = setInterval(() => {
      if (isOnline.value && pendingChanges.value > 0) {
        syncNow();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }

  onMounted(() => {
    cleanupOnlineListener = syncService.onOnlineChange((online) => {
      isOnline.value = online;
      if (online) {
        syncNow();
      }
    });

    pendingChanges.value = syncService.getQueueCount();
    lastSyncTime.value = syncService.getLastSyncTime();
  });

  onUnmounted(() => {
    if (cleanupOnlineListener) {
      cleanupOnlineListener();
    }
  });

  return {
    isOnline,
    isSyncing,
    pendingChanges,
    lastSyncTime,
    syncError,
    syncEntry,
    syncProvider,
    syncAccount,
    syncTemplate,
    syncBudget,
    syncBudgetProvider,
    syncBudgetProviderProduct,
    syncSupplierProduct,
    syncNow,
    pullFromServer,
    startAutoSync,
  };
}
