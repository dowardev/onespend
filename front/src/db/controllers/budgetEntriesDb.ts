import db from '../OneSpendDB'
import type { BudgetEntryRow } from '../types'

export const budgetEntriesDb = {
  async add(params: { entry: BudgetEntryRow }) {
    const { entry } = params
    return db.budgetEntries.add(entry)
  },

  async put(params: { entry: BudgetEntryRow }) {
    const { entry } = params
    return db.budgetEntries.put(entry)
  },

  async bulkGet(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.budgetEntries.bulkGet(syncIds)
  },

  async bulkPut(params: { entries: BudgetEntryRow[] }) {
    const { entries } = params
    return db.budgetEntries.bulkPut(entries)
  },

  async getBySyncId(params: { syncId: string }) {
    const { syncId } = params
    return db.budgetEntries.get(syncId) ?? null
  },

  async getAll() {
    return db.budgetEntries.toArray()
  },

  async getByDate(params: { date: string }) {
    const { date } = params
    return db.budgetEntries.where('date').equals(date).toArray()
  },

  async getByDateRange(params: { from: string; to: string }) {
    const { from, to } = params
    return db.budgetEntries.where('date').between(from, to, true, true).toArray()
  },

  async delete(params: { syncId: string }) {
    const { syncId } = params
    return db.budgetEntries.delete(syncId)
  },

  async bulkDeleteBySyncIds(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.budgetEntries.where('sync_id').anyOf(syncIds).delete()
  },
}
