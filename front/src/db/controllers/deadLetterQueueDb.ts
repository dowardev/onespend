// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import db from '../OneSpendDB'
import type { DeadLetterItem, SyncEntityType } from '../types'

export const deadLetterQueueDb = {
  async add(params: { entry: DeadLetterItem }) {
    const { entry } = params
    return db.deadLetterQueue.add(entry)
  },

  async bulkAdd(params: { entries: DeadLetterItem[] }) {
    const { entries } = params
    return db.deadLetterQueue.bulkAdd(entries)
  },

  async getAll() {
    return db.deadLetterQueue.toArray()
  },

  async getByEntityType(params: { entityType: SyncEntityType }) {
    const { entityType } = params
    return db.deadLetterQueue.where('entityType').equals(entityType).toArray()
  },

  async bulkDelete(params: { ids: number[] }) {
    const { ids } = params
    return db.deadLetterQueue.bulkDelete(ids)
  },

  async delete(params: { id: number }) {
    const { id } = params
    return db.deadLetterQueue.delete(id)
  },

  async clear() {
    return db.deadLetterQueue.clear()
  },

  async count() {
    return db.deadLetterQueue.count()
  },
}
