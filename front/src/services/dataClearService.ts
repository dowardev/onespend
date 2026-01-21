import { DixieController } from '@/controllers/dixie';

const DIXIE_DB_NAME = 'ABOgazDB';

const LOCAL_STORAGE_KEYS = [
  'auth_token',
  'sync_queue',
  'last_sync',
  'dixie:lastError',
  'budget:selectedDate',
];

export async function clearAllUserData(): Promise<void> {
  await clearLocalStorage();
  await clearIndexedDB();
}

async function clearLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') return;

  for (const key of LOCAL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove localStorage key: ${key}`, e);
    }
  }

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('auth_') || key.startsWith('sync_') || key.startsWith('budget:')) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove localStorage key: ${key}`, e);
      }
    }
  });
}

async function clearIndexedDB(): Promise<void> {
  if (typeof window === 'undefined') return;

  const stores = ['suppliers', 'accounts', 'templates', 'budget', 'backups', 'config'];

  for (const storeName of stores) {
    await clearStore(storeName);
  }
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();

    req.onsuccess = () => {
      console.log(`Cleared IndexedDB store: ${storeName}`);
      resolve();
    };

    req.onerror = () => {
      console.error(`Failed to clear IndexedDB store: ${storeName}`, req.error);
      reject(req.error);
    };

    tx.oncomplete = () => {
      try {
        db.close();
      } catch (e) {
        console.warn('Error closing database:', e);
      }
    };
  });
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DIXIE_DB_NAME);

    req.onsuccess = () => {
      resolve(req.result);
    };

    req.onerror = () => {
      reject(req.error);
    };
  });
}

export const dataClearService = {
  clearAllUserData,
};
