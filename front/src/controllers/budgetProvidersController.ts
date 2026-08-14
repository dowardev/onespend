// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { toBudgetProviderRow } from '@/db/mappers'
import { useBudgetProvidersStore } from '@/stores/budgetProvidersStore';
import { useBudgetDayStore } from '@/stores/budgetDayStore';
import { syncQueue } from '@/services/syncQueue';
import { budgetProvidersDb } from '@/db/controllers/budgetProvidersDb';

import type { Provider, BudgetProviderProduct } from '@/stores/budgetProvidersStore';
import type { Supplier } from './suppliersController';
import { generateSyncId } from '@/utils/generateSyncId';

export type { Provider, BudgetProviderProduct };

class BudgetProvidersController {
  private pendingTimeouts: Set<any> | null = null;

  getStore() {
    return useBudgetProvidersStore();
  }

  getProviders() {
    return this.getStore().providers;
  }

  async getAll(): Promise<Provider[]> {
    return [...this.getStore().providers];
  }

  async addProvider(params: {
    name?: string;
    estimated?: number;
    accountId?: number;
    allowEmpty?: boolean;
    _supplierId?: string | number;
    _supplierName?: string;
    _supplier?: Supplier;
    notes?: string;
    products?: BudgetProviderProduct[];
    items?: Array<{ amount: number; accountId: string | number | null }>;
    date?: string;
    _fromRecurringId?: string;
  }) {
    const {
      name = '', estimated = 0, accountId = null, allowEmpty = false,
      _supplierId, _supplierName, _supplier, notes, products, items, date, _fromRecurringId,
    } = params;
    if (!name && !allowEmpty) return;

    const store = this.getStore();
    const dayStore = useBudgetDayStore();
    const localId = Date.now() + Math.random();
    const supplierSyncId = _supplierId as string | undefined;
    const providerDate = date || dayStore.selectedDate;

    const newProvider: Provider = {
      id: localId,
      sync_id: generateSyncId(),
      name,
      date: providerDate,
      estimated: Number(estimated) || 0,
      accountId: accountId ? Number(accountId) : null,
      efectivo: 0,
      tarjeta: 0,
      credito: 0,
      notes: notes || '',
      visited: false,
      _justAdded: true,
      _supplierId: supplierSyncId,
      _supplierName,
      _pendingProducts: products,
      products,
      items,
      _supplier: _supplier ? JSON.parse(JSON.stringify(_supplier)) : undefined,
      createdAt: Date.now(),
      _fromRecurringId,
    };

    await budgetProvidersDb.add({ entry: toBudgetProviderRow(newProvider) });

    syncQueue.syncBudgetProvider({ provider: newProvider as any, operation: 'create', products: products as any, supplierSyncId });

    const timeoutId = setTimeout(() => {
      const provider = store.providers.find((p) => p.id === newProvider.id);
      if (provider) {
        store.updateProvider(provider.id, { _justAdded: false });
      }
    }, 400);

    if (!this.pendingTimeouts) {
      this.pendingTimeouts = new Set();
    }
    this.pendingTimeouts.add(timeoutId);
    setTimeout(() => {
      this.pendingTimeouts?.delete(timeoutId);
    }, 500);

    return newProvider;
  }

  async updateProvider(params: { id: string | number; changes: Partial<Provider> }) {
    const { id, changes } = params;
    const store = this.getStore();
    const dayStore = useBudgetDayStore();
    const provider = store.providers.find((p) => p.id === id);
    if (!provider) return false;

    const productsToSync = (changes.products || provider?.products || []) as any[];
    const supplierSyncId = String(provider?._supplierId || changes._supplierId || '');

    const newDate = changes.date;
    const currentDate = dayStore.selectedDate;

    if (newDate && newDate !== currentDate) {
      const updatedProvider = { ...provider, ...changes };
      await budgetProvidersDb.put({ entry: toBudgetProviderRow(updatedProvider) });
      syncQueue.syncBudgetProvider({ provider: updatedProvider, operation: 'update', products: productsToSync, supplierSyncId });
      return true;
    } else {
      const updatedProvider = { ...provider, ...changes };
      await budgetProvidersDb.put({ entry: toBudgetProviderRow(updatedProvider) });
      syncQueue.syncBudgetProvider({ provider: updatedProvider, operation: 'update', products: productsToSync, supplierSyncId });
      return false;
    }
  }

  async removeProvider(params: { id: string | number }) {
    const { id } = params;
    const provider = this.getStore().providers.find((p) => p.id === id);
    if (provider) {
      await budgetProvidersDb.delete({ syncId: provider.sync_id as string });
      syncQueue.syncBudgetProvider({ provider, operation: 'delete' });
    }
  }

  clearAllProviders() {
    this.getStore().clearProviders();
  }

  syncProvidersWithSuppliers(params: { suppliers: Supplier[] }) {
    const { suppliers } = params;
    return this.getStore().syncProvidersWithSuppliers(suppliers);
  }

  cleanup() {
    if (this.pendingTimeouts) {
      this.pendingTimeouts.forEach((timeoutId: any) => clearTimeout(timeoutId));
      this.pendingTimeouts.clear();
    }
  }
}

const budgetProvidersController = new BudgetProvidersController();
export default budgetProvidersController;
export { BudgetProvidersController };
