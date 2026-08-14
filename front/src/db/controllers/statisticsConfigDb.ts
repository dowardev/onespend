// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import db from '../OneSpendDB'
import type { StatisticsConfigRow } from '../types'

export const statisticsConfigDb = {
  async add(params: { entry: StatisticsConfigRow }) {
    const { entry } = params
    return db.statisticsConfig.add(entry)
  },

  async put(params: { entry: StatisticsConfigRow }) {
    const { entry } = params
    return db.statisticsConfig.put(entry)
  },

  async getAll() {
    return db.statisticsConfig.toArray()
  },

  async getByCategory(params: { categoryKey: string }) {
    const { categoryKey } = params
    const all = await db.statisticsConfig.toArray()
    return all.filter((item) => item.categoryKey === categoryKey)
  },

  async delete(params: { id: number }) {
    const { id } = params
    return db.statisticsConfig.delete(id)
  },

  async clear() {
    return db.statisticsConfig.clear()
  },
}
