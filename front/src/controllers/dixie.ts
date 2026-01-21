class DixieController {
  private name: string;
  private storeName: string;

  constructor(opts: { name?: string; storeName?: string } = {}) {
    this.name = opts.name || 'ABOgazDB';
    this.storeName = opts.storeName || 'backups';
  }

  async openDB(): Promise<IDBDatabase> {
    const name = this.name;

    return new Promise((resolve, reject) => {
      // Try to open with a random delay to avoid race conditions
      const req = indexedDB.open(name);
      
      req.onupgradeneeded = (event) => {
        const d = (event.target as IDBOpenDBRequest).result;
        const allStores = ['suppliers', 'accounts', 'templates', 'budget', 'backups', 'config'];
        for (const store of allStores) {
          if (!d.objectStoreNames.contains(store)) {
            d.createObjectStore(store, {
              keyPath: 'id',
              autoIncrement: true,
            });
          }
        }
      };
      
      req.onsuccess = () => {
        const db = req.result;
        
        // Check if all stores exist
        const allStores = ['suppliers', 'accounts', 'templates', 'budget', 'backups', 'config'];
        const missingStores = allStores.filter(store => !db.objectStoreNames.contains(store));
        
        if (missingStores.length > 0) {
          // Stores are missing, need to upgrade
          db.close();
          
          // Get current version
          const getVersionReq = indexedDB.open(name);
          getVersionReq.onsuccess = () => {
            const currentDb = getVersionReq.result;
            const currentVersion = currentDb.version;
            currentDb.close();
            
            // Upgrade to new version
            const upgradeReq = indexedDB.open(name, currentVersion + 1);
            upgradeReq.onupgradeneeded = () => {
              const d = upgradeReq.result;
              for (const store of allStores) {
                if (!d.objectStoreNames.contains(store)) {
                  d.createObjectStore(store, {
                    keyPath: 'id',
                    autoIncrement: true,
                  });
                }
              }
            };
            upgradeReq.onsuccess = () => resolve(upgradeReq.result);
            upgradeReq.onerror = () => reject(upgradeReq.error);
          };
          getVersionReq.onerror = () => reject(getVersionReq.error);
        } else {
          resolve(db);
        }
      };
      
      req.onerror = () => reject(req.error);
    });
  }

  private getDBVersion(name: string): Promise<number | null> {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(name);
        req.onsuccess = () => {
          const version = req.result.version;
          req.result.close();
          resolve(version);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private async checkDBExists(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => {
        req.result.close();
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  }

  private async upgradeDB(name: string, storeName: string): Promise<IDBDatabase> {
    const currentVersion = await this.getDBVersion(name);
    const newVersion = (currentVersion || 1) + 1;
    
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, newVersion);
      req.onupgradeneeded = () => {
        const d = req.result;
        const allStores = ['suppliers', 'accounts', 'templates', 'budget', 'backups', 'config'];
        for (const store of allStores) {
          if (!d.objectStoreNames.contains(store)) {
            d.createObjectStore(store, {
              keyPath: 'id',
              autoIncrement: true,
            });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Recursively sanitize a value so it becomes safe to store in IndexedDB.
   * - Converts Date -> ISO string
   * - Removes functions and symbols
   * - Preserves primitives and arrays/objects (recursively)
   * - Detects cycles and replaces with the string "[Circular]"
   */
  private sanitizeForIndexedDB(params: {
    value: unknown;
    seen?: WeakMap<object, unknown>;
  }): unknown {
    const { value, seen = new WeakMap() } = params;
    try {
      if (value === null || value === undefined) return value;
      const t = typeof value;
      if (t === 'string' || t === 'number' || t === 'boolean') return value;
      if (t === 'function' || t === 'symbol') return undefined;
      if (value instanceof Date) return (value as Date).toISOString();
      if (Array.isArray(value)) {
        if (seen.has(value)) return '[Circular]';
        const out: any[] = [];
        seen.set(value, out);
        for (let i = 0; i < value.length; i++) {
          out.push(
            this.sanitizeForIndexedDB({ value: (value as any)[i], seen })
          );
        }
        return out;
      }
      if (t === 'object') {
        if (seen.has(value)) return '[Circular]';
        const out: Record<string, unknown> = {};
        seen.set(value, out);
        // Only iterate own enumerable string keys
        try {
          for (const k of Object.keys(value as object)) {
            try {
              const v = (value as any)[k];
              const sv = this.sanitizeForIndexedDB({ value: v, seen });
              if (sv !== undefined) out[k] = sv;
            } catch (_e) {
              /* skip problematic property */
            }
          }
        } catch (_e) {
          return String(value);
        }
        return out;
      }
      // Fallback: stringify
      return String(value);
    } catch (_e) {
      return undefined;
    }
  }

  async addEntry(params: { entry: unknown }): Promise<IDBValidKey> {
    const { entry } = params;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);

      // Attempt structuredClone if available, otherwise sanitize recursively
      let safeEntry: unknown = undefined;
      try {
        if (typeof (self as any)?.structuredClone === 'function') {
          try {
            safeEntry = (self as any).structuredClone(entry);
          } catch (_e) {
            // fallback to sanitizer below
            safeEntry = this.sanitizeForIndexedDB({ value: entry });
          }
        } else {
          safeEntry = this.sanitizeForIndexedDB({ value: entry });
        }
      } catch (_e) {
        safeEntry = this.sanitizeForIndexedDB({ value: entry });
      }

      try {
        // console.log('DixieController.addEntry: adding entry (shallow):', {
        //   keys: Object.keys((safeEntry as any) || {}),
        // });
      } catch (_e) {
        /* noop */
      }

      let req: IDBRequest;
      // Ensure we store a plain, extensible object and remove any existing 'id' so
      // the object store can generate a key when autoIncrement is enabled.
      let entryToStore: unknown;
      if (safeEntry && typeof safeEntry === 'object') {
        // Shallow copy into a plain object to avoid frozen/non-extensible objects
        entryToStore = Object.assign({}, safeEntry as any);
      } else {
        // Wrap primitives (number/string/boolean/null/undefined) so the object store
        // can insert a generated key into the stored value.
        entryToStore = { value: safeEntry };
      }
      try {
        if (
          entryToStore &&
          typeof entryToStore === 'object' &&
          Object.prototype.hasOwnProperty.call(entryToStore, 'id')
        ) {
          try {
            delete (entryToStore as any).id;
          } catch (_e) {
            /* noop */
          }
        }
      } catch (_e) {
        /* noop */
      }
      try {
        req = store.add(entryToStore);
      } catch (syncErr) {
        // If add throws synchronously, attempt put() as a fallback.
        console.warn(
          'DixieController.addEntry: store.add threw synchronously, trying store.put as fallback',
          syncErr
        );
        try {
          req = store.put(entryToStore);
        } catch (putSyncErr) {
          console.error(
            'DixieController.addEntry: both store.add and store.put failed synchronously',
            putSyncErr,
            { entryPreview: this.sanitizeForIndexedDB({ value: entry }) }
          );
          try {
            db.close();
          } catch (_e) {
            /* noop */
          }
          reject(putSyncErr);
          return;
        }
      }

      req.onsuccess = () => {
        resolve(req.result);
      };

      req.onerror = (ev: unknown) => {
        try {
          console.error('DixieController.addEntry: request.onerror', {
            event: ev,
            reqError: req.error,
            name: (req.error as any)?.name,
            message: (req.error as any)?.message,
          });
        } catch (e) {
          console.error(
            'DixieController.addEntry: request.onerror (fallback log)',
            ev,
            req.error
          );
        }
        // store last error for easier diagnosis
        try {
          const payload = {
            time: new Date().toISOString(),
            fn: 'addEntry',
            phase: 'request.onerror',
            error: {
              name: (req.error as any)?.name || 'UnknownError',
              message: (req.error as any)?.message || String(req.error || ev),
            },
            entryPreview:
              entry && typeof entry === 'object'
                ? this.sanitizeForIndexedDB({ value: entry })
                : String(entry),
          };
          localStorage.setItem('dixie:lastError', JSON.stringify(payload));
        } catch (_e) {
          /* noop */
        }
        reject(req.error || ev);
      };

      tx.onabort = (ev: unknown) => {
        try {
          console.error('DixieController.addEntry: transaction.onabort', {
            event: ev,
            txError: tx.error,
          });
        } catch (_e) {
          /* noop */
        }
        try {
          const payload = {
            time: new Date().toISOString(),
            fn: 'addEntry',
            phase: 'transaction.onabort',
            error: {
              name: (tx.error as any)?.name || 'UnknownError',
              message: (tx.error as any)?.message || String(tx.error || ev),
            },
            entryPreview:
              entry && typeof entry === 'object'
                ? this.sanitizeForIndexedDB({ value: entry })
                : String(entry),
          };
          localStorage.setItem('dixie:lastError', JSON.stringify(payload));
        } catch (_e) {
          /* noop */
        }
        reject(tx.error || ev);
      };

      tx.onerror = (ev: unknown) => {
        try {
          console.error('DixieController.addEntry: transaction.onerror', {
            event: ev,
            txError: tx.error,
          });
        } catch (_e) {
          /* noop */
        }
        try {
          const payload = {
            time: new Date().toISOString(),
            fn: 'addEntry',
            phase: 'transaction.onerror',
            error: {
              name: (tx.error as any)?.name || 'UnknownError',
              message: (tx.error as any)?.message || String(tx.error || ev),
            },
            entryPreview:
              entry && typeof entry === 'object'
                ? this.sanitizeForIndexedDB({ value: entry })
                : String(entry),
          };
          localStorage.setItem('dixie:lastError', JSON.stringify(payload));
        } catch (_e) {
          /* noop */
        }
        reject(tx.error || ev);
      };

      tx.oncomplete = () => {
        try {
          db.close();
        } catch (e) {
          /* noop */
        }
      };
    });
  }

  async putEntry(params: { entry: unknown }): Promise<IDBValidKey> {
    const { entry } = params;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      try {
        console.log('DixieController.putEntry: putting entry (shallow):', {
          keys: Object.keys(entry || {}),
        });
      } catch (e) {
        /* noop */
      }
      // Ensure we pass a plain, extensible object to put(). If the provided entry
      // is a primitive or a non-extensible object, wrap or shallow-copy it so
      // the object store can insert a generated key when necessary.
      let entryToPut: unknown;
      if (entry && typeof entry === 'object') {
        entryToPut = Object.assign({}, entry as any);
      } else {
        entryToPut = { value: entry };
      }
      
      const req = store.put(entryToPut);
      req.onsuccess = () => {
        if (this.storeName === 'suppliers' && entryToPut && typeof entryToPut === 'object') {
          const entryObj = entryToPut as any;
          if (entryObj.products && Array.isArray(entryObj.products)) {
            console.log('DixieController.putEntry - Supplier saved:', {
              id: entryObj.id,
              sync_id: entryObj.sync_id,
              name: entryObj.name,
              products: entryObj.products.map((p: any) => ({
                id: p.id,
                sync_id: p.sync_id,
                name: p.name,
                price: p.price
              }))
            });
          }
        }
        resolve(req.result);
      };
      req.onerror = (ev: unknown) => {
        console.error(
          'DixieController.putEntry: request.onerror',
          ev,
          req.error
        );
        reject(req.error || ev);
      };
      tx.onerror = (ev: unknown) => {
        console.error(
          'DixieController.putEntry: transaction.onerror',
          ev,
          tx.error
        );
        reject(tx.error || ev);
      };
      tx.oncomplete = () => {
        try {
          db.close();
        } catch (e) {
          /* noop */
        }
      };
    });
  }

  async getBackup(id: IDBValidKey) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(id as any);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async deleteBackup(id: IDBValidKey) {
    try {
      console.log(
        'DixieController.deleteBackup: called with id',
        id,
        '(type:',
        typeof id,
        ')'
      );
    } catch (e) {
      /* ignore */
    }
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(id as IDBValidKey);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => {
        try {
          db.close();
        } catch (e) {
          /* noop */
        }
      };
    });
  }

  async listBackups() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        if (this.storeName === 'suppliers') {
          console.log('DixieController.listBackups - Suppliers from IndexedDB:', req.result.map((s: any) => ({
            id: s.id,
            sync_id: s.sync_id,
            name: s.name,
            productsCount: s.products?.length || 0,
            firstProduct: s.products?.[0] ? {
              id: s.products[0].id,
              sync_id: s.products[0].sync_id,
              name: s.products[0].name,
              price: s.products[0].price
            } : null
          })));
        }
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async getConfig(key: string): Promise<unknown> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result as { id: string; value: unknown } | undefined;
        resolve(result?.value);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async getEntry(syncId: string): Promise<any | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result as any[];
        const found = results.find((entry) => entry.sync_id === syncId);
        resolve(found || null);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => {
        try {
          db.close();
        } catch (e) {
          /* noop */
        }
      };
    });
  }

  async setConfig(params: { key: string; value: unknown }): Promise<void> {
    const { key, value } = params;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const entry = { id: key, value };
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }
}

const dixieController = new DixieController();
const configController = new DixieController({
  name: 'ABOgazDB',
  storeName: 'config',
});
export default dixieController;
export { DixieController, configController };
