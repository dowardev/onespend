// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { syncService } from '@/services/syncService';
import { generateSyncId } from '@/utils/UuidGenerator';
import { toApiFormat } from '@/services/sync/entityMappers';

async function syncAccount(params: { account: any; operation?: 'create' | 'update' | 'delete' }) {
  const { account, operation = 'create' } = params;
  let syncId = account.sync_id;
  if (!syncId) {
    syncId = account.sync_id = String(account.id || generateSyncId());
  }
  await syncService.queueOperation({ id: syncId, entityType: 'account', operation, data: toApiFormat('account', account) ?? {} });
  return syncService.getQueueCount();
}

async function syncEntry(params: { entry: any; operation?: 'create' | 'update' | 'delete' }) {
  const { entry, operation = 'create' } = params;
  let syncId = entry.sync_id;
  if (!syncId) {
    syncId = entry.sync_id = String(entry.id || generateSyncId());
  }
  await syncService.queueOperation({ id: syncId, entityType: 'budget_entry', operation, data: toApiFormat('budget_entry', entry) ?? {} });
  return syncService.getQueueCount();
}

async function syncProvider(params: { provider: any; operation?: 'create' | 'update' | 'delete' }) {
  const { provider, operation = 'create' } = params;
  let syncId = provider.sync_id;
  if (!syncId) {
    syncId = provider.sync_id = String(provider.id || generateSyncId());
  }
  await syncService.queueOperation({ id: syncId, entityType: 'supplier', operation, data: toApiFormat('supplier', provider) ?? {} });
  return syncService.getQueueCount();
}

async function syncSupplierProduct(params: { product: any; operation?: 'create' | 'update' | 'delete' }) {
  const { product, operation = 'create' } = params;
  let syncId = product.sync_id;
  if (!syncId) {
    syncId = product.sync_id = generateSyncId();
  }
  await syncService.queueOperation({ id: syncId, entityType: 'supplier_product', operation, data: toApiFormat('supplier_product', product) ?? {} });
  return syncService.getQueueCount();
}

async function syncBudgetProvider(params: { provider: any; operation?: 'create' | 'update' | 'delete'; products?: any[]; supplierSyncId?: string }) {
  const { provider, operation = 'create', products, supplierSyncId } = params;
  let syncId = provider.sync_id;
  if (!syncId) {
    syncId = provider.sync_id = String(provider.id || generateSyncId());
  }
  const merged = { ...provider, _supplier_id: supplierSyncId || provider.supplierId || provider._supplier_id, products: products || provider.products || [] };
  delete merged.supplierId;
  await syncService.queueOperation({ id: syncId, entityType: 'budget_provider', operation, data: toApiFormat('budget_provider', merged) ?? {} });
  return syncService.getQueueCount();
}

async function syncRecurringRecord(params: { record: any; operation?: 'create' | 'update' | 'delete' }) {
  const { record, operation = 'create' } = params;
  // Records coming from the UI are Vue reactive proxies; IndexedDB's structured clone
  // cannot clone proxies, so strip them via a deep clone before building the payload.
  const plain = JSON.parse(JSON.stringify(record));
  let syncId = plain.sync_id;
  if (!syncId) {
    syncId = plain.sync_id = String(plain.id || generateSyncId());
  }
  await syncService.queueOperation({ id: syncId, entityType: 'recurring_record', operation, data: toApiFormat('recurring_record', plain) ?? {} });
  return syncService.getQueueCount();
}

export const syncQueue = {
  syncAccount,
  syncEntry,
  syncProvider,
  syncSupplierProduct,
  syncBudgetProvider,
  syncRecurringRecord,
};
