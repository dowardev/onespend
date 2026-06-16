import { db } from './OneSpendDB'
import type {
  AccountRow,
  BudgetProviderProductRow,
  SupplierRow,
  SupplierProductRow,
  RecurringRecordRow,
  SyncQueueItem,
  ConfigRow,
  BudgetDaySnapshotRow,
  BackupRow,
} from './types'

const OLD_DB_NAME = 'ABOgazDB'
const MIGRATION_KEY = 'dexie_migration_completed'

interface LegacyRecord {
  id?: IDBValidKey
  [key: string]: unknown
}

function openOldDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OLD_DB_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getAllFromStore(db: IDBDatabase, storeName: string): Promise<LegacyRecord[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([])
      return
    }
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

async function migrateBackupsStore(oldDb: IDBDatabase) {
  const records = await getAllFromStore(oldDb, 'backups')
  const budgetDaySnapshots: BudgetDaySnapshotRow[] = []
  const budgetProviderProducts: BudgetProviderProductRow[] = []
  const budgetEntryGroupRows: Array<{ id?: number; sync_id?: string; entrySyncId?: string; accountId?: string | number | null; amount: number }> = []
  const accounts: AccountRow[] = []
  const backups: BackupRow[] = []

  for (const rec of records) {
    const id = String(rec.id || '')
    if (id.startsWith('budget:')) {
      const data = rec.data as { entries?: unknown[]; proveedores?: unknown[]; isDayClosed?: boolean; finishDayData?: unknown }
      budgetDaySnapshots.push({
        id,
        data: {
          entries: data?.entries || [],
          proveedores: data?.proveedores || [],
          isDayClosed: data?.isDayClosed,
          finishDayData: data?.finishDayData,
        },
      })
    } else if (id.startsWith('providerProduct:')) {
      const entry = rec as unknown as BudgetProviderProductRow
      if (entry.sync_id) {
        budgetProviderProducts.push(entry)
      }
    } else if (id.startsWith('entryGroup:')) {
      const entry = rec as unknown as { sync_id?: string; entryId?: string | number; accountId?: string | number | null; amount: number }
      if (entry.sync_id || entry.entryId) {
        budgetEntryGroupRows.push({
          sync_id: entry.sync_id,
          entrySyncId: String(entry.entryId || ''),
          accountId: entry.accountId,
          amount: entry.amount || 0,
        })
      }
    } else if (id.startsWith('account:')) {
      const wrapper = rec as { data?: { accounts?: AccountRow[] } }
      if (wrapper.data?.accounts) {
        for (const acc of wrapper.data.accounts) {
          if (acc.sync_id) accounts.push(acc)
        }
      }
    } else if (rec.component) {
      backups.push({
        component: String(rec.component),
        data: rec.data,
        createdAt: (rec.createdAt as number) || Date.now(),
      })
    } else {
      backups.push({
        component: 'generic',
        data: rec,
        createdAt: Date.now(),
      })
    }
  }

  if (budgetDaySnapshots.length > 0) await db.budgetDaySnapshots.bulkPut(budgetDaySnapshots)
  if (budgetProviderProducts.length > 0) await db.budgetProviderProducts.bulkPut(budgetProviderProducts)
  if (budgetEntryGroupRows.length > 0) await db.budgetEntryGroups.bulkAdd(budgetEntryGroupRows)
  if (accounts.length > 0) await db.accounts.bulkPut(accounts)
  if (backups.length > 0) await db.backups.bulkAdd(backups)
}

async function migrateBudgetStore(oldDb: IDBDatabase) {
  const records = await getAllFromStore(oldDb, 'budget')
  const snapshots: BudgetDaySnapshotRow[] = []

  for (const rec of records) {
    const id = String(rec.id || '')
    if (id.startsWith('budget:')) {
      const data = rec.data as { entries?: unknown[]; proveedores?: unknown[]; isDayClosed?: boolean; finishDayData?: unknown }
      snapshots.push({
        id,
        data: {
          entries: data?.entries || [],
          proveedores: data?.proveedores || [],
          isDayClosed: data?.isDayClosed,
          finishDayData: data?.finishDayData,
        },
      })
    }
  }

  if (snapshots.length > 0) await db.budgetDaySnapshots.bulkPut(snapshots)
}

async function migrateSuppliersStore(oldDb: IDBDatabase) {
  const records = await getAllFromStore(oldDb, 'suppliers')
  const suppliers: SupplierRow[] = []
  const products: SupplierProductRow[] = []

  for (const rec of records) {
    const hasSupplierId = rec.supplierId !== undefined && rec.supplierId !== null
    const hasName = rec.name !== undefined
    const hasProducts = Array.isArray(rec.products)

    if (hasSupplierId && !hasProducts) {
      const s = rec as unknown as SupplierProductRow
      if (s.sync_id || s.name) {
        products.push({
          sync_id: s.sync_id || String(rec.id || ''),
          serverId: s.serverId,
          supplierId: String(s.supplierId),
          name: s.name || '',
          price: s.price || 0,
          imageBase64: s.imageBase64,
          status: s.status,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          syncedAt: s.syncedAt,
        })
      }
    } else if (hasName) {
      const s = rec as unknown as SupplierRow & { products?: unknown[] }
      if (s.sync_id) {
        suppliers.push({
          sync_id: s.sync_id,
          serverId: s.serverId,
          name: s.name || '',
          status: s.status,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          syncedAt: s.syncedAt,
        })
      }
    }
  }

  if (suppliers.length > 0) await db.suppliers.bulkPut(suppliers)
  if (products.length > 0) await db.supplierProducts.bulkPut(products)
}

