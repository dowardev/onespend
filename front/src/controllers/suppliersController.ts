import { suppliersDb } from '@/db/controllers/suppliersDb';
import { useSuppliersStore } from '../stores/suppliersStore';
import { syncService } from '@/services/syncService';
import { syncQueue } from '@/services/syncQueue';
import type { Product } from './supplierProductsController';
import type { SupplierRow } from '@/db/types';
import { generateSyncId } from '@/utils/generateSyncId';

export type Supplier = {
  id?: string | number;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  products?: Product[];
  createdAt?: number;
  updatedAt?: number;
  synced_at?: number;
  _synced?: boolean;
};

class SuppliersController {
  private getStore() {
    return useSuppliersStore();
  }

  async addSupplier(params: { s: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> }) {
    const { s } = params;
    console.log(
      '%c[suppliersController] 🔵 addSupplier INICIADO',
      'color: blue; font-size: 14px; font-weight: bold',
    );
    console.log('%c[suppliersController] Datos recibidos:', 'color: blue', s);

    const store = this.getStore();
    store.loading = true;
    store.error = null;
    try {
      console.log('[suppliersController] addSupplier called with:', JSON.stringify(s, null, 2));

      const now = Date.now();

      // Safe clone function to handle non-cloneable objects
      const safeClone = (obj: any): any => {
        try {
          return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
        } catch {
          // Fallback to manual deep clone for problematic objects
          return JSON.parse(
            JSON.stringify(obj, (key, value) => {
              // Handle circular references and non-serializable values
              if (typeof value === 'function' || value instanceof Error) {
                return undefined;
              }
              return value;
            }),
          );
        }
      };

      const clean = safeClone(s) as Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

      const entry: Supplier = {
        ...clean,
        createdAt: now,
        updatedAt: now,
      };

      console.log('[suppliersController] Entry before sync:', JSON.stringify(entry, null, 2));
      console.log(
        '[suppliersController] Products in entry:',
        entry.products ? entry.products.length : 0,
      );
      if (entry.products && entry.products.length > 0) {
        console.log(
          '[suppliersController] First product:',
          JSON.stringify(entry.products[0], null, 2),
        );
      } else {
        console.log('[suppliersController] ⚠️ NO hay productos en entry');
      }

      if (!entry.sync_id) {
        entry.sync_id = generateSyncId();
      }

      console.log('[suppliersController] 🔵 Sincronizando proveedor:', entry.sync_id);

      // Luego sincronizar el proveedor
      console.log('[suppliersController] 🔵 LLAMANDO syncProvider');
      try {
      syncQueue.syncProvider({ provider: entry, operation: 'create' });
        console.log('[suppliersController] ✅ syncProvider ejecutado');
      } catch (syncErr) {
        console.warn('[suppliersController] syncProvider falló (se reintentará después):', syncErr);
      }

      const localId = await suppliersDb.add({ entry: entry as unknown as SupplierRow });
      entry.id = typeof localId === 'number' ? localId : String(localId);
      const result = entry as Supplier;
      console.log('[suppliersController] Guardado en IndexedDB con localId:', localId);

      await suppliersDb.put({ entry: entry as unknown as SupplierRow });

      store.suppliers = [result, ...store.suppliers];

      console.log('[suppliersController] Esperando sincronizacion...');
      console.log(
        '%c[suppliersController] 🔄 LLAMANDO syncService.processQueue()',
        'color: orange; font-size: 14px',
      );
      try {
        await syncService.processQueue();
        console.log(
          '%c[suppliersController] ✅ Sincronizacion completada',
          'color: green; font-size: 14px',
        );
      } catch (queueErr) {
        console.warn(
          '[suppliersController] processQueue falló (se reintentará después):',
          queueErr,
        );
      }

      console.log('[suppliersController] Recargando proveedores...');
      await this.listSuppliers();
      console.log(
        '%c[suppliersController] 🔵 addSupplier FINALIZADO',
        'color: blue; font-size: 14px; font-weight: bold',
      );

      return result;
    } catch (e) {
      console.error('[suppliersController] ❌ ERROR:', e);
      store.error = e as Error;
      throw e;
    } finally {
      store.loading = false;
    }
  }

