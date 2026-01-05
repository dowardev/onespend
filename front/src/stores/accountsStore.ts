import { defineStore } from 'pinia';
import accountsController, { Account } from '../controllers/accountsController';

export const useAccountsStore = defineStore('accounts', {
  state: () => ({
    accounts: [] as Account[],
  }),
  actions: {
    async loadAll() {
      try {
        const list =
          (await accountsController.listAccounts()) as unknown as any[];
        this.accounts.length = 0;
        for (const it of list) {
          (this.accounts as any).push(it);
        }
      } catch (e) {
        console.error('accountsStore.loadAll error', e);
        this.accounts.length = 0;
      }
    },

    async createAccount(data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) {
      try {
        await accountsController.addAccount(data);
        await this.loadAll();
      } catch (e) {
        console.error('accountsStore.createAccount error', e);
        throw e;
      }
    },

    async updateAccount(a: Account) {
      try {
        await accountsController.updateAccount(a);
        await this.loadAll();
      } catch (e) {
        console.error('accountsStore.updateAccount error', e);
        throw e;
      }
    },

    async deleteAccount(id: IDBValidKey) {
      try {
        await accountsController.deleteAccount(id);
        await this.loadAll();
      } catch (e) {
        console.error('accountsStore.deleteAccount error', e);
        throw e;
      }
    },
  },
});
