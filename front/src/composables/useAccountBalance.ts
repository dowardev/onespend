// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLocale } from '@/composables/useLocale';
import budgetEntriesController from '@/controllers/budgetEntriesController';
import { planBalanceAdjustment } from '@/utils/accountBalance';
import { formatLocalDate } from '@/utils/date';

/**
 * Applies a target balance to an account as an auditable adjustment entry.
 *
 * The account keeps its `initialBalance` untouched: the difference between the
 * current balance and the target is registered as a regular income or expense,
 * so it shows up in the history and syncs like any other movement.
 *
 * Shared by every screen that opens the account configuration modal, so the
 * balance behaves the same no matter where it was applied from.
 */
export function useAccountBalance() {
  const { t } = useLocale();

  /**
   * @returns `true` when a movement was created, `false` when the target
   * balance already matched the current one (nothing to adjust).
   */
  async function applyTargetBalance(params: {
    accountId: string | number;
    targetBalance: number;
    currentBalance: number;
  }): Promise<boolean> {
    const { accountId, targetBalance, currentBalance } = params;

    const plan = planBalanceAdjustment({ currentBalance, targetBalance });
    if (!plan) return false;

    const name = t('accounts.balanceAdjustment.entryName');
    const date = formatLocalDate({ d: new Date() });
    const entry = {
      name,
      amount: plan.amount,
      accountId,
      date,
      paymentType: 'cash' as const,
    };

    if (plan.entryType === 'ingreso') {
      await budgetEntriesController.addIngreso(entry);
    } else {
      await budgetEntriesController.addEgreso(entry);
    }

    return true;
  }

  return { applyTargetBalance };
}
