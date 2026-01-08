import { defineStore } from 'pinia';
import { reactive } from 'vue';

export type Account = {
  id?: IDBValidKey;
  name: string;
  initialBalance: number;
  createdAt?: number;
  updatedAt?: number;
};

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = reactive<Account[]>([]);

  return {
    accounts,
  };
});
