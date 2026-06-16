import Dexie, { type Table } from 'dexie'
import type {
  AccountRow,
  BudgetEntryRow,
  BudgetEntryGroupRow,
  BudgetProviderRow,
  BudgetProviderProductRow,
  SupplierRow,
  SupplierProductRow,
  RecurringRecordRow,
  RecurringRecordProductRow,
  SyncQueueItem,
  DeadLetterItem,
  ConfigRow,
  BudgetDaySnapshotRow,
  StatisticsConfigRow,
  BackupRow,
  PendingAttachmentRow,
} from './types'

class OneSpendDB extends Dexie {
  accounts!: Table<AccountRow, string>
  budgetEntries!: Table<BudgetEntryRow, string>
  budgetEntryGroups!: Table<BudgetEntryGroupRow, number>
  budgetProviders!: Table<BudgetProviderRow, string>
  budgetProviderProducts!: Table<BudgetProviderProductRow, string>
  suppliers!: Table<SupplierRow, string>
  supplierProducts!: Table<SupplierProductRow, string>
  recurringRecords!: Table<RecurringRecordRow, string>
  recurringRecordProducts!: Table<RecurringRecordProductRow, string>
  syncQueue!: Table<SyncQueueItem, string>
  deadLetterQueue!: Table<DeadLetterItem, number>
  config!: Table<ConfigRow, string>
  budgetDaySnapshots!: Table<BudgetDaySnapshotRow, string>
  statisticsConfig!: Table<StatisticsConfigRow, number>
  backups!: Table<BackupRow, number>
  pendingAttachments!: Table<PendingAttachmentRow, number>

  constructor() {
    super('OneSpendDB')
    this.version(1).stores({
      accounts: 'sync_id, serverId, status',
      budgetEntries: 'sync_id, serverId, date, entryType, accountId, supplierId, status',
      budgetEntryGroups: '++id, sync_id, entrySyncId, accountId',
      budgetProviders: 'sync_id, serverId, date, accountId, supplierId, status',
      budgetProviderProducts: 'sync_id, serverId, providerSyncId, supplierProductId, status',
      suppliers: 'sync_id, serverId, status',
      supplierProducts: 'sync_id, serverId, supplierId, status',
      recurringRecords: 'sync_id, serverId, type, entryType, status, startDate',
      recurringRecordProducts: 'sync_id, recordSyncId, supplierProductId',
      syncQueue: 'id, entityType, operation, retryCount, timestamp',
      deadLetterQueue: '++id, entityType, operation, timestamp, errorCount',
      config: 'id',
      budgetDaySnapshots: 'id',
      statisticsConfig: '++id',
      backups: '++id, component, createdAt',
    })
    this.version(2).stores({
      pendingAttachments: '++id, syncId, entityType, timestamp',
    })
    this.version(3).stores({
      syncQueue: 'id, entityType, operation, retryCount, timestamp, nextRetryAt',
    })
  }
}

export const db = new OneSpendDB()
export default db