  async updateSupplier(params: { s: Supplier }) {
    const { s } = params;
    if (s.sync_id == null) throw new Error('Supplier must have sync_id to be updated');
    const store = this.getStore();
    store.loading = true;
    store.error = null;
    try {
      // Safe clone function to handle non-cloneable objects
      const safeClone = (obj: any): any => {
        try {
          return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
        } catch {
          // Fallback to manual deep clone for problematic objects
          return JSON.parse(
            JSON.stringify(obj, (key, value) => {
              // Handle circular references and non-serializable values
              if (typeof value === 'function' || value instanceof Error) {
                return undefined;
              }
              return value;
            }),
          );
        }
      };

      const clean = safeClone(s) as Supplier;

      const entry: Supplier = {
        ...clean,
        id: s.id,
        sync_id: s.sync_id,
        updatedAt: Date.now(),
      };

      syncQueue.syncProvider({ provider: entry, operation: 'update' });

      await suppliersDb.put({ entry: entry as unknown as SupplierRow });

      store.suppliers = store.suppliers.map((s) => (s.id === entry.id ? entry : s));

      return entry;
    } catch (e) {
      store.error = e as Error;
      throw e;
    } finally {
      store.loading = false;
    }
  }

  async deleteSupplier(params: { id: string | number }) {
    const { id } = params;
    const store = this.getStore();
    store.loading = true;
    store.error = null;
    try {
      const allSuppliers = store.suppliers;
      const supplier = allSuppliers.find((s) => s.id === id);
      if (supplier && supplier.sync_id) {
        syncQueue.syncProvider({ provider: supplier, operation: 'delete' });
        await suppliersDb.delete({ syncId: supplier.sync_id });
      }

      store.suppliers = allSuppliers.filter((s) => s.id !== id);
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
      const all = (await suppliersDb.getAll()) as Supplier[];

      console.log(
        'suppliersController.listSuppliers - IndexedDB suppliers count:',
        all?.length || 0,
      );

      // If no suppliers in IndexedDB, check authentication before doing full sync
      if (!all || all.length === 0) {
        console.log(
          'suppliersController.listSuppliers - No suppliers in IndexedDB, checking auth...',
        );

        // Check if user has authentication token before attempting sync
        const { hasToken } = await import('@/services/tokenStorage');

        if (!hasToken()) {
          console.log('suppliersController.listSuppliers - No authentication token, skipping sync');
          store.suppliers = [];
          return [];
        }

        console.log('suppliersController.listSuppliers - Token found, fetching from backend...');
        try {
          const { syncService } = await import('@/services/syncService');
          console.log('suppliersController.listSuppliers - Calling fullSyncAndSave...');
          await syncService.fullSyncAndSave();
          console.log('suppliersController.listSuppliers - fullSyncAndSave completed');

          // Retry reading from IndexedDB after sync
          const allAfterSync = (await suppliersDb.getAll()) as Supplier[];
          console.log(
            'suppliersController.listSuppliers - Suppliers after sync:',
            allAfterSync?.length || 0,
          );
          store.suppliers = allAfterSync;
          return allAfterSync;
        } catch (syncError) {
          console.error('suppliersController.listSuppliers - Sync error:', syncError);
          // Continue with empty list on sync error
          store.suppliers = [];
          return [];
        }
      }

      const sorted = (all || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      console.log(
        'suppliersController.listSuppliers - Suppliers loaded:',
        sorted.map((s: Supplier) => ({
          id: s.id,
          sync_id: s.sync_id,
          serverId: s.serverId,
          name: s.name,
          productsCount: s.products?.length || 0,
          firstProduct: s.products?.[0]
            ? {
                id: s.products[0].id,
                sync_id: s.products[0].sync_id,
                name: s.products[0].name,
                price: s.products[0].price,
              }
            : null,
        })),
      );

      store.suppliers = sorted;
      return sorted;
    } catch (e) {
      store.error = e as Error;
      console.error('suppliersController.listSuppliers - Error:', e);
      throw e;
    } finally {
      store.loading = false;
    }
  }

  getSuppliers() {
    const store = this.getStore();
    // If the store exposes a ref, return its inner value (array); otherwise return as-is
    try {
      if (
        store &&
        store.suppliers &&
        typeof store.suppliers === 'object' &&
        'value' in store.suppliers
      ) {
        return (store.suppliers as any).value;
      }
    } catch {
      // fallback
    }
    return store.suppliers;
  }

  getLoading() {
    const store = this.getStore();
    return store.loading;
  }

  getError() {
    return null;
  }
}

const suppliersController = new SuppliersController();
export default suppliersController;
export { SuppliersController };
