// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { SupplierRow } from '@/db/types';
import type { Supplier } from '@/controllers/suppliersController';
import { dataMediator } from '@/services/dataMediator';

function mapSupplierRow(row: SupplierRow): Supplier {
  return {
    id: row.sync_id,
    sync_id: row.sync_id,
    serverId: row.serverId ?? null,
    name: row.name ?? '',
    products: (row.products || []).map((p) => ({
      sync_id: p.sync_id,
      serverId: p.serverId ?? null,
      supplierId: p.supplierId,
      name: p.name,
      price: p.price,
      imageBase64: p.imageBase64 ?? null,
      imageUrl: p.imageUrl ?? null,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    synced_at: row.syncedAt,
  }
}

export const useSuppliersStore = defineStore('suppliers', () => {
  const rawSupplierRows = dataMediator.refs.suppliers;
  const suppliers = computed(() => rawSupplierRows.value.map(mapSupplierRow));
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function reload() {
    await dataMediator.reload('suppliers')
  }

  return {
    suppliers,
    loading,
    error,
    reload,
  };
});
