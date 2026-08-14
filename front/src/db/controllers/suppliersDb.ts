// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import db from '../OneSpendDB'
import type { SupplierRow } from '../types'

export const suppliersDb = {
  async add(params: { entry: SupplierRow }) {
    const { entry } = params
    return db.suppliers.add(entry)
  },

  async put(params: { entry: SupplierRow }) {
    const { entry } = params
    return db.suppliers.put(entry)
  },

  async bulkGet(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.suppliers.bulkGet(syncIds)
  },

  async bulkPut(params: { entries: SupplierRow[] }) {
    const { entries } = params
    return db.suppliers.bulkPut(entries)
  },

  async getBySyncId(params: { syncId: string }) {
    const { syncId } = params
    return db.suppliers.get(syncId) ?? null
  },

  async getAll() {
    return db.suppliers.toArray()
  },

  async delete(params: { syncId: string }) {
    const { syncId } = params
    return db.suppliers.delete(syncId)
  },

  async bulkDeleteBySyncIds(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.suppliers.where('sync_id').anyOf(syncIds).delete()
  },
}
