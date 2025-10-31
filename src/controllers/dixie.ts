// Pequeño wrapper para IndexedDB llamado 'dixie' (local al proyecto)
// Provee funciones mínimas para almacenar respaldos.

export async function openDB(): Promise<IDBDatabase> {
  const name = "ABOgazDB";
  const storeName = "backups";

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
        d.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putBackup(entry: any): Promise<IDBValidKey> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("backups", "readwrite");
    const store = tx.objectStore("backups");
    try {
      console.log("dixie.putBackup: adding entry (shallow):", {
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
      console.error("dixie.putBackup: request.onerror", ev, req.error);
      reject(req.error || ev);
    };
    tx.onerror = (ev: any) => {
      console.error("dixie.putBackup: transaction.onerror", ev, tx.error);
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

export async function getBackup(id: IDBValidKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("backups", "readonly");
    const store = tx.objectStore("backups");
    const req = store.get(id as any);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function deleteBackup(id: IDBValidKey) {
  try {
    console.log("dixie.deleteBackup: called with id", id, "(type:", typeof id, ")");
  } catch (e) {
    /* ignore */
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("backups", "readwrite");
    const store = tx.objectStore("backups");
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

export async function listBackups() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("backups", "readonly");
    const store = tx.objectStore("backups");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
