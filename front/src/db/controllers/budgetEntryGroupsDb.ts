// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import db from '../OneSpendDB'
import type { BudgetEntryGroupRow } from '../types'

export const budgetEntryGroupsDb = {
  async add(params: { entry: BudgetEntryGroupRow }) {
    const { entry } = params
    return db.budgetEntryGroups.add(entry)
  },

  async put(params: { entry: BudgetEntryGroupRow }) {
    const { entry } = params
    return db.budgetEntryGroups.put(entry)
  },

  async getByEntryId(params: { entrySyncId: string }) {
    const { entrySyncId } = params
    return db.budgetEntryGroups.where('entrySyncId').equals(entrySyncId).toArray()
  },

  async getAll() {
    return db.budgetEntryGroups.toArray()
  },

  async delete(params: { id: number }) {
    const { id } = params
    return db.budgetEntryGroups.delete(id)
  },
}
