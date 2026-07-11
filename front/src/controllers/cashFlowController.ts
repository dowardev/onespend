import { budgetEntriesDb } from '@/db/controllers/budgetEntriesDb'

export interface CashFlowBucket {
  date: string
  ingresos: number
  egresos: number
  neto: number
}

export interface CashFlowSummary {
  totalIngresos: number
  totalEgresos: number
  neto: number
  promedioDiario: number
  dias: number
  labels: string[]
  ingresosData: number[]
  egresosData: number[]
}

function fillDays(params: { from: Date; to: Date }): Record<string, CashFlowBucket> {
  const { from, to } = params
  const map: Record<string, CashFlowBucket> = {}
  const cursor = new Date(from)
  while (cursor <= to) {
    const key = cursor.toISOString().slice(0, 10)
    map[key] = { date: key, ingresos: 0, egresos: 0, neto: 0 }
    cursor.setDate(cursor.getDate() + 1)
  }
  return map
}

function fillMonths(params: { from: Date; to: Date }): Record<string, CashFlowBucket> {
  const { from, to } = params
  const map: Record<string, CashFlowBucket> = {}
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
  while (cursor <= to) {
    const key = cursor.toISOString().slice(0, 7)
    map[key] = { date: key, ingresos: 0, egresos: 0, neto: 0 }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return map
}

function dateFromDaysAgo(params: { days: number }): Date {
  const { days } = params
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

class CashFlowController {
  async getByDateRange(params: { from: string; to: string }) {
    return budgetEntriesDb.getByDateRange(params)
  }

  async getSummary(params: { days: 30 | 90 | 365 }): Promise<CashFlowSummary> {
    const { days } = params
    const now = new Date()
    const from = dateFromDaysAgo({ days })

    // For 365 days, aggregate by month; for 30/90, by day
    const aggregateBy: 'day' | 'month' = days === 365 ? 'month' : 'day'
    const map = aggregateBy === 'month' ? fillMonths({ from, to: now }) : fillDays({ from, to: now })

    const entries = await budgetEntriesDb.getByDateRange({
      from: from.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    })

    for (const entry of entries) {
      const key = aggregateBy === 'month' ? entry.date.slice(0, 7) : entry.date
      const bucket = map[key]
      if (!bucket) continue
      const amt = Number(entry.amount || 0)
      if (entry.entryType === 'ingreso') {
        bucket.ingresos += amt
      } else {
        bucket.egresos += amt
      }
    }

    for (const bucket of Object.values(map)) {
      bucket.neto = bucket.ingresos - bucket.egresos
    }

    const sortedKeys = Object.keys(map).sort()
    const buckets = sortedKeys.map((k) => map[k])
    const totalIngresos = buckets.reduce((s, b) => s + b.ingresos, 0)
    const totalEgresos = buckets.reduce((s, b) => s + b.egresos, 0)

    return {
      totalIngresos,
      totalEgresos,
      neto: totalIngresos - totalEgresos,
      promedioDiario: buckets.length > 0 ? (totalIngresos - totalEgresos) / buckets.length : 0,
      dias: buckets.length,
      labels: buckets.map((b) => b.date),
      ingresosData: buckets.map((b) => b.ingresos),
      egresosData: buckets.map((b) => b.egresos),
    }
  }
}

const cashFlowController = new CashFlowController()
export default cashFlowController
export { CashFlowController }
