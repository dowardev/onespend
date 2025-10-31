class DixieController {
  private name: string;
  private storeName: string;

  constructor(opts: { name?: string; storeName?: string } = {}) {
    this.name = opts.name || "ABOgazDB";
    this.storeName = opts.storeName || "backups";
  }

  async openDB(): Promise<IDBDatabase> {
    const name = this.name;
    const storeName = this.storeName;

    // Abrir sin versión para obtener la DB existente (evita DOMException por versión alta)
    const db = (await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    })) as IDBDatabase;

    // Si la objectStore ya existe, devolvemos la DB
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
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async putBackup(entry: any): Promise<IDBValidKey> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      try {
        console.log("DixieController.putBackup: adding entry (shallow):", {
          keys: Object.keys(entry || {}),
        });
      } catch (e) {
        /* noop */
      }
      const req = store.add(entry);
      req.onsuccess = () => {
        resolve(req.result);
      };
      req.onerror = (ev: any) => {
        console.error(
          "DixieController.putBackup: request.onerror",
          ev,
          req.error,
        );
        reject(req.error || ev);
      };
      tx.onerror = (ev: any) => {
        console.error(
          "DixieController.putBackup: transaction.onerror",
          ev,
          tx.error,
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
      const tx = db.transaction(this.storeName, "readonly");
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
        "DixieController.deleteBackup: called with id",
        id,
        "(type:",
        typeof id,
        ")",
      );
    } catch (e) {
      /* ignore */
    }
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const req = store.delete(id as any);
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
      const tx = db.transaction(this.storeName, "readonly");
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
