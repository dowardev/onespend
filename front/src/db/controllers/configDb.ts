// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import db from '../OneSpendDB'

export const configDb = {
  async get(params: { key: string }) {
    const { key } = params
    const row = await db.config.get(key)
    return row?.value ?? undefined
  },

  async set(params: { key: string; value: unknown }) {
    const { key, value } = params
    await db.config.put({ id: key, value })
  },

  async delete(params: { key: string }) {
    const { key } = params
    return db.config.delete(key)
  },

  async getAll() {
    return db.config.toArray()
  },
}
