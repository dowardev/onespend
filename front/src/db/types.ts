// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

export interface AccountRow {
  sync_id: string
  serverId?: number | null
  name: string
  initialBalance: number
  version?: number
  status?: string
  createdAt?: number
  updatedAt?: number
  syncedAt?: number
}

export interface BudgetEntryRow {
  sync_id: string
  serverId?: number | null
  name: string
  amount: number
  date: string
  paymentType?: string
  entryType: string
  accountId?: string | number | null
  supplierId?: string | number | null
  supplierName?: string
  category?: string
  // LBDS-275: notes field on budget entries. Was collected in the entry form
  // (EntryEditPage) but never declared on the row type nor preserved by
  // toBudgetEntryRow, so it disappeared the moment the row hit Dexie. Threaded
  // end-to-end with the matching back column (migration 2026_10_12_000000).
  notes?: string
  fromRecurringId?: string | null
  providerGroupId?: string | null
  providerName?: string
  version?: number
  status?: string
  isDayClosed?: boolean
  finishDayData?: unknown
  groups?: BudgetEntryGroupRow[]
  createdAt?: number
  updatedAt?: number
  syncedAt?: number
}

export interface BudgetEntryGroupRow {
  id?: number
  sync_id?: string
  entrySyncId?: string
  accountId?: string | number | null
  amount: number
}

export interface BudgetProviderRow {
  sync_id: string
  serverId?: number | null
  date: string
  name: string
  estimated?: number
  accountId?: string | number | null
  efectivo?: number
  tarjeta?: number
  credito?: number
  notes?: string
  visited?: boolean
  supplierId?: string | null
  supplierName?: string
  fromRecurringId?: string | null
  version?: number
  status?: string
  products?: BudgetProviderProductRow[]
  createdAt?: number
  updatedAt?: number
  syncedAt?: number
}

export interface BudgetProviderProductRow {
  sync_id: string
  serverId?: number | null
  providerSyncId?: string
  supplierProductId?: string | null
  productName: string
  productPrice: number
  quantity: number
  version?: number
  status?: string
  createdAt?: number
  updatedAt?: number
  syncedAt?: number
}

export interface SupplierRow {
  sync_id: string
  serverId?: number | null
  name: string
  version?: number
  status?: string
  createdAt?: number
  updatedAt?: number
  syncedAt?: number
  products?: Array<{
    sync_id: string
    serverId?: number | null
    supplierId: string
    name: string
    price: number
    imageBase64?: string | null
    imageUrl?: string | null
    status?: string
  }>
}

export interface SupplierProductRow {
  sync_id: string
  serverId?: number | null
  supplierId: string
  name: string
  price: number
  imageBase64?: string | null
  imageUrl?: string | null
  version?: number
  status?: string
  createdAt?: number
  updatedAt?: number
  syncedAt?: number
}

export interface RecurringRecordRow {
  sync_id: string
  serverId?: number | null
  type: string
  entryType: string
  name: string
  amount?: number
  accountId?: string | number | null
  repeatFrequency: string
  repeatInterval: number
  repeatDays?: number[]
  repeatMonthDay?: number
  repeatMonthWeekdayMode?: boolean
  repeatMonthWeekday?: number
  repeatMonthWeekdayOrdinal?: number
  repeatYearMonth?: number
  repeatYearDay?: number
  time?: string
  autoInsert: boolean
  startDate: string
  endDate?: string | null
  estimated?: number
  items?: unknown[]
  notes?: string
  version?: number
  status: string
  products?: RecurringRecordProductRow[]
  createdAt?: number
  updatedAt?: number
  syncedAt?: number
}

export interface RecurringRecordProductRow {
  sync_id: string
  recordSyncId?: string
  supplierProductId?: string | null
  productName: string
  productPrice: number
  quantity: number
}

export type SyncEntityType =
  | 'account'
  | 'budget_provider'
  | 'budget_provider_product'
  | 'budget_entry'
  | 'recurring_record'
  | 'recurring_record_product'
  | 'supplier'
  | 'supplier_product'
  // LBDS-280: routes attachment deletes through the same queue/retry/DLQ
  // machinery used by every other entity. Only the `delete` operation is
  // wired; uploads still travel through AttachmentController.
  | 'attachment'

export interface SyncQueueItem {
  id: string
  entityType: SyncEntityType
  operation: 'create' | 'update' | 'delete'
  data: Record<string, unknown>
  timestamp: number
  retryCount: number
  lastError?: string
  nextRetryAt?: number
}

export interface DeadLetterItem {
  id?: number
  entityType: SyncEntityType
  operation: 'create' | 'update' | 'delete'
  entityId: string
  data: Record<string, unknown>
  errorCount: number
  lastError: string
  createdAt: number
  failedAt: number
}

export interface ConfigRow {
  id: string
  value: unknown
}

export interface StatisticsConfigRow {
  id: number
  categoryKey: string
  name: string
  amount: number | null
}

export type IncomeStatementSection = 'incomes' | 'costOfLife' | 'discretionaryExpenses' | 'financialExpenses'

export interface EntryCategoryRow {
  id: string
  name: string
  createdAt?: number
  updatedAt?: number
}

// Mapping of Income Statement section -> category ids (device-local, configured
// in the Performance config panel). Sections are a Performance-page concept; a
// category belongs to at most ONE section (1:1 enforcement, see setSectionMap).
export interface IncomeStatementSectionMap {
  incomes: string[]
  costOfLife: string[]
  discretionaryExpenses: string[]
  financialExpenses: string[]
}

export interface BackupRow {
  id?: number
  component: string
  data: unknown
  createdAt: number
}

export interface PendingAttachmentRow {
  id?: number
  syncId: string
  entitySyncId: string
  entityType: string
  files: Array<{
    name: string
    type: string
    size: number
    data: string
  }>
  timestamp: number
}

// LBDS-280: local mirror of `attachments` for a given entity. Lets the
// client delete attachments offline (the queue carries the operation; this
// table is just the input the composable walks without making an HTTP call).
// A row flagged `pendingDelete` has its `operation: 'delete'` enqueued or
// in-flight; the composable hides it until the ack drains the queue.
export interface AttachmentRow {
  sync_id: string
  serverId?: number | null
  entitySyncId: string
  entityType: 'entries' | 'providers'
  name: string
  mimeType?: string
  size?: number
  downloadUrl?: string
  pendingDelete?: boolean
  createdAt?: number
  updatedAt?: number
  syncedAt?: number
}
