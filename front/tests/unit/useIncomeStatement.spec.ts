// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// T5 — useIncomeStatement category→section resolution (LBDS-210 §1, REQ-5):
// a known category id is bucketed into its configured section (via the Performance
// section map); a category in NO section (or an unknown id) falls back
// byte-identically to the keyword logic. Labels come from the live names.

import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useIncomeStatement } from '@/composables/useIncomeStatement'
import type { Income } from '@/stores/budgetEntriesStore'
import type { IncomeStatementSectionMap } from '@/db/types'

function income(params: {
  name: string
  amount: number
  entryType?: 'ingreso' | 'egreso'
  category?: string
}): Income {
  return {
    id: params.name,
    name: params.name,
    amount: params.amount,
    date: '2026-09-01',
    paymentType: 'digital',
    entryType: params.entryType ?? 'egreso',
    category: params.category,
    createdAt: Date.now(),
  }
}

const emptyMap: IncomeStatementSectionMap = {
  incomes: ['salary', 'investments', 'other_income'],
  costOfLife: ['housing', 'food', 'transport', 'health'],
  discretionaryExpenses: ['entertainment', 'other'],
  financialExpenses: ['financial'],
}

describe('useIncomeStatement category resolution', () => {
  it('classifies uncategorized entries byte-identically to keyword logic', () => {
    const entries = ref<Income[]>([
      income({ name: 'Mi salario', amount: 5000, entryType: 'ingreso' }),
      income({ name: 'supermercado', amount: 1500 }),
      income({ name: 'Netflix', amount: 300 }),
      income({ name: 'Algo raro', amount: 50 }),
    ])
    const { statement } = useIncomeStatement({ entries })

    expect(statement.value.incomes.total).toBe(5000)
    expect(statement.value.incomes.items.some((i) => i.name === 'Salario' && i.amount === 5000)).toBe(true)
    expect(statement.value.costOfLife.total).toBe(1500)
    expect(statement.value.discretionaryExpenses.total).toBe(350)
  })

  it('a category id overrides keyword classification and lands in its section', () => {
    const entries = ref<Income[]>([
      // name would keyword-match "salario" → incomes, but the section map puts 'food' → costOfLife
      income({ name: 'Salario parcial', amount: 800, category: 'food' }),
    ])
    const categories = ref([
      { id: 'food', name: 'Alimentación', createdAt: Date.now() },
    ])
    const sectionMap = ref(emptyMap)
    const { statement } = useIncomeStatement({ entries, categories, sectionMap })

    expect(statement.value.incomes.total).toBe(0)
    expect(statement.value.costOfLife.total).toBe(800)
    expect(statement.value.costOfLife.items.some((i) => i.name === 'Alimentación' && i.amount === 800)).toBe(true)
  })

  it('a category assigned to NO section falls back to keyword classification', () => {
    const entries = ref<Income[]>([
      income({ name: 'Netflix', amount: 300, category: 'custom-no-section' }),
    ])
    const categories = ref([
      { id: 'custom-no-section', name: 'Raro', createdAt: Date.now() },
    ])
    // custom-no-section is not present in any section's list
    const { statement } = useIncomeStatement({ entries, categories, sectionMap: ref(emptyMap) })

    // unknown/unmapped id → keyword fallback → entertainment (name 'Netflix')
    expect(statement.value.discretionaryExpenses.total).toBe(300)
  })

  it('a category assigned to multiple sections contributes to each', () => {
    const entries = ref<Income[]>([
      income({ name: 'X', amount: 100, category: 'shared' }),
    ])
    const categories = ref([
      { id: 'shared', name: 'Compartida', createdAt: Date.now() },
    ])
    const sectionMap = ref<IncomeStatementSectionMap>({
      ...emptyMap,
      costOfLife: [...emptyMap.costOfLife, 'shared'],
      discretionaryExpenses: [...emptyMap.discretionaryExpenses, 'shared'],
    })
    const { statement } = useIncomeStatement({ entries, categories, sectionMap })

    expect(statement.value.costOfLife.total).toBe(100)
    expect(statement.value.discretionaryExpenses.total).toBe(100)
  })

  it('propagates a renamed category label (id-keyed) without relocating entries', () => {
    const entries = ref<Income[]>([income({ name: 'X', amount: 100, category: 'custom-1' })])
    const categories = ref([
      { id: 'custom-1', name: 'Nombre viejo', createdAt: Date.now() },
    ])
    const sectionMap = ref<IncomeStatementSectionMap>({
      ...emptyMap,
      costOfLife: [...emptyMap.costOfLife, 'custom-1'],
    })
    const { statement } = useIncomeStatement({ entries, categories, sectionMap })
    expect(statement.value.costOfLife.items[0]?.name).toBe('Nombre viejo')

    categories.value = [
      { id: 'custom-1', name: 'Nombre nuevo', createdAt: Date.now() },
    ]
    expect(statement.value.costOfLife.total).toBe(100)
    expect(statement.value.costOfLife.items[0]?.name).toBe('Nombre nuevo')
  })

  it('totals equal the sum over categorized + fallback entries (no double-count)', () => {
    const entries = ref<Income[]>([
      income({ name: 'Sueldo', amount: 3000, entryType: 'ingreso', category: 'salary' }),
      income({ name: 'Cafe', amount: 200 }), // falls to other
      income({ name: 'Farmacia', amount: 400, category: 'custom-health' }),
    ])
    const categories = ref([
      { id: 'salary', name: 'Salario', createdAt: Date.now() },
      { id: 'custom-health', name: 'Salud extra', createdAt: Date.now() },
    ])
    const sectionMap = ref<IncomeStatementSectionMap>({
      ...emptyMap,
      costOfLife: [...emptyMap.costOfLife, 'custom-health'],
    })
    const { statement } = useIncomeStatement({ entries, categories, sectionMap })

    const all = statement.value.incomes.total
      + statement.value.costOfLife.total
      + statement.value.discretionaryExpenses.total
      + statement.value.financialExpenses.total
    expect(all).toBe(3600) // 3000 + 200 + 400
  })
})