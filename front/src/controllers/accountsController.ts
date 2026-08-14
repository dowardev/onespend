// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { accountsDb } from '@/db/controllers/accountsDb';
import { suppliersDb } from '@/db/controllers/suppliersDb';
import { ref, computed } from 'vue';
import { useAccountsStore } from '@/stores/accountsStore';
import { syncQueue } from '@/services/syncQueue';
import type { Account } from '@/stores/accountsStore';
import type { AccountRow } from '@/db/types';
import type { Supplier } from './suppliersController';
import { generateSyncId } from '@/utils/generateSyncId';
import { db } from '@/db/OneSpendDB';

export type { Account };

class AccountsController {
  private isLoading = ref(false);

  getAccountsStore() {
    return useAccountsStore();
  }

  getAccounts() {
    return this.getAccountsStore().accounts;
  }

  getAccountsList() {
    const store = this.getAccountsStore();
    return computed(() => [...store.accounts]);
  }

  getIsLoading() {
    return this.isLoading;
  }

  private async migrateFromSuppliers(): Promise<void> {
    try {
      const suppliers = (await suppliersDb.getAll()) as Array<Supplier>;
      const existingCount = (await db.accounts.count());

      if (suppliers && suppliers.length > 0 && existingCount === 0) {
        const newAccounts: AccountRow[] = suppliers.map((s) => ({
          sync_id: generateSyncId(),
          name: s.name,
          initialBalance: (s as any).initialBalance ?? 0,
          createdAt: s.createdAt || Date.now(),
          updatedAt: s.updatedAt || Date.now(),
        }));
        await accountsDb.bulkPut({ entries: newAccounts });
      }
    } catch {}
  }

  async loadAll(): Promise<Account[]> {
    this.isLoading.value = true;
    try {
      const all = await accountsDb.getAll() as AccountRow[];

      for (const account of all) {
        if (!account.sync_id) {
          account.sync_id = generateSyncId();
          await accountsDb.put({ entry: account });
        }
      }

      await this.migrateFromSuppliers();

      return this.getAccountsStore().accounts;
    } catch (e) {
      console.error('accountsController.loadAll error', e);
      return [];
    } finally {
      this.isLoading.value = false;
    }
  }

  async addAccount(
    params: { account: Omit<Account, 'id' | 'sync_id' | 'createdAt' | 'updatedAt'> },
  ) {
    const { account } = params;
    if (!account) throw new Error('accountsController.addAccount: account is required');
    const now = Date.now();

    const sync_id = generateSyncId();

    const row: AccountRow = {
      sync_id,
      name: String(account.name || ''),
      initialBalance: Number(account.initialBalance) || 0,
      createdAt: now,
      updatedAt: now,
    };

    syncQueue.syncAccount({ account: { ...row, id: sync_id }, operation: 'create' });

    await accountsDb.add({ entry: row });

    return {
      id: sync_id,
      sync_id,
      name: row.name,
      initialBalance: row.initialBalance,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as Account;
  }

  async updateAccount(params: { account: Account }) {
    const { account } = params;
    if (account.id == null) throw new Error('Account must have id to be updated');

    const row: AccountRow = {
      sync_id: account.sync_id || String(account.id),
      serverId: account.serverId ?? null,
      name: String(account.name),
      initialBalance: Number(account.initialBalance) || 0,
      createdAt: account.createdAt,
      updatedAt: Date.now(),
    };

    syncQueue.syncAccount({ account: { ...row, id: row.sync_id }, operation: 'update' });

    await accountsDb.put({ entry: row });

    return {
      id: row.sync_id,
      sync_id: row.sync_id,
      name: row.name,
      initialBalance: row.initialBalance,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as Account;
  }

  async deleteAccount(params: { id: IDBValidKey }) {
    const { id } = params;
    const store = this.getAccountsStore();
    const account = store.accounts.find((acc: Account) => acc.id === id || acc.sync_id === String(id));

    if (account && account.sync_id) {
      syncQueue.syncAccount({ account, operation: 'delete' });
      await accountsDb.delete({ syncId: account.sync_id });
    }
  }
}

const accountsController = new AccountsController();
export default accountsController;
export { AccountsController };
