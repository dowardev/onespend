// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineStore } from 'pinia';
import { computed } from 'vue';
import type { BudgetProviderRow } from '@/db/types';
import type { Supplier } from '@/controllers/suppliersController';
import { dataMediator } from '@/services/dataMediator';
import { useBudgetDayStore } from './budgetDayStore';

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
  accountId: string | number | null;
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

export function mapProviderRow(row: BudgetProviderRow): Provider {
  return {
    id: row.sync_id,
    sync_id: row.sync_id,
    serverId: row.serverId ?? null,
    name: row.name ?? '',
    date: row.date ?? '',
    estimated: row.estimated ?? 0,
    accountId: row.accountId != null ? row.accountId : null,
    efectivo: row.efectivo ?? 0,
    tarjeta: row.tarjeta ?? 0,
    credito: row.credito ?? 0,
    notes: row.notes ?? '',
    visited: !!row.visited,
    synced_at: row.syncedAt,
    createdAt: row.createdAt,
    _supplierId: (row as any)._supplierId ?? (row as any)._supplier_id ?? null,
    _supplierName: (row as any)._supplierName ?? (row as any)._supplier_name ?? '',
    _fromRecurringId: row.fromRecurringId,
    products: (row as any).products,
    items: (row as any).items,
  }
}

export const useBudgetProvidersStore = defineStore('budgetProviders', () => {
  const rawProviders = dataMediator.refs.providers;

  const providers = computed<Provider[]>(() => {
    const dayStore = useBudgetDayStore();
    const currentDate = dayStore.selectedDate;
    return rawProviders.value
      .filter(row => row.date === currentDate)
      .map(mapProviderRow)
  });

  async function reload() {
    await dataMediator.reload('providers')
  }

  const totalEfectivo = computed(() => providers.value.reduce((s, p) => s + Number(p.efectivo || 0), 0));
  const totalTarjeta = computed(() => providers.value.reduce((s, p) => s + Number(p.tarjeta || 0), 0));
  const totalCredito = computed(() => providers.value.reduce((s, p) => s + Number(p.credito || 0), 0));
  const totalEstimacion = computed(() =>
    providers.value.reduce((s, p) => s + Number(p.efectivo || 0) + Number(p.tarjeta || 0), 0),
  );

  function loadProviders(items: Provider[]) {
    rawProviders.value.splice(0, rawProviders.value.length, ...(items as any));
  }

  function addProvider(provider: Provider) {
    rawProviders.value.push(provider as any);
  }

  function updateProvider(id: string | number, changes: Partial<Provider>) {
    const idx = rawProviders.value.findIndex((p) => (p as any).id === id || p.sync_id === id);
    if (idx === -1) return;

    const provider = rawProviders.value[idx];
    const updatedProvider = { ...provider } as any;

    const numericFields: (keyof Provider)[] = ['estimated', 'accountId', 'efectivo', 'tarjeta', 'credito'];
    for (const field of numericFields) {
      if (changes[field] !== undefined) {
        updatedProvider[field] = Number(changes[field]) || 0;
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

    rawProviders.value.splice(idx, 1, updatedProvider);
  }

  function removeProvider(id: string | number) {
    const idx = rawProviders.value.findIndex((p) => (p as any).id === id || p.sync_id === id);
    if (idx >= 0) rawProviders.value.splice(idx, 1);
  }

  function clearProviders() {
    rawProviders.value.splice(0, rawProviders.value.length);
  }

  function syncProvidersWithSuppliers(suppliers: Supplier[]) {
    for (let i = 0; i < rawProviders.value.length; i++) {
      const provider = rawProviders.value[i] as any;
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
            const serverProducts = matchingSupplier.products as any[];
            const _localProducts = (provider._supplierProducts || []) as any[];

            const syncedProducts: BudgetProviderProduct[] = serverProducts.map((serverProduct: any) => {
              return {
                id: serverProduct.id,
                sync_id: serverProduct.sync_id || serverProduct.id,
                supplierProductId: serverProduct.id,
                productName: serverProduct.name,
                productPrice: serverProduct.price,
                quantity: 1,
              };
            });

            provider._supplierProducts = syncedProducts;
          }

          if (needsUpdate) {
            const updatedProvider = { ...provider, ...updates };
            rawProviders.value.splice(i, 1, updatedProvider);
          }
        }
      }
    }
  }

  return {
    rawProviders,
    providers,
    totalEfectivo, totalTarjeta, totalCredito, totalEstimacion,
    loadProviders, addProvider, updateProvider, removeProvider, clearProviders,
    syncProvidersWithSuppliers,
    reload,
  };
});
