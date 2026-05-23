import type { Account } from '@/stores/accountsStore'

export type AccountWithBalance = Account & { balance?: number }

export interface ProviderItem {
  amount: number | string
  accountId: string | number | null
}

export type EntryGroup = ProviderItem
