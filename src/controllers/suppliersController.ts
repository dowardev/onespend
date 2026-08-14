// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { DixieController } from './dixie';

export type Product = {
  name: string;
  price: number;
  // Optional base64-encoded image for the product (nullable)
  imageBase64?: string | null;
};

export type Supplier = {
  id?: IDBValidKey;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  products?: Product[];
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

    // Ensure we are not passing Vue reactive Proxy objects to IndexedDB (structured clone fails on Proxy)
    // Create a deep plain clone of the incoming object
    const clean = JSON.parse(JSON.stringify(s)) as any;

    const entry: Supplier = {
      ...clean,
      createdAt: now,
      updatedAt: now,
    };

    const id = await ctrl.addEntry({ entry });

    // Try to sync Pinia store lazily
    try {
      const mod = await import('../stores/suppliersStore');
      const store = mod.useSuppliersStore();
      await store.loadAll();
    } catch (_e) {
      /* ignore */
    }

    return { ...(entry as any), id } as Supplier;
  }

  async updateSupplier(s: Supplier) {
    if (s.id == null) throw new Error('Supplier must have id to be updated');
    const ctrl = this.getController();

    // Ensure we don't send Vue reactive Proxy objects to IndexedDB
    const clean = JSON.parse(JSON.stringify(s)) as Supplier;

    const entry: Supplier = {
      ...clean,
      id: s.id,
      updatedAt: Date.now(),
    };

    await ctrl.putEntry({ entry });

    try {
      const mod = await import('../stores/suppliersStore');
      const store = mod.useSuppliersStore();
      await store.loadAll();
    } catch (_e) {
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
    } catch (_e) {
      /* ignore */
    }
  }

  async listSuppliers() {
    const ctrl = this.getController();
    const all = (await ctrl.listBackups()) as Supplier[];
    // sort by createdAt descending
    const sorted = (all || [])
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Try to sync Pinia store lazily
    try {
      const mod = await import('../stores/suppliersStore');
      const store = mod.useSuppliersStore();
      store.suppliers.splice(0, store.suppliers.length, ...(sorted as any));
    } catch (e) {
      /* ignore */
    }

    return sorted;
  }
}

const suppliersController = new SuppliersController();
export default suppliersController;
export { SuppliersController };
