import { defineStore } from 'pinia';
import { reactive } from 'vue';
import dixieController from '@/controllers/dixie';
import { useSync } from '@/composables/useSync';

export type Account = {
  id?: IDBValidKey;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  initialBalance: number;
  createdAt?: number;
  updatedAt?: number;
  synced_at?: number;
  _synced?: boolean;
};

export const useAccountsStore = defineStore('accounts', () => {
  const accounts: Account[] = reactive([]);
  const { syncAccount } = useSync();

  async function loadAccounts() {
    try {
      const result = await dixieController.listBackups();
      const accountBackups = (result as any[]).filter((b: any) => String(b.id).startsWith('account:'));
      const loadedAccounts: Account[] = [];
      for (const backup of accountBackups) {
        if (backup.data && Array.isArray(backup.data.accounts)) {
          loadedAccounts.push(...backup.data.accounts);
        }
      }
      accounts.splice(0, accounts.length, ...loadedAccounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  }

  async function addAccount(params: { account: Omit<Account, 'id'> }) {
    const { account } = params;
    const newAccount: Account = {
      ...account,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    accounts.push(newAccount);
    syncAccount(newAccount, 'create');
  }

  function updateAccount(params: { id: IDBValidKey; changes: Partial<Account> }) {
    const { id, changes } = params;
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1) return;
    const updated = { ...accounts[idx], ...changes, updatedAt: Date.now() };
    accounts.splice(idx, 1, updated);
    syncAccount(updated, 'update');
  }

  function removeAccount(params: { id: IDBValidKey }) {
    const { id } = params;
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1) return;
    const account = accounts[idx];
    accounts.splice(idx, 1);
    syncAccount(account, 'delete');
  }

  function upsertAccount(params: { account: Account }) {
    const { account } = params;
    const existing = accounts.find(a => String(a.id) === String(account.id) || a.sync_id === account.sync_id);
    if (existing) {
      const idx = accounts.indexOf(existing);
      accounts.splice(idx, 1, account);
    } else {
      accounts.push(account);
    }
  }

  return {
    accounts,
    loadAccounts,
    addAccount,
    updateAccount,
    removeAccount,
    upsertAccount,
  };
});
