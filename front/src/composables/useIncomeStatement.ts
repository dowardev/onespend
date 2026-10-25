// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { computed, type Ref } from 'vue'
import { useLocale } from '@/composables/useLocale'
import type { Income } from '@/stores/budgetEntriesStore'
import type { EntryCategoryRow, IncomeStatementSectionMap, IncomeStatementSection } from '@/db/types'

export interface StatementItem {
  name: string
  amount: number
  percentOfIncome: number
}

export interface StatementSection {
  // Glossary slug of the section (see useFinancialGlossary): the help popover
  // looks the definition up by slug, not by the translated title.
  key: string
  title: string
  items: StatementItem[]
  total: number
}

export interface StatementComparison {
  incomesTotal: number
  costOfLifeTotal: number
  grossProfit: number
  discretionaryTotal: number
  operatingSavings: number
  financialTotal: number
  netResult: number
}

export interface IncomeStatementResult {
  incomes: StatementSection
  costOfLife: StatementSection
  grossProfit: number
  grossProfitPercent: number
  discretionaryExpenses: StatementSection
  operatingSavings: number
  operatingSavingsPercent: number
  financialExpenses: StatementSection
  netResult: number
  netResultPercent: number
}

export type CategoryMap = Record<string, number>

// The Spanish fallback labels are kept here so the keyword-based
// categorizer (used when no category id is set) can render something
// meaningful even if the i18n lookup fails. Live display goes through
// the translated keys in `statistics.performance.useincomestatement.label.*`
// via `tLabelFor()` inside the composable.
const labelFallback: Record<string, string> = {
  salary: 'Salario',
  investments: 'Inversiones',
  other_income: 'Otros ingresos',
  housing: 'Vivienda',
  food: 'Alimentación',
  transport: 'Transporte',
  health: 'Salud',
  entertainment: 'Entretenimiento',
  other: 'Otros',
  financial: 'Intereses y comisiones',
}

export function defaultCategorizeEntries(entries: Income[]): CategoryMap {
  const categories: CategoryMap = {}
  for (const entry of entries) {
    const name = (entry.supplierName || entry.name || 'other').toLowerCase()
    const amount = Number(entry.amount || 0)

    if (name.includes('salario') || name.includes('sueldo') || name.includes('nomina') || name.includes('salary')) {
      categories.salary = (categories.salary || 0) + amount
    } else if (name.includes('inversion') || name.includes('invest') || name.includes('dividendo') || name.includes('renta')) {
      categories.investments = (categories.investments || 0) + amount
    } else if (name.includes('interes') || name.includes('comision') || name.includes('banco') || name.includes('prestamo') || name.includes('deuda') || name.includes('financial')) {
      categories.financial = (categories.financial || 0) + amount
    } else if (entry.entryType === 'ingreso') {
      categories.other_income = (categories.other_income || 0) + amount
    } else if (name.includes('renta') || name.includes('casa') || name.includes('departamento') || name.includes('hipoteca')) {
      categories.housing = (categories.housing || 0) + amount
    } else if (name.includes('comida') || name.includes('super') || name.includes('despensa') || name.includes('food') || name.includes('restaurante')) {
      categories.food = (categories.food || 0) + amount
    } else if (name.includes('transporte') || name.includes('gasolina') || name.includes('uber') || name.includes('taxi') || name.includes('camion')) {
      categories.transport = (categories.transport || 0) + amount
    } else if (name.includes('entretenimiento') || name.includes('cine') || name.includes('netflix') || name.includes('spotify') || name.includes('ocio')) {
      categories.entertainment = (categories.entertainment || 0) + amount
    } else if (name.includes('salud') || name.includes('doctor') || name.includes('medico') || name.includes('seguro') || name.includes('farmacia')) {
      categories.health = (categories.health || 0) + amount
    } else {
      categories.other = (categories.other || 0) + amount
    }
  }
  return categories
}

function buildStatementItems(
  groups: CategoryMap,
  keys: string[],
  incomeTotal: number,
  nameFor: (key: string) => string,
): StatementItem[] {
  return keys
    .filter((key) => (groups[key] || 0) > 0)
    .map((key) => ({
      name: nameFor(key),
      amount: groups[key] || 0,
      percentOfIncome: incomeTotal > 0 ? Number((((groups[key] || 0) / incomeTotal) * 100).toFixed(1)) : 0,
    }))
}

