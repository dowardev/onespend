// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  buildAccountTotals,
  computeAccountBalance,
  computeAccountsBalances,
  planBalanceAdjustment,
  roundAmount,
} from '../accountBalance';

describe('planBalanceAdjustment (LBDS-277)', () => {
  it('creates an egreso when the target balance is lower than the current one', () => {
    expect(planBalanceAdjustment({ currentBalance: 600, targetBalance: 300 })).toEqual({
      entryType: 'egreso',
      amount: 300,
    });
  });

  it('creates an ingreso when the target balance is higher than the current one', () => {
    expect(planBalanceAdjustment({ currentBalance: 600, targetBalance: 900 })).toEqual({
      entryType: 'ingreso',
      amount: 300,
    });
  });

  it('creates nothing when the target balance equals the current one', () => {
    expect(planBalanceAdjustment({ currentBalance: 600, targetBalance: 600 })).toBeNull();
  });

  it('creates nothing for a target that only differs below the cent', () => {
    expect(planBalanceAdjustment({ currentBalance: 600, targetBalance: 600.004 })).toBeNull();
    expect(planBalanceAdjustment({ currentBalance: 10, targetBalance: 10.004 })).toBeNull();
  });

  it('rounds the delta to two decimals and always keeps the amount positive', () => {
    expect(planBalanceAdjustment({ currentBalance: 0.1, targetBalance: 0.2 })).toEqual({
      entryType: 'ingreso',
      amount: 0.1,
    });

    expect(planBalanceAdjustment({ currentBalance: 0.2, targetBalance: 0.1 })).toEqual({
      entryType: 'egreso',
      amount: 0.1,
    });

    expect(planBalanceAdjustment({ currentBalance: 10, targetBalance: 10.005 })).toEqual({
      entryType: 'ingreso',
      amount: 0.01,
    });
  });

  it('handles a negative target balance as an egreso of the absolute delta', () => {
    expect(planBalanceAdjustment({ currentBalance: 600, targetBalance: -100 })).toEqual({
      entryType: 'egreso',
      amount: 700,
    });
  });

  it('treats a non numeric current balance as zero', () => {
    expect(planBalanceAdjustment({ currentBalance: Number.NaN, targetBalance: 250 })).toEqual({
      entryType: 'ingreso',
      amount: 250,
    });
  });

  it('creates nothing for a non numeric target balance', () => {
    expect(planBalanceAdjustment({ currentBalance: 600, targetBalance: Number.NaN })).toBeNull();
  });
});

describe('roundAmount', () => {
  it('rounds to two decimals', () => {
    expect(roundAmount(1.005)).toBe(1.01);
    expect(roundAmount(1.004)).toBe(1);
    expect(roundAmount(-1.005)).toBe(-1.01);
  });
});

describe('computeAccountBalance (LBDS-277)', () => {
  it('derives the balance from the opening balance plus the movements of the account', () => {
    const entries = [
      { entryType: 'ingreso', amount: 900, accountId: 'acc-1' },
      { entryType: 'egreso', amount: 300, accountId: 'acc-1' },
    ];

    expect(computeAccountBalance({ initialBalance: 0, entries, accountId: 'acc-1' })).toBe(600);
  });

  it('ignores the movements of other accounts', () => {
    const entries = [
      { entryType: 'ingreso', amount: 900, accountId: 'acc-2' },
      { entryType: 'egreso', amount: 300, accountId: 'acc-1' },
    ];

    expect(computeAccountBalance({ initialBalance: 100, entries, accountId: 'acc-1' })).toBe(-200);
  });

  it('counts an entry that reaches the account through a group', () => {
    const entries = [
      { entryType: 'ingreso', amount: 500, accountId: 'acc-2', groups: [{ accountId: 'acc-1' }] },
    ];

    expect(computeAccountBalance({ initialBalance: 0, entries, accountId: 'acc-1' })).toBe(500);
  });

  it('counts an entry only once when the account is both direct and in a group', () => {
    const entries = [
      {
        entryType: 'ingreso',
        amount: 500,
        accountId: 'acc-1',
        groups: [{ accountId: 'acc-1' }],
      },
    ];

    expect(computeAccountBalance({ initialBalance: 0, entries, accountId: 'acc-1' })).toBe(500);
  });

  it('lands exactly on the target balance after the adjustment entry is created', () => {
    const entries = [{ entryType: 'ingreso', amount: 600, accountId: 'acc-1' }];
    const current = computeAccountBalance({ initialBalance: 0, entries, accountId: 'acc-1' });

    const down = planBalanceAdjustment({ currentBalance: current, targetBalance: 300 });
    expect(down).toEqual({ entryType: 'egreso', amount: 300 });
    expect(
      computeAccountBalance({
        initialBalance: 0,
        entries: [...entries, { entryType: down!.entryType, amount: down!.amount, accountId: 'acc-1' }],
        accountId: 'acc-1',
      }),
    ).toBe(300);

    const up = planBalanceAdjustment({ currentBalance: current, targetBalance: 900 });
    expect(up).toEqual({ entryType: 'ingreso', amount: 300 });
    expect(
      computeAccountBalance({
        initialBalance: 0,
        entries: [...entries, { entryType: up!.entryType, amount: up!.amount, accountId: 'acc-1' }],
        accountId: 'acc-1',
      }),
    ).toBe(900);
  });

  it('returns zero for a missing account', () => {
    expect(computeAccountBalance({ initialBalance: 100, entries: [], accountId: null })).toBe(0);
  });

  it('returns the same unrounded value the views show', () => {
    const entries = [
      { entryType: 'ingreso', amount: 10.004, accountId: 'acc-1' },
      { entryType: 'egreso', amount: 0.001, accountId: 'acc-1' },
    ];

    // The views show `initialBalance + Σingresos − Σegresos` without rounding,
    // so the baseline of the adjustment must be that very number.
    const cardValue = 0 + 10.004 - 0.001;

    expect(computeAccountBalance({ initialBalance: 0, entries, accountId: 'acc-1' })).toBe(cardValue);
  });
});

