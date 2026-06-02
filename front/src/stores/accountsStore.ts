import { defineStore } from 'pinia';
import { ref } from 'vue';
import dixieController from '@/controllers/dixie';
import { useSync } from '@/composables/useSync';

export type Account = {
  id?: string | number;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  initialBalance: number;
  createdAt?: number;
  updatedAt?: number;
  synced_at?: number;
  _synced?: boolean;
};

interface BackupRecord {
  id?: string;
  data?: {
    accounts?: Array<Account>;
  };
}

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([]);
  const { syncAccount } = useSync();

  async function loadAccounts() {
    try {
      const result = await dixieController.listBackups();
      const accountBackups = (result as Array<BackupRecord>).filter((b: BackupRecord) =>
        String(b.id).startsWith('account:'),
      );
      const loadedAccounts: Account[] = [];
      for (const backup of accountBackups) {
        if (backup.data && Array.isArray(backup.data.accounts)) {
          loadedAccounts.push(...backup.data.accounts);
        }
      }
      accounts.value.splice(0, accounts.value.length, ...loadedAccounts);
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
    accounts.value.push(newAccount);
    syncAccount(newAccount, 'create');
  }

  function updateAccount(params: { id: string | number; changes: Partial<Account> }) {
    const { id, changes } = params;
    const idx = accounts.value.findIndex((a) => a.id === id);
    if (idx === -1) return;
    const updated = { ...accounts[idx], ...changes, updatedAt: Date.now() };
    accounts.value.splice(idx, 1, updated);
    syncAccount(updated, 'update');
  }

  function removeAccount(params: { id: string | number }) {
    const { id } = params;
    const idx = accounts.value.findIndex((a) => a.id === id);
    if (idx === -1) return;
    const account = accounts[idx];
    accounts.value.splice(idx, 1);
    syncAccount(account, 'delete');
  }

  function upsertAccount(params: { account: Account }) {
    const { account } = params;
    const existing = accounts.value.find(
      (a) => String(a.id) === String(account.id) || a.sync_id === account.sync_id,
    );
    if (existing) {
      const idx = accounts.value.indexOf(existing);
      accounts.value.splice(idx, 1, account);
    } else {
      accounts.value.push(account);
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