async function migrateAccountsStore(oldDb: IDBDatabase) {
  const records = await getAllFromStore(oldDb, 'accounts')
  const accounts: AccountRow[] = []

  for (const rec of records) {
    const r = rec as unknown as AccountRow
    if (r.name || r.sync_id) {
      accounts.push({
        sync_id: r.sync_id || String(rec.id || ''),
        serverId: r.serverId,
        name: r.name || '',
        initialBalance: r.initialBalance || 0,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        syncedAt: r.syncedAt,
      })
    }
  }

  if (accounts.length > 0) await db.accounts.bulkPut(accounts)
}

async function migrateConfigStore(oldDb: IDBDatabase) {
  const records = await getAllFromStore(oldDb, 'config')
  const configEntries: ConfigRow[] = []

  for (const rec of records) {
    if (rec.id && rec.value !== undefined) {
      configEntries.push({
        id: String(rec.id),
        value: rec.value,
      })
    }
  }

  if (configEntries.length > 0) await db.config.bulkPut(configEntries)
}

async function migrateRecurringRecordsStore(oldDb: IDBDatabase) {
  const records = await getAllFromStore(oldDb, 'recurring_records')
  const recurring: RecurringRecordRow[] = []

  for (const rec of records) {
    const r = rec as unknown as RecurringRecordRow
    if (r.sync_id && r.name) {
      recurring.push({
        sync_id: r.sync_id,
        serverId: r.serverId,
        type: r.type || 'cargo',
        entryType: r.entryType || 'egreso',
        name: r.name,
        amount: r.amount,
        accountId: r.accountId,
        repeatFrequency: r.repeatFrequency || 'month',
        repeatInterval: r.repeatInterval || 1,
        repeatDays: r.repeatDays,
        repeatMonthDay: r.repeatMonthDay,
        repeatMonthWeekdayMode: r.repeatMonthWeekdayMode,
        repeatMonthWeekday: r.repeatMonthWeekday,
        repeatMonthWeekdayOrdinal: r.repeatMonthWeekdayOrdinal,
        repeatYearMonth: r.repeatYearMonth,
        repeatYearDay: r.repeatYearDay,
        time: r.time,
        autoInsert: r.autoInsert ?? true,
        startDate: r.startDate || '',
        endDate: r.endDate,
        estimated: r.estimated,
        items: r.items,
        notes: r.notes,
        status: r.status || 'active',
        products: r.products,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        syncedAt: r.syncedAt,
      })
    }
  }

  if (recurring.length > 0) await db.recurringRecords.bulkPut(recurring)
}

async function migrateSyncQueue() {
  try {
    const raw = localStorage.getItem('sync_queue')
    if (!raw) return
    const items = JSON.parse(raw) as SyncQueueItem[]
    if (items.length > 0) {
      await db.syncQueue.bulkPut(items)
    }
  } catch {
    // old queue format or parse error — skip
  }
}

async function deleteOldDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(OLD_DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function runMigration(): Promise<{ migrated: boolean; stats: Record<string, number> }> {
  const alreadyMigrated = localStorage.getItem(MIGRATION_KEY)
  if (alreadyMigrated === 'true') {
    return { migrated: false, stats: {} }
  }

  let oldDb: IDBDatabase | null = null
  try {
    oldDb = await openOldDB()
  } catch {
    return { migrated: false, stats: {} }
  }

  const stats: Record<string, number> = {}

  try {
    const backupsCount = (await getAllFromStore(oldDb, 'backups')).length
    const budgetCount = (await getAllFromStore(oldDb, 'budget')).length
    const suppliersCount = (await getAllFromStore(oldDb, 'suppliers')).length
    const accountsCount = (await getAllFromStore(oldDb, 'accounts')).length
    const configCount = (await getAllFromStore(oldDb, 'config')).length
    const recurringCount = (await getAllFromStore(oldDb, 'recurring_records')).length
    const queueCount = (() => { try { const q = localStorage.getItem('sync_queue'); return q ? JSON.parse(q).length : 0 } catch { return 0 } })()

    stats.backups = backupsCount
    stats.budget = budgetCount
    stats.suppliers = suppliersCount
    stats.accounts = accountsCount
    stats.config = configCount
    stats.recurringRecords = recurringCount
    stats.syncQueue = queueCount

    await db.transaction('rw', [
      db.budgetDaySnapshots,
      db.budgetProviderProducts,
      db.budgetEntryGroups,
      db.accounts,
      db.backups,
      db.suppliers,
      db.supplierProducts,
      db.recurringRecords,
      db.config,
      db.syncQueue,
    ], async () => {
      await migrateBackupsStore(oldDb)
      await migrateBudgetStore(oldDb)
      await migrateSuppliersStore(oldDb)
      await migrateAccountsStore(oldDb)
      await migrateConfigStore(oldDb)
      await migrateRecurringRecordsStore(oldDb)
      await migrateSyncQueue()
    })

    if (stats.accounts > 0) {
      const accountCount = await db.accounts.count()
      if (accountCount === 0) {
        throw new Error('Migration verification failed: accounts table is empty but source had data')
      }
    }
    if (stats.suppliers > 0) {
      const supplierCount = await db.suppliers.count()
      if (supplierCount === 0) {
        throw new Error('Migration verification failed: suppliers table is empty but source had data')
      }
    }

    oldDb.close()
    localStorage.setItem(MIGRATION_KEY, 'true')
    await deleteOldDB()
    localStorage.removeItem('sync_queue')

    return { migrated: true, stats }
  } catch (err) {
    if (oldDb) oldDb.close()
    console.error('[dexie migration] Failed:', err)
    throw err
  }
}

export function isMigrationCompleted(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === 'true'
}
