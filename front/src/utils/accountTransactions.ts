// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { TransactionRow } from '@/types/account';

/**
 * Minimal shape of an entry needed to attribute it to an account.
 */
export interface AccountTransactionEntry {
  id: string | number;
  date: string | Date;
  entryType?: string | null;
  amount?: number | null;
  accountId?: string | number | null;
  groups?: Array<{ accountId?: string | number | null }> | null;
  name?: string | null;
  createdAt?: number | null;
}

/**
 * The movements of an account, with the same attribution the balance uses
 * (`buildAccountTotals` in `utils/accountBalance.ts`): an entry belongs to the
 * account it points to **and** to every account of its groups.
 *
 * Keeping both in sync matters: the running balance shown next to the
 * movements is computed from this list, so a list that misses the grouped
 * entries would not add up to the account's balance.
 */
export function accountTransactions(params: {
  entries: AccountTransactionEntry[];
  accountId: string | number | null | undefined;
}): TransactionRow[] {
  const { entries, accountId } = params;
  if (accountId == null) return [];

  const key = String(accountId);

  const attributed = entries.filter((entry) => {
    if (String(entry.accountId) === key) return true;
    if (!Array.isArray(entry.groups)) return false;
    return entry.groups.some((group) => group.accountId != null && String(group.accountId) === key);
  });

  return attributed
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      type: entry.entryType === 'ingreso' ? ('ingreso' as const) : ('egreso' as const),
      amount: Number(entry.amount) || 0,
      createdAt: Number(entry.createdAt) || 0,
      name: entry.name || '-',
    }))
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA;

      const createdA = a.createdAt || 0;
      const createdB = b.createdAt || 0;
      if (createdB !== createdA) return createdB - createdA;

      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
}

/**
 * Balance of an account from its attributed movements: the opening balance
 * plus the ingresos minus the egresos, in the same order the modal uses to
 * show the running balance.
 */
export function accountBalanceFromTransactions(params: {
  initialBalance?: number | null;
  transactions: TransactionRow[];
}): number {
  const initial = Number(params.initialBalance);
  const initialSafe = Number.isFinite(initial) ? initial : 0;

  const chronological = [...params.transactions].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

  let balance = initialSafe;
  for (const transaction of chronological) {
    balance += transaction.type === 'ingreso' ? transaction.amount : -transaction.amount;
  }

  return balance;
}
