import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import accountsController, { Account } from '../controllers/accountsController';

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = reactive<Account[]>([]);

  async function loadAll() {
    try {
      const list = await accountsController.loadAll();
      accounts.splice(0, accounts.length, ...list);
    } catch (e) {
      console.error('accountsStore.loadAll error', e);
      accounts.splice(0, accounts.length);
    }
  }

  async function createAccount(data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      await accountsController.addAccount(data);
      await loadAll();
    } catch (e) {
      console.error('accountsStore.createAccount error', e);
      throw e;
    }
  }

  async function updateAccount(a: Account) {
    try {
      await accountsController.updateAccount(a);
      await loadAll();
    } catch (e) {
      console.error('accountsStore.updateAccount error', e);
      throw e;
    }
  }

  async function deleteAccount(id: IDBValidKey) {
    try {
      await accountsController.deleteAccount(id);
      await loadAll();
    } catch (e) {
      console.error('accountsStore.deleteAccount error', e);
      throw e;
    }
  }

  return {
    accounts,
    loadAll,
    createAccount,
    updateAccount,
    deleteAccount,
  };
});
