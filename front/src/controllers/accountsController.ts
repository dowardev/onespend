import { DixieController } from './dixie';
import { ref, computed } from 'vue';
import { useAccountsStore } from '@/stores/accountsStore';
import { useSync } from '@/composables/useSync';
import type { Account } from '@/stores/accountsStore';

export type { Account };

function generateSyncId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class AccountsController {
  private isLoading = ref(false);

  private getController(): DixieController {
    return new DixieController({ name: 'ABOgazDB', storeName: 'accounts' });
  }

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
      const suppliersCtrl = new DixieController({
        name: 'ABOgazDB',
        storeName: 'suppliers',
      });
      const suppliers = (await suppliersCtrl.listBackups()) as any[];
      const store = this.getAccountsStore();

      if (suppliers && suppliers.length > 0) {
        if (store.accounts.length === 0) {
          const newAccounts: Account[] = suppliers.map((s) => ({
            id: s.id || undefined,
            sync_id: generateSyncId(),
            name: s.name,
            initialBalance: s.initialBalance ?? 0,
            createdAt: s.createdAt || Date.now(),
            updatedAt: s.updatedAt || Date.now(),
          }));
          const copy = JSON.parse(JSON.stringify(newAccounts));
          store.accounts.splice(0, store.accounts.length, ...copy);
        }
      }
    } catch (_e) {
    }
  }

  async loadAll(): Promise<Account[]> {
    this.isLoading.value = true;
    try {
      const ctrl = this.getController();
      let all = (await ctrl.listBackups()) as Account[];
      
      for (const account of all) {
        if (!account.sync_id) {
          account.sync_id = generateSyncId();
          await ctrl.putEntry({ entry: account });
        }
      }

      const sorted = (all || [])
        .slice()
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      await this.migrateFromSuppliers();

      const store = this.getAccountsStore();
      const copy = JSON.parse(JSON.stringify(sorted));
      store.accounts.splice(0, store.accounts.length, ...copy);
      return [...copy];
    } catch (e) {
      console.error('accountsController.loadAll error', e);
      const store = this.getAccountsStore();
      store.accounts.splice(0, store.accounts.length);
      return [];
    } finally {
      this.isLoading.value = false;
    }
  }

  async addAccount(params: { a: Omit<Account, 'id' | 'sync_id' | 'createdAt' | 'updatedAt'> }) {
    const { a } = params;
    const ctrl = this.getController();
    const now = Date.now();

    const sync_id = generateSyncId();
    
    const entry: Account = {
      name: String(a.name),
      initialBalance: Number(a.initialBalance) || 0,
      sync_id,
      createdAt: now,
      updatedAt: now,
    };

    const { syncAccount } = useSync();
    syncAccount(entry, 'create');

    const id = await ctrl.addEntry({ entry });
    const newAccount: Account = {
      id,
      name: entry.name,
      initialBalance: entry.initialBalance,
      sync_id: entry.sync_id,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };

    const store = this.getAccountsStore() as any;
    store.accounts = [...store.accounts, newAccount];

    return newAccount;
  }

  async updateAccount(params: { a: Account }) {
    const { a } = params;
    if (a.id == null) throw new Error('Account must have id to be updated');
    const ctrl = this.getController();

    const entry: Account = {
      name: String(a.name),
      initialBalance: Number(a.initialBalance) || 0,
      id: a.id,
      sync_id: a.sync_id,
      createdAt: a.createdAt,
      updatedAt: Date.now(),
    };

    const { syncAccount } = useSync();
    syncAccount(entry, 'update');

    await ctrl.putEntry({ entry });

    const store = this.getAccountsStore() as any;
    const idx = store.accounts.findIndex((acc: any) => acc.id === a.id);
    if (idx >= 0) {
      store.accounts[idx] = {
        id: entry.id,
        name: entry.name,
        initialBalance: entry.initialBalance,
        sync_id: entry.sync_id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    }

    return entry;
  }

  async deleteAccount(params: { id: IDBValidKey }) {
    const { id } = params;
    const ctrl = this.getController();
    const store = this.getAccountsStore() as any;
    const account = store.accounts.find((acc: any) => acc.id === id);
    
    await ctrl.deleteBackup({ id });

    const idx = store.accounts.findIndex((acc: any) => acc.id === id);
    if (idx >= 0) {
      store.accounts.splice(idx, 1);
    }

    if (account) {
      const { syncAccount } = useSync();
      syncAccount(account, 'delete');
    }
  }
}

const accountsController = new AccountsController();
export default accountsController;
export { AccountsController };