export function useIncomeStatement(params: {
  entries: Ref<Income[]>
  previousEntries?: Ref<Income[]>
  categorize?: (entries: Income[]) => CategoryMap
  categories?: Ref<EntryCategoryRow[]>
  sectionMap?: Ref<IncomeStatementSectionMap>
}) {
  const { entries, previousEntries, categorize = defaultCategorizeEntries, categories, sectionMap } = params
  const { t } = useLocale()

  // REQ-5: entries with a KNOWN category id are bucketed under that id (section from the
  // live registry, label = current category name). Entries without a category or with an
  // unknown/deleted id fall back byte-identically to the keyword logic. Maps are rebuilt
  // inside the computed so renames propagate on the next evaluation (id-keyed).
  const categorySections = new Map<string, IncomeStatementSection>()
  const categoryNames = new Map<string, string>()

  function rebuildRegistry(): void {
    // Rebuild the live registry on every evaluation (rename propagation, AC-5.4).
    // Reads sectionMap live so async arrival triggers recompute via reactivity tracking.
    categorySections.clear()
    categoryNames.clear()
    if (categories?.value) {
      for (const c of categories.value) {
        categoryNames.set(c.id, c.name)
      }
    }
    // A known category id maps to its section via the config map (0..N sections).
    const liveMap = sectionMap?.value ?? ({} as IncomeStatementSectionMap)
    for (const [section, ids] of Object.entries(liveMap)) {
      for (const id of ids) categorySections.set(id, section as IncomeStatementSection)
    }
  }

  function categorizeWithCategoryRegistry(list: Income[]): CategoryMap {
    const groups: CategoryMap = {}
    const uncategorized: Income[] = []
    for (const e of list) {
      if (e.category && categorySections.has(e.category)) {
        groups[e.category] = (groups[e.category] || 0) + Number(e.amount || 0)
      } else {
        uncategorized.push(e)
      }
    }
    const fallback = categorize(uncategorized)
    for (const [key, val] of Object.entries(fallback)) {
      groups[key] = (groups[key] || 0) + val
    }
    return groups
  }

  function keysForSection(section: IncomeStatementSection, groups: CategoryMap): string[] {
    const fixed: Record<IncomeStatementSection, string[]> = {
      incomes: ['salary', 'investments', 'other_income'],
      costOfLife: ['housing', 'food', 'transport', 'health'],
      discretionaryExpenses: ['entertainment', 'other'],
      financialExpenses: ['financial'],
    }
    const liveMap = sectionMap?.value ?? ({} as IncomeStatementSectionMap)
    const reverse = new Map<string, IncomeStatementSection>()
    for (const [sec, ids] of Object.entries(liveMap)) {
      for (const id of ids) reverse.set(id, sec as IncomeStatementSection)
    }
    const configured = liveMap[section] || []
    const fixedSet = new Set(fixed[section])
    const custom = configured.filter((id) => groups[id] > 0 && !fixedSet.has(id))
    const homeFixed = fixed[section].filter((key) => {
      const mapped = reverse.get(key)
      return mapped === undefined || mapped === section
    })
    return [...homeFixed, ...custom]
  }

  // LBDS-289: nameFor resolves a category id / keyword to a display
  // label using (in order) the live category registry, the i18n
  // `statistics.performance.useincomestatement.label.*` key, the
  // Spanish fallback, and finally the raw key as a last resort.
  const nameFor = (key: string): string => {
    const live = categoryNames.get(key)
    if (live) return live
    const i18n = t(`statistics.performance.useincomestatement.label.${key}`)
    if (i18n && i18n !== `statistics.performance.useincomestatement.label.${key}`) {
      return i18n
    }
    return labelFallback[key] || key
  }

  const statement = computed<IncomeStatementResult>(() => {
    rebuildRegistry()
    const incomeEntries = entries.value.filter((e) => e.entryType === 'ingreso')
    const expenseEntries = entries.value.filter((e) => e.entryType !== 'ingreso')

    const incomeTotal = incomeEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
    const incomeGroups = categorizeWithCategoryRegistry(incomeEntries)
    const incomeItems = buildStatementItems(incomeGroups, keysForSection('incomes', incomeGroups), incomeTotal, nameFor)

    const expenseGroups = categorizeWithCategoryRegistry(expenseEntries)

    const costOfLifeItems = buildStatementItems(expenseGroups, keysForSection('costOfLife', expenseGroups), incomeTotal, nameFor)
    const costOfLifeTotal = costOfLifeItems.reduce((s, i) => s + i.amount, 0)

    const discretionaryItems = buildStatementItems(expenseGroups, keysForSection('discretionaryExpenses', expenseGroups), incomeTotal, nameFor)
    const discretionaryTotal = discretionaryItems.reduce((s, i) => s + i.amount, 0)

    const financialItems = buildStatementItems(expenseGroups, keysForSection('financialExpenses', expenseGroups), incomeTotal, nameFor)
    const financialTotal = financialItems.reduce((s, i) => s + i.amount, 0)

    const grossProfit = incomeTotal - costOfLifeTotal
    const grossProfitPercent = incomeTotal > 0 ? Number(((grossProfit / incomeTotal) * 100).toFixed(1)) : 0
    const operatingSavings = grossProfit - discretionaryTotal
    const operatingSavingsPercent = incomeTotal > 0 ? Number(((operatingSavings / incomeTotal) * 100).toFixed(1)) : 0
    const netResult = operatingSavings - financialTotal
    const netResultPercent = incomeTotal > 0 ? Number(((netResult / incomeTotal) * 100).toFixed(1)) : 0

    return {
      incomes: { key: 'incomes', title: t('statistics.performance.useincomestatement.incomes'), items: incomeItems, total: incomeTotal },
      costOfLife: { key: 'costOfLife', title: t('statistics.performance.useincomestatement.costOfLife'), items: costOfLifeItems, total: costOfLifeTotal },
      grossProfit,
      grossProfitPercent,
      discretionaryExpenses: { key: 'discretionaryExpenses', title: t('statistics.performance.useincomestatement.discretionaryExpenses'), items: discretionaryItems, total: discretionaryTotal },
      operatingSavings,
      operatingSavingsPercent,
      financialExpenses: { key: 'financialExpenses', title: t('statistics.performance.useincomestatement.financialExpenses'), items: financialItems, total: financialTotal },
      netResult,
      netResultPercent,
    }
  })

  const comparison = computed<StatementComparison | null>(() => {
    if (!previousEntries) return null
    rebuildRegistry()
    const prevIncomeEntries = previousEntries.value.filter((e) => e.entryType === 'ingreso')
    const prevExpenseEntries = previousEntries.value.filter((e) => e.entryType !== 'ingreso')

    const prevIncomeTotal = prevIncomeEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
    const prevExpenseGroups = categorizeWithCategoryRegistry(prevExpenseEntries)

    const prevCostOfLifeTotal = keysForSection('costOfLife', prevExpenseGroups).reduce((s, k) => s + (prevExpenseGroups[k] || 0), 0)

    const prevDiscretionaryTotal = keysForSection('discretionaryExpenses', prevExpenseGroups).reduce((s, k) => s + (prevExpenseGroups[k] || 0), 0)

    const prevFinancialTotal = keysForSection('financialExpenses', prevExpenseGroups).reduce((s, k) => s + (prevExpenseGroups[k] || 0), 0)
    const prevGrossProfit = prevIncomeTotal - prevCostOfLifeTotal
    const prevOperatingSavings = prevGrossProfit - prevDiscretionaryTotal
    const prevNetResult = prevOperatingSavings - prevFinancialTotal

    return {
      incomesTotal: prevIncomeTotal,
      costOfLifeTotal: prevCostOfLifeTotal,
      grossProfit: prevGrossProfit,
      discretionaryTotal: prevDiscretionaryTotal,
      operatingSavings: prevOperatingSavings,
      financialTotal: prevFinancialTotal,
      netResult: prevNetResult,
    }
  })

  return { statement, comparison }
}
