// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

export interface TransactionRow {
  id: string | number;
  date: string | Date;
  type: 'ingreso' | 'egreso';
  amount: number;
  createdAt: number;
  name: string;
}