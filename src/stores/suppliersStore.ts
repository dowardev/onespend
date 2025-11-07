import { defineStore } from 'pinia';
import suppliersController, { Supplier } from '../controllers/suppliersController';

export const useSuppliersStore = defineStore('suppliers', {
  state: () => ({
    suppliers: [] as Supplier[],
  }),
  actions: {
    async loadAll() {
      try {
        const list = (await suppliersController.listSuppliers()) as Supplier[];
        this.suppliers.splice(0, this.suppliers.length, ...list);
      } catch (e) {
        console.error('suppliersStore.loadAll error', e);
        this.suppliers.splice(0, this.suppliers.length);
      }
    },

    async createSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) {
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

