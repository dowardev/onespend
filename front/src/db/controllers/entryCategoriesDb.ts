// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import db from '../OneSpendDB'
import { configDb } from './configDb'
import type { EntryCategoryRow, IncomeStatementSectionMap } from '../types'

// Seed categories mirror the CURRENT keyword-group names so the Income Statement
// fallback keeps working for uncategorized entries. Categories here are GLOBAL
// (name only); the section→category mapping is configured separately in the
// Performance config panel and stored under the KEY below.

export const INCOME_SECTION_MAP_KEY = 'incomeStatementSectionMap'

const DEFAULT_SECTION_MAP: IncomeStatementSectionMap = {
  incomes: ['salary', 'investments', 'other_income'],
  costOfLife: ['housing', 'food', 'transport', 'health'],
  discretionaryExpenses: ['entertainment', 'other'],
  financialExpenses: ['financial'],
}

// Seed categories with deterministic ids = the event keyword keys (stable across
// devices and statement lookups).
function seedRows(): EntryCategoryRow[] {
  const now = Date.now()
  const pairs: Array<[string, string]> = [
    ['salary', 'Salario'],
    ['investments', 'Inversiones'],
    ['other_income', 'Otros ingresos'],
    ['housing', 'Vivienda'],
    ['food', 'Alimentación'],
    ['transport', 'Transporte'],
    ['health', 'Salud'],
    ['entertainment', 'Entretenimiento'],
    ['other', 'Otros'],
    ['financial', 'Intereses y comisiones'],
  ]
  return pairs.map(([id, name]) => ({ id, name, createdAt: now, updatedAt: now }))
}

export function generateCategoryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const entryCategoriesDb = {
  async getAll(): Promise<EntryCategoryRow[]> {
    return db.entryCategories.toArray()
  },

  async getByCategory(params: { id: string }): Promise<EntryCategoryRow | undefined> {
    const { id } = params
    return db.entryCategories.get(id)
  },

  async add(params: { name: string }): Promise<EntryCategoryRow> {
    const { name } = params
    const row: EntryCategoryRow = {
      id: generateCategoryId(),
      name: name.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await db.entryCategories.add(row)
    return row
  },

  async update(params: { id: string; changes: Partial<Pick<EntryCategoryRow, 'name'>> }): Promise<void> {
    const { id, changes } = params
    await db.entryCategories.update(id, { ...changes, updatedAt: Date.now() })
  },

  async remove(params: { id: string }): Promise<void> {
    const { id } = params
    await db.entryCategories.delete(id)
  },

  generateId(): string {
    return generateCategoryId()
  },

  async ensureSeeded(): Promise<number> {
    const count = await db.entryCategories.count()
    if (count > 0) return 0
    await db.entryCategories.bulkAdd(seedRows())
    // Seed the default section mapping too (idempotent: only if absent).
    const existing = await configDb.get({ key: INCOME_SECTION_MAP_KEY })
    if (existing === undefined) {
      await configDb.set({ key: INCOME_SECTION_MAP_KEY, value: DEFAULT_SECTION_MAP })
    }
    return seedRows().length
  },

  // --- section mapping (Performance config) ---

  async getSectionMap(): Promise<IncomeStatementSectionMap> {
    const stored = await configDb.get({ key: INCOME_SECTION_MAP_KEY })
    if (stored && typeof stored === 'object') {
      return { ...DEFAULT_SECTION_MAP, ...(stored as Partial<IncomeStatementSectionMap>) }
    }
    return { ...DEFAULT_SECTION_MAP }
  },

  async setSectionMap(params: { map: IncomeStatementSectionMap }): Promise<void> {
    const { map } = params
    // 1:1 enforcement: each category can belong to at most ONE section. If the same
    // id appears in multiple sections, keep only the LAST occurrence in the canonical
    // order ( incomes < costOfLife < discretionaryExpenses < financialExpenses ).
    const seen = new Set<string>()
    const clamped = { ...map }
    const sections: Array<keyof IncomeStatementSectionMap> = [
      'incomes', 'costOfLife', 'discretionaryExpenses', 'financialExpenses',
    ]
    for (const section of sections) {
      clamped[section] = (map[section] || []).filter((id) => {
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
    }
    await configDb.set({ key: INCOME_SECTION_MAP_KEY, value: clamped })
  },
}