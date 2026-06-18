import type { Account } from '@/stores/accountsStore'

export type AccountWithBalance = Account & {
  balance?: number;
  ingresos?: number;
  egresos?: number;
  hasTransactions?: boolean;
}

export interface ProviderItem {
  amount: number | string
  accountId: string | number | null
}

export type EntryGroup = ProviderItem
