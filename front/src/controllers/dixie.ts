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

  async addEntry(entry: unknown): Promise<IDBValidKey> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      try {
        console.log('DixieController.addEntry: adding entry (shallow):', {
          keys: Object.keys(entry || {}),
        });
      } catch (e) {
        /* noop */
      }

      let req: IDBRequest;
      try {
        req = store.add(entry);
      } catch (syncErr) {
        console.error('DixieController.addEntry: synchronous error calling store.add', syncErr, { entry });
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
          console.error('DixieController.addEntry: request.onerror (fallback log)', ev, req.error);
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
            entryPreview: (entry && typeof entry === 'object') ? JSON.parse(JSON.stringify(entry, Object.keys(entry).slice(0,10))) : String(entry),
          };
          localStorage.setItem('dixie:lastError', JSON.stringify(payload));
        } catch (_e) {
          /* noop */
        }
        reject(req.error || ev);
      };

      tx.onabort = (ev: unknown) => {
        try {
          console.error('DixieController.addEntry: transaction.onabort', { event: ev, txError: tx.error });
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
            entryPreview: (entry && typeof entry === 'object') ? JSON.parse(JSON.stringify(entry, Object.keys(entry).slice(0,10))) : String(entry),
          };
          localStorage.setItem('dixie:lastError', JSON.stringify(payload));
        } catch (_e) {
          /* noop */
        }
        reject(tx.error || ev);
      };

      tx.onerror = (ev: unknown) => {
        try {
          console.error('DixieController.addEntry: transaction.onerror', { event: ev, txError: tx.error });
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
            entryPreview: (entry && typeof entry === 'object') ? JSON.parse(JSON.stringify(entry, Object.keys(entry).slice(0,10))) : String(entry),
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
        console.error('DixieController.putEntry: request.onerror', ev, req.error);
        reject(req.error || ev);
      };
      tx.onerror = (ev: unknown) => {
        console.error('DixieController.putEntry: transaction.onerror', ev, tx.error);
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
