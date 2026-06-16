import db from '../OneSpendDB'
import type { BudgetProviderRow } from '../types'

export const budgetProvidersDb = {
  async add(params: { entry: BudgetProviderRow }) {
    const { entry } = params
    return db.budgetProviders.add(entry)
  },

  async put(params: { entry: BudgetProviderRow }) {
    const { entry } = params
    return db.budgetProviders.put(entry)
  },

  async bulkGet(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.budgetProviders.bulkGet(syncIds)
  },

  async bulkPut(params: { entries: BudgetProviderRow[] }) {
    const { entries } = params
    return db.budgetProviders.bulkPut(entries)
  },

  async getBySyncId(params: { syncId: string }) {
    const { syncId } = params
    return db.budgetProviders.get(syncId) ?? null
  },

  async getAll() {
    return db.budgetProviders.toArray()
  },

  async getByDate(params: { date: string }) {
    const { date } = params
    return db.budgetProviders.where('date').equals(date).toArray()
  },

  async delete(params: { syncId: string }) {
    const { syncId } = params
    return db.budgetProviders.delete(syncId)
  },

  async bulkDeleteBySyncIds(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.budgetProviders.where('sync_id').anyOf(syncIds).delete()
  },
}
