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
        const allStores = ['suppliers', 'accounts', 'templates', 'budget', 'backups', 'config'];
        const missingStores = allStores.filter(store => !db.objectStoreNames.contains(store));
        
        if (missingStores.length > 0) {
          db.close();
          const getVersionReq = indexedDB.open(name);
          getVersionReq.onsuccess = () => {
            const currentDb = getVersionReq.result;
            const currentVersion = currentDb.version;
            currentDb.close();
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

  private getDBVersion(params: { name: string }): Promise<number | null> {
    const { name } = params;
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

  private async checkDBExists(params: { name: string }): Promise<boolean> {
    const { name } = params;
    return new Promise((resolve) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => {
        req.result.close();
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  }

  private async upgradeDB(params: { name: string; storeName: string }): Promise<IDBDatabase> {
    const { name, storeName } = params;
    const currentVersion = await this.getDBVersion({ name });
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
        const out: unknown[] = [];
        seen.set(value, out);
        for (let i = 0; i < value.length; i++) {
          out.push(
            this.sanitizeForIndexedDB({ value: value[i], seen })
          );
        }
        return out;
      }
      if (t === 'object') {
        if (seen.has(value)) return '[Circular]';
        const out: Record<string, unknown> = {};
        seen.set(value, out);
        for (const k of Object.keys(value as Record<string, unknown>)) {
            try {
              const v = (value as Record<string, unknown>)[k];
              const sv = this.sanitizeForIndexedDB({ value: v, seen });
              if (sv !== undefined) out[k] = sv;
            } catch (_e) {
            }
          }
        return out;
      }
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

      let safeEntry: unknown = undefined;
      try {
        if (typeof self.structuredClone === 'function') {
          try {
            safeEntry = self.structuredClone(entry);
          } catch (_e) {
            safeEntry = this.sanitizeForIndexedDB({ value: entry });
          }
        } else {
          safeEntry = this.sanitizeForIndexedDB({ value: entry });
        }
      } catch (_e) {
        safeEntry = this.sanitizeForIndexedDB({ value: entry });
      }

      let req: IDBRequest;
      let entryToStore: unknown;
      if (safeEntry && typeof safeEntry === 'object') {
        entryToStore = Object.assign({}, safeEntry as Record<string, unknown>);
      } else {
        entryToStore = { value: safeEntry };
      }
      try {
        if (
          entryToStore &&
          typeof entryToStore === 'object' &&
          Object.prototype.hasOwnProperty.call(entryToStore, 'id')
        ) {
          try {
            delete (entryToStore as Record<string, unknown>).id;
          } catch (_e) {
          }
        }
      } catch (_e) {
      }
      try {
        req = store.add(entryToStore);
      } catch (syncErr) {
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
            name: (req.error as Error)?.name,
            message: (req.error as Error)?.message,
          });
        } catch (e) {
          console.error(
            'DixieController.addEntry: request.onerror (fallback log)',
            ev,
            req.error
          );
        }
        try {
          const payload = {
            time: new Date().toISOString(),
            fn: 'addEntry',
            phase: 'request.onerror',
             error: {
               name: (req.error as Error)?.name || 'UnknownError',
               message: (req.error as Error)?.message || String(req.error || ev),
             },
            entryPreview:
              entry && typeof entry === 'object'
                ? this.sanitizeForIndexedDB({ value: entry })
                : String(entry),
          };
          localStorage.setItem('dixie:lastError', JSON.stringify(payload));
        } catch (_e) {
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
        }
        try {
          const payload = {
            time: new Date().toISOString(),
            fn: 'addEntry',
            phase: 'transaction.onabort',
            error: {
              name: (tx.error as Error)?.name || 'UnknownError',
              message: (tx.error as Error)?.message || String(tx.error || ev),
            },
            entryPreview:
              entry && typeof entry === 'object'
                ? this.sanitizeForIndexedDB({ value: entry })
                : String(entry),
          };
          localStorage.setItem('dixie:lastError', JSON.stringify(payload));
        } catch (_e) {
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
        }
        try {
          const payload = {
            time: new Date().toISOString(),
            fn: 'addEntry',
            phase: 'transaction.onerror',
            error: {
              name: (tx.error as Error)?.name || 'UnknownError',
              message: (tx.error as Error)?.message || String(tx.error || ev),
            },
            entryPreview:
              entry && typeof entry === 'object'
                ? this.sanitizeForIndexedDB({ value: entry })
                : String(entry),
          };
          localStorage.setItem('dixie:lastError', JSON.stringify(payload));
        } catch (_e) {
        }
        reject(tx.error || ev);
      };

      tx.oncomplete = () => {
        try {
          db.close();
        } catch (e) {
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
      let entryToPut: unknown;
      if (entry && typeof entry === 'object') {
        entryToPut = Object.assign({}, entry);
      } else {
        entryToPut = { value: entry };
      }
      
      const req = store.put(entryToPut);
      req.onsuccess = () => resolve(req.result);
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
        }
      };
    });
  }

  async getBackup(params: { id: IDBValidKey }) {
    const { id } = params;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(id as IDBValidKey);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async deleteBackup(params: { id: IDBValidKey }) {
    const { id } = params;
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
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async getConfig(params: { key: string }): Promise<unknown> {
    const { key } = params;
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

  async getEntry(params: { syncId: string }): Promise<unknown | null> {
    const { syncId } = params;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result as Array<Record<string, unknown>>;
        const found = results.find((entry) => entry.sync_id === syncId);
        resolve(found || null);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => {
        try {
          db.close();
        } catch (e) {
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
