import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { dataMediator } from '@/services/dataMediator';
import type { AccountRow } from '@/db/types';

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

function mapAccountRow(row: AccountRow): Account {
  return {
    id: row.sync_id,
    sync_id: row.sync_id,
    serverId: row.serverId ?? null,
    name: row.name,
    initialBalance: row.initialBalance,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    synced_at: row.syncedAt,
  };
}

export const useAccountsStore = defineStore('accounts', () => {
  const rawAccounts = dataMediator.refs.accounts;
  const loading = ref(false);

  const accounts = computed<Account[]>(() =>
    rawAccounts.value.map(mapAccountRow),
  );

  async function reload() {
    loading.value = true
    await dataMediator.reload('accounts')
    loading.value = false
  }

  return {
    accounts,
    loading,
    reload,
  };
});