describe('buildAccountTotals (LBDS-277)', () => {
  it('buckets the movements by account in a single pass', () => {
    const entries = [
      { entryType: 'ingreso', amount: 900, accountId: 'acc-1' },
      { entryType: 'egreso', amount: 300, accountId: 'acc-2' },
      { entryType: 'ingreso', amount: 500, accountId: null, groups: [{ accountId: 'acc-1' }] },
    ];

    const totals = buildAccountTotals(entries);

    expect(totals.get('acc-1')).toEqual({ ingresos: 1400, egresos: 0 });
    expect(totals.get('acc-2')).toEqual({ ingresos: 0, egresos: 300 });
  });

  it('counts an entry only once per account', () => {
    const entries = [
      {
        entryType: 'ingreso',
        amount: 500,
        accountId: 'acc-1',
        groups: [{ accountId: 'acc-1' }, { accountId: 'acc-1' }],
      },
    ];

    expect(buildAccountTotals(entries).get('acc-1')).toEqual({ ingresos: 500, egresos: 0 });
  });
});

describe('computeAccountsBalances (LBDS-277)', () => {
  it('derives the balance of every account from the opening balance and its movements', () => {
    const accounts = [
      { id: 'acc-1', initialBalance: 100 },
      { id: 'acc-2', initialBalance: 0 },
    ];
    const entries = [
      { entryType: 'ingreso', amount: 900, accountId: 'acc-1' },
      { entryType: 'egreso', amount: 300, accountId: 'acc-1' },
    ];

    const balances = computeAccountsBalances({ accounts, entries });

    expect(balances.get('acc-1')).toBe(700);
    expect(balances.get('acc-2')).toBe(0);
  });

  it('lands exactly on the target balance after the adjustment entry is created', () => {
    const accounts = [{ id: 'acc-1', initialBalance: 0 }];
    const entries = [
      { entryType: 'ingreso', amount: 900, accountId: 'acc-1' },
      { entryType: 'egreso', amount: 300, accountId: 'acc-1' },
    ];

    const current = computeAccountsBalances({ accounts, entries }).get('acc-1')!;
    expect(current).toBe(600);

    const down = planBalanceAdjustment({ currentBalance: current, targetBalance: 300 });
    expect(down).toEqual({ entryType: 'egreso', amount: 300 });
    expect(
      computeAccountsBalances({
        accounts,
        entries: [...entries, { entryType: down!.entryType, amount: down!.amount, accountId: 'acc-1' }],
      }).get('acc-1'),
    ).toBe(300);

    const up = planBalanceAdjustment({ currentBalance: current, targetBalance: 900 });
    expect(up).toEqual({ entryType: 'ingreso', amount: 300 });
    expect(
      computeAccountsBalances({
        accounts,
        entries: [...entries, { entryType: up!.entryType, amount: up!.amount, accountId: 'acc-1' }],
      }).get('acc-1'),
    ).toBe(900);
  });
});
