import db from '../OneSpendDB'
import type { BudgetDaySnapshotRow } from '../types'

export const budgetDaySnapshotsDb = {
  async put(params: { entry: BudgetDaySnapshotRow }) {
    const { entry } = params
    return db.budgetDaySnapshots.put(entry)
  },

  async getById(params: { id: string }) {
    const { id } = params
    return db.budgetDaySnapshots.get(id) ?? null
  },

  async getAll() {
    return db.budgetDaySnapshots.toArray()
  },

  async delete(params: { id: string }) {
    const { id } = params
    return db.budgetDaySnapshots.delete(id)
  },
}
