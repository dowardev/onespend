// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Dexie entryCategories CRUD + Performance section map (LBDS-210 §1).

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { entryCategoriesDb, generateCategoryId, INCOME_SECTION_MAP_KEY } from '@/db/controllers/entryCategoriesDb'
import { configDb } from '@/db/controllers/configDb'
import { db } from '@/db/OneSpendDB'
import type { EntryCategoryRow } from '@/db/types'

describe('entryCategoriesDb', () => {
  beforeEach(async () => {
    await db.entryCategories.clear()
    await configDb.delete({ key: INCOME_SECTION_MAP_KEY })
  })

  it('seeds the expected defaults exactly once (idempotent), plus a default section map', async () => {
    const seeded = await entryCategoriesDb.ensureSeeded()
    expect(seeded).toBe(10)

    const all = await entryCategoriesDb.getAll()
    expect(all).toHaveLength(10)
    expect(all.map((c: EntryCategoryRow) => c.name)).toContain('Salario')
    expect(all.map((c: EntryCategoryRow) => c.name)).toContain('Alimentación')

    // second call is a no-op
    expect(await entryCategoriesDb.ensureSeeded()).toBe(0)

    // seed also wrote the default section mapping
    const map = await entryCategoriesDb.getSectionMap()
    expect(map.incomes).toContain('salary')
    expect(map.costOfLife).toContain('food')
  })

  it('creates a user category with a uuid id (no section) and renames/removes it', async () => {
    const created = await entryCategoriesDb.add({ name: 'Gimnasio' })
    expect(created.id).toBeTruthy()
    expect(['salary', 'food']).not.toContain(created.id)
    expect(generateCategoryId()).not.toBe(created.id)

    await entryCategoriesDb.update({ id: created.id, changes: { name: 'Gym' } })
    expect((await entryCategoriesDb.getByCategory({ id: created.id }))?.name).toBe('Gym')

    await entryCategoriesDb.remove({ id: created.id })
    expect(await entryCategoriesDb.getByCategory({ id: created.id })).toBeUndefined()
  })

  it('section map get/set round-trips (Performance config)', async () => {
    await entryCategoriesDb.ensureSeeded()
    await entryCategoriesDb.setSectionMap({
      map: { incomes: ['salary'], costOfLife: ['food'], discretionaryExpenses: ['other'], financialExpenses: ['financial'] },
    })
    const reloaded = await entryCategoriesDb.getSectionMap()
    expect(reloaded.incomes).toEqual(['salary'])
    expect(reloaded.costOfLife).toContain('food')

    // absent key falls back to the default map
    const fallback = await entryCategoriesDb.getSectionMap()
    expect(fallback.incomes).toContain('salary')
  })

  it('enforces a 1:1 category↔section relationship on save', async () => {
    await entryCategoriesDb.ensureSeeded()
    // money is in costOfLife; now assigning it to incomes should remove it from costOfLife
    await entryCategoriesDb.setSectionMap({
      map: { incomes: ['salary', 'food'], costOfLife: ['food', 'housing'], discretionaryExpenses: [], financialExpenses: [] },
    })
    const reloaded = await entryCategoriesDb.getSectionMap()
    // food stays in incomes (last wins); costOfLife loses it
    expect(reloaded.incomes).toContain('food')
    expect(reloaded.costOfLife).not.toContain('food')
    expect(reloaded.costOfLife).toContain('housing')
  })
})