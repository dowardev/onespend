import db from '../OneSpendDB'
import type { BudgetProviderProductRow } from '../types'

export const budgetProviderProductsDb = {
  async add(params: { entry: BudgetProviderProductRow }) {
    const { entry } = params
    return db.budgetProviderProducts.add(entry)
  },

  async put(params: { entry: BudgetProviderProductRow }) {
    const { entry } = params
    return db.budgetProviderProducts.put(entry)
  },

  async bulkGet(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.budgetProviderProducts.bulkGet(syncIds)
  },

  async bulkPut(params: { entries: BudgetProviderProductRow[] }) {
    const { entries } = params
    return db.budgetProviderProducts.bulkPut(entries)
  },

  async getBySyncId(params: { syncId: string }) {
    const { syncId } = params
    return db.budgetProviderProducts.get(syncId) ?? null
  },

  async getByProviderId(params: { providerSyncId: string }) {
    const { providerSyncId } = params
    return db.budgetProviderProducts.where('providerSyncId').equals(providerSyncId).toArray()
  },

  async getAll() {
    return db.budgetProviderProducts.toArray()
  },

  async delete(params: { syncId: string }) {
    const { syncId } = params
    return db.budgetProviderProducts.delete(syncId)
  },

  async bulkDeleteBySyncIds(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.budgetProviderProducts.where('sync_id').anyOf(syncIds).delete()
  },
}
