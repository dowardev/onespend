import { DixieController } from './dixie';
import { ref, computed, toRefs } from 'vue';

export type Account = {
  id?: IDBValidKey;
  name: string;
  initialBalance: number;
  createdAt?: number;
  updatedAt?: number;
};

class AccountsController {
  private accountsState = ref<Account[]>([]);
  private isLoading = ref(false);

  private getController(): DixieController {
    return new DixieController({ name: 'ABOgazDB', storeName: 'accounts' });
  }

  get accounts() {
    return this.accountsState.value;
  }

  getAccounts() {
    return this.accountsState.value;
  }

  getAccountsList() {
    return computed(() => [...this.accountsState.value]);
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

      if (suppliers && suppliers.length > 0) {
        if (this.accountsState.value.length === 0) {
          const newAccounts: Account[] = suppliers.map((s) => ({
            name: s.name,
            initialBalance: s.initialBalance ?? 0,
            createdAt: s.createdAt || Date.now(),
            updatedAt: s.updatedAt || Date.now(),
          }));
          this.accountsState.value = newAccounts;
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

      this.accountsState.value = sorted;
      return [...sorted];
    } catch (e) {
      console.error('accountsController.loadAll error', e);
      this.accountsState.value = [];
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
    this.accountsState.value.push(newAccount);

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

    const idx = this.accountsState.value.findIndex(acc => acc.id === a.id);
    if (idx >= 0) {
      const newAccounts = [...this.accountsState.value];
      newAccounts[idx] = entry;
      this.accountsState.value = newAccounts;
    }

    return entry;
  }

  async deleteAccount(id: IDBValidKey) {
    const ctrl = this.getController();
    await ctrl.deleteBackup(id);

    this.accountsState.value = this.accountsState.value.filter(acc => acc.id !== id);
  }
}

const accountsController = new AccountsController();
export default accountsController;
export { AccountsController };
