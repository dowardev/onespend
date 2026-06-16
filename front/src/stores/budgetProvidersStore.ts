import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Supplier } from '@/controllers/suppliersController';

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

export const useBudgetProvidersStore = defineStore('budgetProviders', () => {
  const providers = ref<Provider[]>([]);

  const totalEfectivo = computed(() => providers.value.reduce((s, p) => s + Number(p.efectivo || 0), 0));
  const totalTarjeta = computed(() => providers.value.reduce((s, p) => s + Number(p.tarjeta || 0), 0));
  const totalCredito = computed(() => providers.value.reduce((s, p) => s + Number(p.credito || 0), 0));
  const totalEstimacion = computed(() =>
    providers.value.reduce((s, p) => s + Number(p.efectivo || 0) + Number(p.tarjeta || 0), 0),
  );

  function loadProviders(items: Provider[]) {
    providers.value.splice(0, providers.value.length, ...items);
  }

  function addProvider(provider: Provider) {
    providers.value.push(provider);
  }

  function updateProvider(id: string | number, changes: Partial<Provider>) {
    const idx = providers.value.findIndex((p) => p.id === id);
    if (idx === -1) return;

    const provider = providers.value[idx];
    const updatedProvider = { ...provider };

    const numericFields: (keyof Provider)[] = ['estimated', 'accountId', 'efectivo', 'tarjeta', 'credito'];
    for (const field of numericFields) {
      if (changes[field] !== undefined) {
        (updatedProvider as any)[field] = Number(changes[field]) || 0;
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

    providers.value.splice(idx, 1, updatedProvider);
  }

  function removeProvider(id: string | number) {
    const idx = providers.value.findIndex((p) => p.id === id);
    if (idx >= 0) providers.value.splice(idx, 1);
  }

  function clearProviders() {
    providers.value.splice(0, providers.value.length);
  }

  function syncProvidersWithSuppliers(suppliers: Supplier[]) {
    for (let i = 0; i < providers.value.length; i++) {
      const provider = providers.value[i];
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
            providers.value.splice(i, 1, updatedProvider);
          }
        }
      }
    }
  }

  return {
    providers,
    totalEfectivo, totalTarjeta, totalCredito, totalEstimacion,
    loadProviders, addProvider, updateProvider, removeProvider, clearProviders,
    syncProvidersWithSuppliers,
  };
});
