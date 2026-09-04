// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

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
  StatisticsConfigRow,
  BackupRow,
  PendingAttachmentRow,
  EntryCategoryRow,
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
  statisticsConfig!: Table<StatisticsConfigRow, number>
  backups!: Table<BackupRow, number>
  pendingAttachments!: Table<PendingAttachmentRow, number>
  entryCategories!: Table<EntryCategoryRow, string>

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
      statisticsConfig: '++id',
      backups: '++id, component, createdAt',
    })
    this.version(2).stores({
      pendingAttachments: '++id, syncId, entityType, timestamp',
    })
    this.version(3).stores({
      syncQueue: 'id, entityType, operation, retryCount, timestamp, nextRetryAt',
    })
    this.version(4).stores({
      accounts: 'sync_id, serverId, status',
      budgetEntries: 'sync_id, serverId, date, entryType, accountId, supplierId, status',
      budgetEntryGroups: '++id, sync_id, entrySyncId, accountId',
      budgetProviders: 'sync_id, serverId, date, accountId, supplierId, status',
      budgetProviderProducts: 'sync_id, serverId, providerSyncId, supplierProductId, status',
      suppliers: 'sync_id, serverId, status',
      supplierProducts: 'sync_id, serverId, supplierId, status',
      recurringRecords: 'sync_id, serverId, type, entryType, status, startDate',
      recurringRecordProducts: 'sync_id, recordSyncId, supplierProductId',
      syncQueue: 'id, entityType, operation, retryCount, timestamp, nextRetryAt',
      deadLetterQueue: '++id, entityType, operation, timestamp, errorCount',
      config: 'id',
      statisticsConfig: '++id',
      backups: '++id, component, createdAt',
      pendingAttachments: '++id, syncId, entityType, timestamp',
    })
    this.version(5).stores({
      entryCategories: 'id',
    })
  }
}

export const db = new OneSpendDB()
export default db

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__devDb = {
    countSyncQueue: (): Promise<number> => db.syncQueue.count(),
    getBudgetEntries: (): Promise<import('./types').BudgetEntryRow[]> => db.budgetEntries.toArray(),
    addConflict: async (params: {
      entityType: string
      sync_id: string
      client_data: Record<string, unknown>
      server_data?: Record<string, unknown>
    }): Promise<void> => {
      const { conflictResolutionService } = await import('@/services/sync/ConflictResolutionService')
      await conflictResolutionService.getStore().add({
        entityType: params.entityType,
        item: {
          sync_id: params.sync_id,
          client_data: params.client_data as import('../services/syncService').SyncItemData,
          server_data: params.server_data as import('../services/syncService').SyncItemData | undefined,
        },
      })
    },
    removeConflict: async (params: { entityType: string; sync_id: string }): Promise<void> => {
      const { conflictResolutionService } = await import('@/services/sync/ConflictResolutionService')
      await conflictResolutionService.getStore().remove(params)
    },
    clearConflicts: async (): Promise<void> => {
      const { conflictResolutionService } = await import('@/services/sync/ConflictResolutionService')
      await conflictResolutionService.getStore().clear()
    },
    getConflictCount: async (): Promise<number> => {
      const { conflictResolutionService } = await import('@/services/sync/ConflictResolutionService')
      return conflictResolutionService.getStore().getCount()
    },
  }
}
