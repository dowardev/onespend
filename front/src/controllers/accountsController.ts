import { DixieController } from './dixie';
import { ref, computed, toRefs } from 'vue';
import { useAccountsStore } from '@/stores/accountsStore';
import type { Account } from '@/stores/accountsStore';

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
            name: s.name,
            initialBalance: s.initialBalance ?? 0,
            createdAt: s.createdAt || Date.now(),
            updatedAt: s.updatedAt || Date.now(),
          }));
          store.accounts.splice(0, store.accounts.length, ...newAccounts);
          console.log(`Migrated ${suppliers.length} suppliers to accounts`);
        }
      }
    } catch (_e) {
      // Migration is optional, ignore errors
    }
  }

  async loadAll(): Promise<Account[]> {
    this.isLoading.value = true;
    try {
      const ctrl = this.getController();
      const all = (await ctrl.listBackups()) as Account[];
      const sorted = (all || [])
        .slice()
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      await this.migrateFromSuppliers();

      const store = this.getAccountsStore();
      store.accounts.splice(0, store.accounts.length, ...sorted);
      return [...sorted];
    } catch (e) {
      console.error('accountsController.loadAll error', e);
      const store = this.getAccountsStore();
      store.accounts.splice(0, store.accounts.length);
      return [];
    } finally {
      this.isLoading.value = false;
    }
  }

  async addAccount(a: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) {
    const ctrl = this.getController();
    const now = Date.now();

    const entry: Account = {
      name: String(a.name),
      initialBalance: Number(a.initialBalance) || 0,
      createdAt: now,
      updatedAt: now,
    };

    const id = await ctrl.addEntry({ entry });
    const newAccount: Account = { ...entry, id };

    const store = this.getAccountsStore();
    store.accounts.push(newAccount);

    return newAccount;
  }

  async updateAccount(a: Account) {
    if (a.id == null) throw new Error('Account must have id to be updated');
    const ctrl = this.getController();

    const entry: Account = {
      name: String(a.name),
      initialBalance: Number(a.initialBalance) || 0,
      id: a.id,
      createdAt: a.createdAt,
      updatedAt: Date.now(),
    };

    await ctrl.putEntry({ entry });

    const store = this.getAccountsStore();
    const idx = store.accounts.findIndex(acc => acc.id === a.id);
    if (idx >= 0) {
      store.accounts[idx] = entry;
    }

    return entry;
  }

  async deleteAccount(id: IDBValidKey) {
    const ctrl = this.getController();
    await ctrl.deleteBackup(id);

    const store = this.getAccountsStore();
    const idx = store.accounts.findIndex(acc => acc.id === id);
    if (idx >= 0) {
      store.accounts.splice(idx, 1);
    }
  }
}

const accountsController = new AccountsController();
export default accountsController;
export { AccountsController };
