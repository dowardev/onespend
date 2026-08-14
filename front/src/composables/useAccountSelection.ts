// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { computed, ref, type Ref } from 'vue';
import accountsController from '@/controllers/accountsController';
import type { Account } from '@/controllers/accountsController';

export function useAccountSelection(params: {
  items: Ref<Array<{ accountId: string | number | { id: string | number } | null }>>;
  getAccountId: (params: { accountId: unknown }) => string | number | null;
}) {
  const { items, getAccountId } = params;

  const selectedIndex = ref<number | null>(null);
  const searchQuery = ref('');

  const accounts = computed(() => {
    const list = accountsController.getAccounts();
    if (!list || !Array.isArray(list)) return [];
    return list.filter((acc: any) => acc != null && acc.id != null) as Account[];
  });

  const selectedAccountIds = computed(() => {
    const skipIndex = selectedIndex.value;
    return new Set(
      items.value
        .filter((_, i) => i !== skipIndex)
        .map((item) => getAccountId({ accountId: item.accountId }))
        .filter((id): id is string | number => id !== null),
    );
  });

  const availableAccountsForItem = (currentIndex: number) => {
    const usedAccountIds = items.value
      .filter((_, idx) => idx !== currentIndex)
      .map((item) => String(getAccountId({ accountId: item.accountId })))
      .filter((id) => id !== 'null' && id !== 'undefined' && id !== '');
    return accounts.value.filter((acc: any) => !usedAccountIds.includes(String(acc.id)));
  };

  const sortedAccounts = computed(() => {
    const query = searchQuery.value?.toLowerCase() || '';
    const available: Account[] = [];
    const selected: Account[] = [];
    for (const acc of accounts.value) {
      if (query && !(acc as any).name?.toLowerCase().includes(query)) continue;
      if (selectedAccountIds.value.has((acc as any).id)) {
        selected.push(acc);
      } else {
        available.push(acc);
      }
    }
    return { available, selected };
  });

  function getDefaultAccountId(): string | number | null {
    if (accounts.value.length === 0) return null;
    return (accounts.value[0] as any).id;
  }

  return {
    accounts,
    selectedIndex,
    searchQuery,
    selectedAccountIds,
    sortedAccounts,
    availableAccountsForItem,
    getDefaultAccountId,
  };
}
