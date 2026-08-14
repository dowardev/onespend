// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import db from '../OneSpendDB'
import type { RecurringRecordRow } from '../types'

export const recurringRecordsDb = {
  async add(params: { entry: RecurringRecordRow }) {
    const { entry } = params
    return db.recurringRecords.add(entry)
  },

  async put(params: { entry: RecurringRecordRow }) {
    const { entry } = params
    return db.recurringRecords.put(entry)
  },

  async bulkGet(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.recurringRecords.bulkGet(syncIds)
  },

  async bulkPut(params: { entries: RecurringRecordRow[] }) {
    const { entries } = params
    return db.recurringRecords.bulkPut(entries)
  },

  async getBySyncId(params: { syncId: string }) {
    const { syncId } = params
    return db.recurringRecords.get(syncId) ?? null
  },

  async getAll() {
    return db.recurringRecords.toArray()
  },

  async getActive() {
    return db.recurringRecords.where('status').equals('active').toArray()
  },

  async delete(params: { syncId: string }) {
    const { syncId } = params
    return db.recurringRecords.delete(syncId)
  },

  async bulkDeleteBySyncIds(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.recurringRecords.where('sync_id').anyOf(syncIds).delete()
  },
}
