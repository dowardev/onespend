import { DixieController } from './dixie';
import { reactive, ref } from 'vue';
import { useSuppliersStore } from '../stores/suppliersStore';
import { useSync } from '@/composables/useSync';
import { syncService } from '@/services/syncService';

function generateSyncId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export type Product = {
  id?: string | number;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  price: number;
  imageBase64?: string | null;
  synced_at?: number;
};

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

  private getController(): DixieController {
    return new DixieController({ name: 'ABOgazDB', storeName: 'suppliers' });
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

      const ctrl = this.getController();
      const now = Date.now();

      // Safe clone function to handle non-cloneable objects
      const safeClone = (obj: any): any => {
        try {
          return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
        } catch (e) {
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

      const { syncProvider, syncSupplierProduct } = useSync();
      console.log('[suppliersController] useSync imported');

      if (!entry.sync_id) {
        entry.sync_id = generateSyncId();
      }

      console.log('[suppliersController] 🔵 Sincronizando proveedor:', entry.sync_id);

      // Sincronizar productos PRIMERO
      if (entry.products && entry.products.length > 0) {
        console.log('[suppliersController] 🔵 Sincronizando', entry.products.length, 'productos');
        entry.products = entry.products.map((product: Product) => {
          const tempProductSyncId = generateSyncId();
          console.log('[suppliersController] 🔵 syncSupplierProduct para:', product.name);
          try {
            syncSupplierProduct({
              product: {
                supplierId: entry.sync_id,
                ...product,
                sync_id: tempProductSyncId,
              },
              operation: 'create',
            });
            console.log('[suppliersController] ✅ syncSupplierProduct completado');
          } catch (prodSyncErr) {
            console.warn(
              '[suppliersController] syncSupplierProduct falló para',
              product.name,
              prodSyncErr,
            );
          }
          return {
            ...product,
            sync_id: tempProductSyncId,
          };
        });
        console.log('[suppliersController] Productos sincronizados:', entry.products.length);
      } else {
        console.log('[suppliersController] ⚠️ NO hay productos para sincronizar');
      }

      // Luego sincronizar el proveedor
      console.log('[suppliersController] 🔵 LLAMANDO syncProvider');
      try {
        syncProvider({ provider: entry }, 'create');
        console.log('[suppliersController] ✅ syncProvider ejecutado');
      } catch (syncErr) {
        console.warn('[suppliersController] syncProvider falló (se reintentará después):', syncErr);
      }

      const localId = await ctrl.addEntry({ entry });
      entry.id = typeof localId === 'number' ? localId : String(localId);
      const result = entry as Supplier;
      console.log('[suppliersController] Guardado en IndexedDB con localId:', localId);

      await ctrl.putEntry({ entry });

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
      const ctrl = this.getController();

      // Safe clone function to handle non-cloneable objects
      const safeClone = (obj: any): any => {
        try {
          return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
        } catch (e) {
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

      const { syncProvider, syncSupplierProduct } = useSync();
      // Ensure provider shape expected by useSync
      syncProvider({ provider: entry }, 'create');

      // Update products with sync_id before saving to IndexedDB
      if (entry.products && entry.products.length > 0) {
        entry.products = entry.products.map((product: Product) => {
          const tempProductSyncId = generateSyncId();
          syncSupplierProduct({
            product: {
              supplierId: entry.sync_id,
              ...product,
              sync_id: tempProductSyncId,
            },
            operation: 'create',
          });
          return {
            ...product,
            sync_id: tempProductSyncId,
          };
        });
      }

      await ctrl.putEntry({ entry });

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
      const ctrl = this.getController();
      const allSuppliers = store.suppliers;
      const supplier = allSuppliers.find((s) => s.id === id);
      await ctrl.deleteBackup({ id });

      store.suppliers = allSuppliers.filter((s) => s.id !== id);

      if (supplier) {
        const { syncProvider } = useSync();
        // Ensure provider is passed as an object with `provider` prop
        syncProvider({ provider: supplier }, 'delete');
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
          const allAfterSync = (await ctrl.listBackups()) as Supplier[];
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
    } catch (_e) {
      // fallback
    }
    return store.suppliers;
  }

  getLoading() {
    const store = this.getStore();
    return store.loading?.value ?? store.loading;
  }

  getError() {
    return null;
  }
}

const suppliersController = new SuppliersController();
export default suppliersController;
export { SuppliersController };
