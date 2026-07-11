import { ref, type Ref } from 'vue'
import { liveQuery } from 'dexie'
import { db } from '@/db/OneSpendDB'
import type { AccountRow, BudgetEntryRow, BudgetProviderRow, SupplierRow } from '@/db/types'

type TableKey = 'accounts' | 'entries' | 'providers' | 'suppliers'

type TableRefs = {
  accounts: Ref<AccountRow[]>
  entries: Ref<BudgetEntryRow[]>
  providers: Ref<BudgetProviderRow[]>
  suppliers: Ref<SupplierRow[]>
}

class DataMediator {
  refs: TableRefs = {
    accounts: ref<AccountRow[]>([]),
    entries: ref<BudgetEntryRow[]>([]),
    providers: ref<BudgetProviderRow[]>([]),
    suppliers: ref<SupplierRow[]>([]),
  }

  private subscriptions = new Map<TableKey, () => void>()

  constructor() {
    this.setupSubscription('accounts',
      () => db.accounts.toArray(),
      this.refs.accounts,
    )
    this.setupSubscription('entries',
      () => db.budgetEntries.toArray(),
      this.refs.entries,
    )
    this.setupSubscription('providers',
      () => db.budgetProviders.toArray(),
      this.refs.providers,
    )
    this.setupSubscription('suppliers',
      () => db.suppliers.toArray(),
      this.refs.suppliers,
    )
  }

  private setupSubscription(key: TableKey, source: () => Promise<any[]>, target: Ref<any[]>) {
    const subscription = liveQuery(source).subscribe({
      next: (data) => {
        target.value = data
      },
      error: () => {},
    })
    this.subscriptions.set(key, () => subscription.unsubscribe())
  }

  async reloadAll() {
    const keys: TableKey[] = ['accounts', 'entries', 'providers', 'suppliers']
    await Promise.all(keys.map((key) => this.reload(key)))
  }

  async reload<K extends TableKey>(key: K) {
    const sourceMap: Record<TableKey, () => Promise<any[]>> = {
      accounts: () => db.accounts.toArray(),
      entries: () => db.budgetEntries.toArray(),
      providers: () => db.budgetProviders.toArray(),
      suppliers: () => db.suppliers.toArray(),
    }
    this.refs[key].value = (await sourceMap[key]()) as never
  }

  destroy() {
    this.subscriptions.forEach(unsub => unsub())
    this.subscriptions.clear()
  }
}

export const dataMediator = new DataMediator()
