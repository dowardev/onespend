// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineStore } from 'pinia';
import suppliersController, {
  Supplier,
} from '../controllers/suppliersController';

export const useSuppliersStore = defineStore('suppliers', {
  state: () => ({
    suppliers: [] as Supplier[],
  }),
  actions: {
    async loadAll() {
      try {
        const list =
          (await suppliersController.listSuppliers()) as unknown as any[];
        // Avoid deep type instantiation by treating list/items as any
        this.suppliers.length = 0;
        for (const it of list) {
          (this.suppliers as any).push(it);
        }
      } catch (e) {
        console.error('suppliersStore.loadAll error', e);
        // Clear safely
        this.suppliers.length = 0;
      }
    },

    async createSupplier(
      data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>
    ) {
      try {
        await suppliersController.addSupplier(data);
        await this.loadAll();
      } catch (e) {
        console.error('suppliersStore.createSupplier error', e);
        throw e;
      }
    },

    async updateSupplier(s: Supplier) {
      try {
        await suppliersController.updateSupplier(s);
        await this.loadAll();
      } catch (e) {
        console.error('suppliersStore.updateSupplier error', e);
        throw e;
      }
    },

    async deleteSupplier(id: IDBValidKey) {
      try {
        await suppliersController.deleteSupplier(id);
        await this.loadAll();
      } catch (e) {
        console.error('suppliersStore.deleteSupplier error', e);
        throw e;
      }
    },
  },
});
