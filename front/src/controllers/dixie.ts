class DixieController {
  private name: string;
  private storeName: string;

  constructor(opts: { name?: string; storeName?: string } = {}) {
    this.name = opts.name || 'ABOgazDB';
    this.storeName = opts.storeName || 'backups';
  }

  async openDB(): Promise<IDBDatabase> {
    const name = this.name;
    const storeName = this.storeName;

    // Open without version to obtain the existing DB (avoids DOMException due to higher version)
    const db = (await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    })) as IDBDatabase;

    // If the objectStore already exists, return the DB
    if (db.objectStoreNames.contains(storeName)) {
      return db;
    }

    // Si no existe, cerramos y reabrimos con una versión mayor para crear el store
    const newVersion = db.version + 1;
    db.close();

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, newVersion);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(storeName)) {
          d.createObjectStore(storeName, {
            keyPath: 'id',
            autoIncrement: true,
          });
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

  async addEntry(entry: unknown): Promise<IDBValidKey> {
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
        console.log('DixieController.addEntry: adding entry (shallow):', {
          keys: Object.keys((safeEntry as any) || {}),
        });
      } catch (e) {
        /* noop */
      }

      let req: IDBRequest;
      try {
        req = store.add(safeEntry);
      } catch (syncErr) {
        console.error(
          'DixieController.addEntry: synchronous error calling store.add',
          syncErr,
          { entryPreview: this.sanitizeForIndexedDB({ value: entry }) }
        );
        try {
          db.close();
        } catch (e) {
          /* noop */
        }
        reject(syncErr);
        return;
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
                ? this.sanitizeForIndexedDB(entry)
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
                ? this.sanitizeForIndexedDB(entry)
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
                ? this.sanitizeForIndexedDB(entry)
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

  async putEntry(entry: unknown): Promise<IDBValidKey> {
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
      const req = store.put(entry);
      req.onsuccess = () => {
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
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }
}

const dixieController = new DixieController();
export default dixieController;
export { DixieController };
