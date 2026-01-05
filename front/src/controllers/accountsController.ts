import { DixieController } from './dixie';

export type Account = {
  id?: IDBValidKey;
  name: string;
  initialBalance: number;
  createdAt?: number;
  updatedAt?: number;
};

class AccountsController {
  private getController(): DixieController {
    return new DixieController({ name: 'ABOgazDB', storeName: 'accounts' });
  }

  private async migrateFromSuppliers(): Promise<void> {
    try {
      const suppliersCtrl = new DixieController({
        name: 'ABOgazDB',
        storeName: 'suppliers',
      });
      const suppliers = (await suppliersCtrl.listBackups()) as any[];

      if (suppliers && suppliers.length > 0) {
        const accountsCtrl = this.getController();
        const existingAccounts = (await accountsCtrl.listBackups()) as any[];

        if (existingAccounts.length === 0) {
          for (const s of suppliers) {
            const accountEntry = {
              name: s.name,
              initialBalance: s.initialBalance ?? 0,
              createdAt: s.createdAt || Date.now(),
              updatedAt: s.updatedAt || Date.now(),
            };
            await accountsCtrl.addEntry({ entry: accountEntry });
          }
          console.log(`Migrated ${suppliers.length} suppliers to accounts`);
        }
      }
    } catch (_e) {
      // Migration is optional, ignore errors
    }
  }

  async addAccount(a: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) {
    const ctrl = this.getController();
    const now = Date.now();

    const clean = JSON.parse(JSON.stringify(a)) as any;

    const entry: Account = {
      ...clean,
      createdAt: now,
      updatedAt: now,
    };

    const id = await ctrl.addEntry({ entry });

    try {
      const mod = await import('../stores/accountsStore');
      const store = mod.useAccountsStore();
      await store.loadAll();
    } catch (_e) {
      /* ignore */
    }

    return { ...(entry as any), id } as Account;
  }

  async updateAccount(a: Account) {
    if (a.id == null) throw new Error('Account must have id to be updated');
    const ctrl = this.getController();

    const clean = JSON.parse(JSON.stringify(a)) as Account;

    const entry: Account = {
      ...clean,
      id: a.id,
      updatedAt: Date.now(),
    };

    await ctrl.putEntry({ entry });

    try {
      const mod = await import('../stores/accountsStore');
      const store = mod.useAccountsStore();
      await store.loadAll();
    } catch (_e) {
      /* ignore */
    }

    return entry;
  }

  async deleteAccount(id: IDBValidKey) {
    const ctrl = this.getController();
    await ctrl.deleteBackup(id);

    try {
      const mod = await import('../stores/accountsStore');
      const store = mod.useAccountsStore();
      await store.loadAll();
    } catch (_e) {
      /* ignore */
    }
  }

  async listAccounts() {
    const ctrl = this.getController();
    const all = (await ctrl.listBackups()) as Account[];
    const sorted = (all || [])
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    await this.migrateFromSuppliers();

    try {
      const mod = await import('../stores/accountsStore');
      const store = mod.useAccountsStore();
      store.accounts.splice(0, store.accounts.length, ...(sorted as any));
    } catch (e) {
      /* ignore */
    }

    return sorted;
  }
}

const accountsController = new AccountsController();
export default accountsController;
export { AccountsController };
