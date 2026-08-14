// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { db } from '@/db/OneSpendDB';

const LOCAL_STORAGE_KEYS = [
  'auth_token',
  'sync_queue',
  'last_sync',
  'dixie:lastError',
  'budget:selectedDate',
  'dexie_migration_completed',
  'onespend-sync-lock',
  'pending_attachments',
  'pending_attachments_dexie_migrated',
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
  const pendingItems = await db.table('syncQueue').count();
  if (pendingItems > 0) {
    const items = await db.table('syncQueue').toArray();
    try {
      localStorage.setItem('orphaned_sync_queue', JSON.stringify(items));
    } catch {
      console.warn('[dataClearService] localStorage quota exceeded, truncating');
      try {
        localStorage.setItem('orphaned_sync_queue', JSON.stringify(items.slice(0, 100)));
      } catch {
        console.warn('[dataClearService] localStorage still exceeded, skipping orphan storage');
      }
    }
  }
  await db.delete();
}

export const dataClearService = {
  clearAllUserData,
};
