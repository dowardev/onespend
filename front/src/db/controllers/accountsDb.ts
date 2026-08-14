// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import db from '../OneSpendDB'
import type { AccountRow } from '../types'

export const accountsDb = {
  async add(params: { entry: AccountRow }) {
    const { entry } = params
    return db.accounts.add(entry)
  },

  async put(params: { entry: AccountRow }) {
    const { entry } = params
    return db.accounts.put(entry)
  },

  async bulkGet(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.accounts.bulkGet(syncIds)
  },

  async bulkPut(params: { entries: AccountRow[] }) {
    const { entries } = params
    return db.accounts.bulkPut(entries)
  },

  async getBySyncId(params: { syncId: string }) {
    const { syncId } = params
    return db.accounts.get(syncId) ?? null
  },

  async getAll() {
    return db.accounts.toArray()
  },

  async delete(params: { syncId: string }) {
    const { syncId } = params
    return db.accounts.delete(syncId)
  },

  async bulkDeleteBySyncIds(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.accounts.where('sync_id').anyOf(syncIds).delete()
  },
}
