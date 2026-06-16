import { syncService } from '@/services/syncService';
import { generateSyncId } from '@/utils/UuidGenerator';

async function syncAccount(params: { account: any; operation?: 'create' | 'update' | 'delete' }) {
  const { account, operation = 'create' } = params;
  let syncId = account.sync_id;
  if (!syncId) {
    syncId = account.sync_id = String(account.id || generateSyncId());
  }
  const syncItem = {
    id: syncId,
    entityType: 'account' as const,
    operation,
    data: {
      name: account.name,
      initial_balance: account.initialBalance,
      updated_at: Date.now(),
    },
  };
  await syncService.queueOperation(syncItem);
  return syncService.getQueueCount();
}

async function syncEntry(params: { entry: any; operation?: 'create' | 'update' | 'delete' }) {
  const { entry, operation = 'create' } = params;
  let syncId = entry.sync_id;
  if (!syncId) {
    syncId = entry.sync_id = String(entry.id || generateSyncId());
  }
  const syncItem = {
    id: syncId,
    entityType: 'budget_entry' as const,
    operation,
    data: {
      name: entry.name as string,
      amount: entry.amount,
      date: entry.date,
      payment_type: entry.paymentType as string,
      entry_type: entry.entryType as string,
      account_id: entry.accountId != null ? String(entry.accountId) : undefined,
      groups: entry.groups?.map((g: any) => ({
        sync_id: g.sync_id,
        amount: g.amount,
        accountId: g.accountId,
      })),
      supplier_id: entry.supplierId,
      supplier_name: entry.supplierName,
      updated_at: Date.now(),
    },
  };
  await syncService.queueOperation(syncItem);
  return syncService.getQueueCount();
}

async function syncProvider(params: { provider: any; operation?: 'create' | 'update' | 'delete' }) {
  const { provider, operation = 'create' } = params;
  const prov = provider;
  let syncId = prov.sync_id;
  if (!syncId) {
    syncId = prov.sync_id = String(prov.id || generateSyncId());
  }
  const syncItem = {
    id: syncId,
    entityType: 'supplier' as const,
    operation,
    data: {
      name: prov?.name || null,
      updated_at: Date.now(),
    },
  };
  await syncService.queueOperation(syncItem);
  return syncService.getQueueCount();
}

async function syncSupplierProduct(params: { product: any; operation?: 'create' | 'update' | 'delete' }) {
  const { product, operation = 'create' } = params;
  let syncId = product.sync_id;
  if (!syncId) {
    syncId = product.sync_id = generateSyncId();
  }
  const syncItem = {
    id: syncId,
    entityType: 'supplier_product' as const,
    operation,
    data: {
      supplier_id: product.supplierId || product.supplier_id,
      name: product.name,
      price: product.price,
      image_base64: product.imageBase64 || product.image_base64 || null,
      updated_at: Date.now(),
    },
  };
  await syncService.queueOperation(syncItem);
  return syncService.getQueueCount();
}

async function syncBudgetProvider(params: { provider: any; operation?: 'create' | 'update' | 'delete'; products?: any[]; supplierSyncId?: string }) {
  const { provider, operation = 'create', products, supplierSyncId } = params;
  let syncId = provider.sync_id;
  if (!syncId) {
    syncId = provider.sync_id = String(provider.id || generateSyncId());
  }
  const syncItem = {
    id: syncId,
    entityType: 'budget_provider' as const,
    operation,
    data: {
      name: provider.name,
      date: provider.date,
      estimated: provider.estimated,
      account_id: provider.accountId != null ? String(provider.accountId) : undefined,
      efectivo: provider.efectivo,
      tarjeta: provider.tarjeta,
      credito: provider.credito,
      notes: provider.notes,
      visited: provider.visited,
      _supplier_id: supplierSyncId || provider.supplierId || provider._supplier_id,
      _supplier_name: provider.supplierName || provider._supplier_name,
      products: products || [],
      updated_at: Date.now(),
    },
  };
  await syncService.queueOperation(syncItem);
  return syncService.getQueueCount();
}

async function syncBudgetProviderProduct(params: { product: any; operation?: 'create' | 'update' | 'delete' }) {
  const { product, operation = 'create' } = params;
  let syncId = product.sync_id;
  if (!syncId) {
    syncId = product.sync_id = String(product.id || generateSyncId());
  }
  const syncItem = {
    id: syncId,
    entityType: 'budget_provider_product' as const,
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
  await syncService.queueOperation(syncItem);
  return syncService.getQueueCount();
}

async function syncRecurringRecord(params: { record: any; operation?: 'create' | 'update' | 'delete' }) {
  const { record, operation = 'create' } = params;
  let syncId = record.sync_id;
  if (!syncId) {
    syncId = record.sync_id = String(record.id || generateSyncId());
  }
  const syncItem = {
    id: syncId,
    entityType: 'recurring_record' as const,
    operation,
    data: {
      type: record.type,
      entry_type: record.entryType,
      name: record.name,
      amount: record.amount,
      account_id: record.accountId as string,
      repeat_frequency: record.repeatFrequency,
      repeat_interval: record.repeatInterval,
      repeat_days: record.repeatDays,
      repeat_month_day: record.repeatMonthDay,
      repeat_month_weekday_mode: record.repeatMonthWeekdayMode,
      repeat_month_weekday: record.repeatMonthWeekday,
      repeat_month_weekday_ordinal: record.repeatMonthWeekdayOrdinal,
      repeat_year_month: record.repeatYearMonth,
      repeat_year_day: record.repeatYearDay,
      time: record.time,
      auto_insert: record.autoInsert,
      start_date: record.startDate,
      end_date: record.endDate,
      estimated: record.estimated,
      items: record.items,
      notes: record.notes,
      status: record.status,
      products: record.products ? record.products.map((p: any) => ({
        sync_id: p.sync_id,
        supplier_product_id: p.supplierProductId,
        product_name: p.productName,
        product_price: p.productPrice,
        quantity: p.quantity,
      })) : [],
      updated_at: Date.now(),
    },
  };
  await syncService.queueOperation(syncItem);
  return syncService.getQueueCount();
}

export const syncQueue = {
  syncAccount,
  syncEntry,
  syncProvider,
  syncSupplierProduct,
  syncBudgetProvider,
  syncBudgetProviderProduct,
  syncRecurringRecord,
};
