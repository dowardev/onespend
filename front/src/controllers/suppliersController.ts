import { DixieController } from './dixie';
import { reactive, ref } from 'vue';
import { useSuppliersStore } from '../stores/suppliersStore';
import { useSync } from '@/composables/useSync';

export type Product = {
  name: string;
  price: number;
  imageBase64?: string | null;
};

export type Supplier = {
  id?: IDBValidKey;
  sync_id?: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  products?: Product[];
  createdAt?: number;
  updatedAt?: number;
  _synced?: boolean;
};

class SuppliersController {
  private getStore() {
    return useSuppliersStore();
  }

  private getController(): DixieController {
    return new DixieController({ name: 'ABOgazDB', storeName: 'suppliers' });
  }

  async addSupplier(s: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) {
    const store = this.getStore();
    store.loading = true;
    store.error = null;
    try {
      const ctrl = this.getController();
      const now = Date.now();

      const clean = JSON.parse(JSON.stringify(s)) as any;

      const entry: Supplier = {
        ...clean,
        createdAt: now,
        updatedAt: now,
      };

      const { syncProvider } = useSync();
      syncProvider(entry, 'create');

      const id = await ctrl.addEntry({ entry });
      const result = { ...(entry as any), id };

      store.suppliers = [result, ...store.suppliers];
      store.notifyChange();

      return result;
    } catch (e) {
      store.error = e as Error;
      throw e;
    } finally {
      store.loading = false;
    }
  }

  async updateSupplier(s: Supplier) {
    if (s.id == null) throw new Error('Supplier must have id to be updated');
    const store = this.getStore();
    store.loading = true;
    store.error = null;
    try {
      const ctrl = this.getController();

      const clean = JSON.parse(JSON.stringify(s)) as Supplier;

      const entry: Supplier = {
        ...clean,
        id: s.id,
        updatedAt: Date.now(),
      };

      const { syncProvider } = useSync();
      syncProvider(entry, 'update');

      await ctrl.putEntry({ entry });

      store.suppliers = store.suppliers.map(x =>
        x.id === entry.id ? entry : x
      );
      store.notifyChange();

      return entry;
    } catch (e) {
      store.error = e as Error;
      throw e;
    } finally {
      store.loading = false;
    }
  }

  async deleteSupplier(id: IDBValidKey) {
    const store = this.getStore();
    store.loading = true;
    store.error = null;
    try {
      const ctrl = this.getController();
      const supplier = store.suppliers.find(s => s.id === id);
      await ctrl.deleteBackup(id);

      store.suppliers = store.suppliers.filter(s => s.id !== id);
      store.notifyChange();

      if (supplier) {
        const { syncProvider } = useSync();
        syncProvider(supplier, 'delete');
      }
    } catch (e) {
      store.error = e as Error;
      throw e;
    } finally {
      store.loading = false;
    }
  }

  async listSuppliers() {
    const store = this.getStore();
    store.loading = true;
    store.error = null;
    try {
      const ctrl = this.getController();
      const all = (await ctrl.listBackups()) as Supplier[];

      const sorted = (all || [])
        .slice()
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      store.suppliers = sorted as any;
      return sorted;
    } catch (e) {
      store.error = e as Error;
      throw e;
    } finally {
      store.loading = false;
    }
  }

  getSuppliers() {
    const store = this.getStore();
    return store.suppliers;
  }

  getLoading() {
    const store = this.getStore();
    return store.loading;
  }

  getError() {
    const store = this.getStore();
    return store.error;
  }
}

const suppliersController = new SuppliersController();
export default suppliersController;
export { SuppliersController };
