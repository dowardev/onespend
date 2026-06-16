import db from '../OneSpendDB'
import type { BackupRow } from '../types'

export const backupsDb = {
  async add(params: { entry: BackupRow }) {
    const { entry } = params
    return db.backups.add(entry)
  },

  async getById(params: { id: number }) {
    const { id } = params
    return db.backups.get(id) ?? null
  },

  async getAll() {
    return db.backups.toArray()
  },

  async delete(params: { id: number }) {
    const { id } = params
    return db.backups.delete(id)
  },

  async clear() {
    return db.backups.clear()
  },
}
