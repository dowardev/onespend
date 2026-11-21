// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { Account } from '@/stores/accountsStore';

export function getAccountName(params: {
  accountId: string | number | null | undefined;
  accounts: Account[];
}): string {
  const { accountId, accounts } = params;
  if (!accountId) return '';
  const account = accounts.find((a) => String(a.id) === String(accountId));
  return account?.name || '';
}

/**
 * LBDS-277: set an account's current balance through an adjustment entry.
 *
 * The current balance of an account is derived, never stored:
 *
 *   currentBalance = initialBalance + Σ ingresos − Σ egresos
 *
 * So "setting" a balance means creating a regular entry of that account for
 * the difference between the target and the current balance. The opening
 * balance (`initialBalance`) is never touched by this flow.
 */

export type BalanceAdjustmentEntryType = 'ingreso' | 'egreso';

export interface BalanceAdjustment {
  entryType: BalanceAdjustmentEntryType;
  amount: number;
}

/**
 * Minimal shape of an entry needed to compute an account balance.
 */
export interface BalanceEntryLike {
  amount?: number | null;
  entryType?: string | null;
  accountId?: string | number | null;
  groups?: Array<{ accountId?: string | number | null }> | null;
}

/**
 * Bucket the movements of the entries by account.
 *
 * Mirrors the bucketing the budget views use (`buildAccountsWithBalance` in
 * `InicioViewComponent.vue`): an entry counts for the account it points to and
 * once for every distinct account of its groups. Single pass over the
 * entries, so it stays cheap for a whole list of accounts.
 */
export function buildAccountTotals(
  entries: BalanceEntryLike[],
): Map<string, { ingresos: number; egresos: number }> {
  const totals = new Map<string, { ingresos: number; egresos: number }>();

  const add = (key: string, amount: number, entryType: string | null | undefined) => {
    const current = totals.get(key) || { ingresos: 0, egresos: 0 };
    if (entryType === 'ingreso') current.ingresos += amount;
    else current.egresos += amount;
    totals.set(key, current);
  };

  for (const entry of entries) {
    const amount = Number(entry.amount || 0);

    if (entry.accountId != null) {
      add(String(entry.accountId), amount, entry.entryType);
    }

    if (Array.isArray(entry.groups)) {
      const seen = new Set<string>();
      for (const group of entry.groups) {
        if (group.accountId == null) continue;
        const key = String(group.accountId);
        if (key === String(entry.accountId)) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        add(key, amount, entry.entryType);
      }
    }
  }

  return totals;
}

/**
 * Balance of every account, derived from the opening balance plus the
 * movements of its entries.
 *
 * The result is deliberately NOT rounded: it is the same raw value the views
 * show, so the baseline of an adjustment is the number the user sees. The
 * delta is the one that gets rounded to cents (`planBalanceAdjustment`).
 */
export function computeAccountsBalances(params: {
  accounts: Array<{ id?: string | number | null; initialBalance?: number | null }>;
  entries: BalanceEntryLike[];
}): Map<string, number> {
  const totals = buildAccountTotals(params.entries);
  const balances = new Map<string, number>();

  for (const account of params.accounts) {
    if (account.id == null) continue;
    const key = String(account.id);
    const totalsForAccount = totals.get(key) || { ingresos: 0, egresos: 0 };
    const initial = Number(account.initialBalance);
    const initialSafe = Number.isFinite(initial) ? initial : 0;
    balances.set(key, initialSafe + totalsForAccount.ingresos - totalsForAccount.egresos);
  }

  return balances;
}

/**
 * Derive the balance of a single account from its entries.
 *
 * Same derivation as `computeAccountsBalances`, for one account.
 */
export function computeAccountBalance(params: {
  initialBalance?: number | null;
  entries: BalanceEntryLike[];
  accountId: string | number | null | undefined;
}): number {
  const { accountId, entries } = params;
  if (accountId == null) return 0;

  const totals = buildAccountTotals(entries).get(String(accountId)) || { ingresos: 0, egresos: 0 };
  const initial = Number(params.initialBalance);
  const initialSafe = Number.isFinite(initial) ? initial : 0;

  return initialSafe + totals.ingresos - totals.egresos;
}

/**
 * Round to cents, half away from zero, without the classic float artefacts
 * (1.005 → 1.01, -1.005 → -1.01).
 */
export function roundAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const magnitude = Math.abs(value);
  const withEpsilon = magnitude + Number.EPSILON * magnitude;
  return (sign * Math.round(withEpsilon * 100)) / 100;
}

/**
 * Map the difference between the current and the target balance to the entry
 * that lands the balance exactly on the target.
 *
 * - Δ < 0 → egreso of |Δ| (the balance goes down)
 * - Δ > 0 → ingreso of Δ (the balance goes up)
 * - Δ == 0 → nothing to create (null)
 */
export function planBalanceAdjustment(params: {
  currentBalance: number;
  targetBalance: number;
}): BalanceAdjustment | null {
  const current = Number(params.currentBalance);
  const target = Number(params.targetBalance);

  if (!Number.isFinite(target)) return null;

  const currentSafe = Number.isFinite(current) ? current : 0;
  const delta = roundAmount(target - currentSafe);

  if (delta === 0) return null;

  return delta > 0
    ? { entryType: 'ingreso', amount: roundAmount(delta) }
    : { entryType: 'egreso', amount: roundAmount(Math.abs(delta)) };
}
