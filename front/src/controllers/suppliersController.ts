import { DixieController } from './dixie';

export type Supplier = {
  id?: IDBValidKey;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  createdAt?: number;
  updatedAt?: number;
};

class SuppliersController {
  // We don't keep a long-lived dixie instance here; create per-operation controllers

  private getController(): DixieController {
    // Create a new controller instance configured for suppliers object store
    return new DixieController({ name: 'ABOgazDB', storeName: 'suppliers' });
  }

  async addSupplier(s: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) {
    const ctrl = this.getController();
    const now = Date.now();
    const entry: Supplier = {
      ...s,
      createdAt: now,
      updatedAt: now,
    };
    const id = await ctrl.addEntry(entry);

    // Try to sync Pinia store lazily
    try {
      const mod = await import('../stores/suppliersStore');
      const store = mod.useSuppliersStore();
      await store.loadAll();
    } catch (e) {
      /* ignore */
    }

    return { ...(entry as any), id } as Supplier;
  }

  async updateSupplier(s: Supplier) {
    if (s.id == null) throw new Error('Supplier must have id to be updated');
    const ctrl = this.getController();
    const entry: Supplier = {
      ...s,
      updatedAt: Date.now(),
    };
    await ctrl.putEntry(entry);

    try {
      const mod = await import('../stores/suppliersStore');
      const store = mod.useSuppliersStore();
      await store.loadAll();
    } catch (e) {
      /* ignore */
    }

    return entry;
  }

  async deleteSupplier(id: IDBValidKey) {
    const ctrl = this.getController();
    await ctrl.deleteBackup(id);

    try {
      const mod = await import('../stores/suppliersStore');
      const store = mod.useSuppliersStore();
      await store.loadAll();
    } catch (e) {
      /* ignore */
    }
  }

  async listSuppliers() {
    const ctrl = this.getController();
    const all = (await ctrl.listBackups()) as Supplier[];
    // sort by createdAt descending
    const sorted = (all || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Try to sync Pinia store lazily
    try {
      const mod = await import('../stores/suppliersStore');
      const store = mod.useSuppliersStore();
      store.suppliers.splice(0, store.suppliers.length, ...sorted);
    } catch (e) {
      /* ignore */
    }

    return sorted;
  }
}

const suppliersController = new SuppliersController();
export default suppliersController;
export { SuppliersController };

