import { ref, onMounted, onUnmounted } from 'vue';
import { syncService, type SyncItem } from '@/services/syncService';
import { useBudgetStore } from '@/stores/budgetStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { useSuppliersStore } from '@/stores/suppliersStore';
import { useTemplatesStore } from '@/stores/templatesStore';

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

  function syncEntry(entry: any, operation: 'create' | 'update' | 'delete' = 'create') {
    let syncId = entry.sync_id;
    
    if (!syncId) {
      syncId = entry.sync_id = String(entry.id || generateSyncId());
    }
    
    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'entry',
      operation,
      data: {
        name: entry.name,
        amount: entry.amount,
        date: entry.date,
        payment_type: entry.paymentType,
        entry_type: entry.entryType,
        account_id: entry.accountId,
        groups: entry.groups,
        _from_provider_group_id: entry._fromProviderGroupId,
        _provider_name: entry._providerName,
        updated_at: Date.now(),
      },
    };

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();
  }

  function syncProvider(provider: any, operation: 'create' | 'update' | 'delete' = 'create') {
    let syncId = provider.sync_id;
    
    if (!syncId) {
      syncId = provider.sync_id = String(provider.id || generateSyncId());
    }
    
    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'supplier',
      operation,
      data: {
        name: provider.name,
        date: provider.date,
        estimated: provider.estimated,
        account_id: provider.accountId,
        efectivo: provider.efectivo,
        tarjeta: provider.tarjeta,
        credito: provider.credito,
        notes: provider.notes,
        visited: provider.visited,
        _supplier_id: provider._supplierId,
        _supplier_name: provider._supplierName,
        updated_at: Date.now(),
      },
    };

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();
  }

  function syncAccount(account: any, operation: 'create' | 'update' | 'delete' = 'create') {
    let syncId = account.sync_id;
    
    if (!syncId) {
      syncId = account.sync_id = String(account.id || generateSyncId());
    }
    
    const syncItem: Omit<SyncItem, 'timestamp' | 'retryCount'> = {
      id: syncId,
      entityType: 'account',
      operation,
      data: {
        name: account.name,
        initial_balance: account.initialBalance,
        updated_at: Date.now(),
      },
    };

    syncService.queueOperation(syncItem);
    pendingChanges.value = syncService.getQueueCount();
  }

  function syncTemplate(template: any, operation: 'create' | 'update' | 'delete' = 'create') {
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

  function syncBudget(budgetData: any, operation: 'create' | 'update' | 'delete' = 'create') {
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

  async function syncNow(): Promise<boolean> {
    if (!isOnline.value) {
      syncError.value = 'Cannot sync while offline';
      return false;
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      const result = await syncService.processQueue();
      
      if (result) {
        await applyServerChanges(result);
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
      const changes = await syncService.pullChanges();
      await applyServerChanges({ changes, serverTime: Date.now() } as any);
      lastSyncTime.value = syncService.getLastSyncTime();
    } catch (error) {
      syncError.value = error instanceof Error ? error.message : 'Pull failed';
    } finally {
      isSyncing.value = false;
    }
  }

  async function applyServerChanges(result: { changes?: Record<string, any[]>; serverTime?: number }) {
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
              name: entry.name,
              amount: entry.amount,
              date: entry.date,
              paymentType: entry.payment_type,
              entryType: entry.entry_type,
              accountId: entry.account_id,
              groups: entry.groups,
            });
          } else {
            budgetStore.addEntry({
              id: entry.id,
              name: entry.name,
              amount: entry.amount,
              date: entry.date,
              paymentType: entry.payment_type,
              entryType: entry.entry_type,
              accountId: entry.account_id,
              groups: entry.groups,
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
          if (existing) {
            budgetStore.updateProvider(supplier.id, {
              name: supplier.name,
              date: supplier.date,
              estimated: supplier.estimated,
              accountId: supplier.account_id,
              efectivo: supplier.efectivo,
              tarjeta: supplier.tarjeta,
              credito: supplier.credito,
              notes: supplier.notes,
              visited: supplier.visited,
            });
          } else {
            budgetStore.addProvider({
              id: supplier.id,
              name: supplier.name,
              date: supplier.date,
              estimated: supplier.estimated,
              accountId: supplier.account_id,
              efectivo: supplier.efectivo,
              tarjeta: supplier.tarjeta,
              credito: supplier.credito,
              notes: supplier.notes,
              visited: supplier.visited,
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
  }

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
    syncNow,
    pullFromServer,
    startAutoSync,
  };
}
