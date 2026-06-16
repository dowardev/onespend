import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { liveQuery } from 'dexie';
import { db } from '@/db/OneSpendDB';
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
  const rawAccounts = ref<AccountRow[]>([]);
  const loading = ref(true);

  const _subscription = liveQuery(() => db.accounts.toArray()).subscribe({
    next: (result) => {
      rawAccounts.value = result;
      loading.value = false;
    },
    error: () => {
      loading.value = false;
    },
  });

  const accounts = computed<Account[]>(() =>
    rawAccounts.value.map(mapAccountRow),
  );

  return {
    accounts,
    loading,
  };
});
