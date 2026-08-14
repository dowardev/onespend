// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { computed, type Ref } from 'vue'
import type { Income } from '@/stores/budgetEntriesStore'

export interface StatementItem {
  name: string
  amount: number
  percentOfIncome: number
}

export interface StatementSection {
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

const labelMap: Record<string, string> = {
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

function buildStatementItems(groups: CategoryMap, keys: string[], incomeTotal: number): StatementItem[] {
  return keys
    .filter((key) => (groups[key] || 0) > 0)
    .map((key) => ({
      name: labelMap[key] || key,
      amount: groups[key] || 0,
      percentOfIncome: incomeTotal > 0 ? Number((((groups[key] || 0) / incomeTotal) * 100).toFixed(1)) : 0,
    }))
}

export function useIncomeStatement(params: {
  entries: Ref<Income[]>
  previousEntries?: Ref<Income[]>
  categorize?: (entries: Income[]) => CategoryMap
}) {
  const { entries, previousEntries, categorize = defaultCategorizeEntries } = params

  const statement = computed<IncomeStatementResult>(() => {
    const incomeEntries = entries.value.filter((e) => e.entryType === 'ingreso')
    const expenseEntries = entries.value.filter((e) => e.entryType !== 'ingreso')

    const incomeTotal = incomeEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
    const incomeGroups = categorize(incomeEntries)
    const incomeItems = buildStatementItems(incomeGroups, ['salary', 'investments', 'other_income'], incomeTotal)

    const expenseGroups = categorize(expenseEntries)

    const costOfLifeKeys = ['housing', 'food', 'transport', 'health']
    const costOfLifeItems = buildStatementItems(expenseGroups, costOfLifeKeys, incomeTotal)
    const costOfLifeTotal = costOfLifeItems.reduce((s, i) => s + i.amount, 0)

    const discretionaryKeys = ['entertainment', 'other']
    const discretionaryItems = buildStatementItems(expenseGroups, discretionaryKeys, incomeTotal)
    const discretionaryTotal = discretionaryItems.reduce((s, i) => s + i.amount, 0)

    const financialKeys = ['financial']
    const financialItems = buildStatementItems(expenseGroups, financialKeys, incomeTotal)
    const financialTotal = financialItems.reduce((s, i) => s + i.amount, 0)

    const grossProfit = incomeTotal - costOfLifeTotal
    const grossProfitPercent = incomeTotal > 0 ? Number(((grossProfit / incomeTotal) * 100).toFixed(1)) : 0
    const operatingSavings = grossProfit - discretionaryTotal
    const operatingSavingsPercent = incomeTotal > 0 ? Number(((operatingSavings / incomeTotal) * 100).toFixed(1)) : 0
    const netResult = operatingSavings - financialTotal
    const netResultPercent = incomeTotal > 0 ? Number(((netResult / incomeTotal) * 100).toFixed(1)) : 0

    return {
      incomes: { title: 'Ingresos', items: incomeItems, total: incomeTotal },
      costOfLife: { title: 'Costo de Vida', items: costOfLifeItems, total: costOfLifeTotal },
      grossProfit,
      grossProfitPercent,
      discretionaryExpenses: { title: 'Gastos Discrecionales', items: discretionaryItems, total: discretionaryTotal },
      operatingSavings,
      operatingSavingsPercent,
      financialExpenses: { title: 'Gastos Financieros', items: financialItems, total: financialTotal },
      netResult,
      netResultPercent,
    }
  })

  const comparison = computed<StatementComparison | null>(() => {
    if (!previousEntries) return null
    const prevIncomeEntries = previousEntries.value.filter((e) => e.entryType === 'ingreso')
    const prevExpenseEntries = previousEntries.value.filter((e) => e.entryType !== 'ingreso')

    const prevIncomeTotal = prevIncomeEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
    const prevExpenseGroups = categorize(prevExpenseEntries)

    const prevCostOfLifeKeys = ['housing', 'food', 'transport', 'health']
    const prevCostOfLifeTotal = prevCostOfLifeKeys.reduce((s, k) => s + (prevExpenseGroups[k] || 0), 0)

    const prevDiscretionaryKeys = ['entertainment', 'other']
    const prevDiscretionaryTotal = prevDiscretionaryKeys.reduce((s, k) => s + (prevExpenseGroups[k] || 0), 0)

    const prevFinancialTotal = prevExpenseGroups.financial || 0
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
