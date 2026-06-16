import db from '../OneSpendDB'
import type { SyncQueueItem, SyncEntityType } from '../types'

export const syncQueueDb = {
  async add(params: { entry: SyncQueueItem }) {
    const { entry } = params
    return db.syncQueue.add(entry)
  },

  async put(params: { entry: SyncQueueItem }) {
    const { entry } = params
    return db.syncQueue.put(entry)
  },

  async bulkAdd(params: { entries: SyncQueueItem[] }) {
    const { entries } = params
    return db.syncQueue.bulkAdd(entries)
  },

  async bulkPut(params: { entries: SyncQueueItem[] }) {
    const { entries } = params
    return db.syncQueue.bulkPut(entries)
  },

  async bulkDelete(params: { ids: string[] }) {
    const { ids } = params
    return db.syncQueue.bulkDelete(ids)
  },

  async getByIds(params: { ids: string[] }) {
    const { ids } = params
    return db.syncQueue.bulkGet(ids)
  },

  async getAll() {
    return db.syncQueue.toArray()
  },

  async getById(params: { id: string }) {
    const { id } = params
    return db.syncQueue.get(id) ?? null
  },

  async delete(params: { id: string }) {
    const { id } = params
    return db.syncQueue.delete(id)
  },

  async clear() {
    return db.syncQueue.clear()
  },

  async getByEntityType(params: { entityType: SyncEntityType }) {
    const { entityType } = params
    return db.syncQueue.where('entityType').equals(entityType).toArray()
  },

  async getPending() {
    return db.syncQueue.where('retryCount').below(5).sortBy('timestamp')
  },

  async getEligible() {
    const now = Date.now()
    return db.syncQueue
      .filter((item) => !item.nextRetryAt || item.nextRetryAt <= now)
      .sortBy('timestamp')
  },

  async count() {
    return db.syncQueue.count()
  },
}
