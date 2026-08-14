// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import db from '../OneSpendDB'
import type { RecurringRecordProductRow } from '../types'

export const recurringRecordProductsDb = {
  async add(params: { entry: RecurringRecordProductRow }) {
    const { entry } = params
    return db.recurringRecordProducts.add(entry)
  },

  async put(params: { entry: RecurringRecordProductRow }) {
    const { entry } = params
    return db.recurringRecordProducts.put(entry)
  },

  async bulkGet(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.recurringRecordProducts.bulkGet(syncIds)
  },

  async bulkPut(params: { entries: RecurringRecordProductRow[] }) {
    const { entries } = params
    return db.recurringRecordProducts.bulkPut(entries)
  },

  async getBySyncId(params: { syncId: string }) {
    const { syncId } = params
    return db.recurringRecordProducts.get(syncId) ?? null
  },

  async getByRecordId(params: { recordSyncId: string }) {
    const { recordSyncId } = params
    return db.recurringRecordProducts.where('recordSyncId').equals(recordSyncId).toArray()
  },

  async getAll() {
    return db.recurringRecordProducts.toArray()
  },

  async delete(params: { syncId: string }) {
    const { syncId } = params
    return db.recurringRecordProducts.delete(syncId)
  },
}
