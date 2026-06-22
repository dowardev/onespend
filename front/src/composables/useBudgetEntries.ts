import { ref } from 'vue'
import { format } from 'date-fns'
import { budgetDaySnapshotsDb } from '@/db/controllers/budgetDaySnapshotsDb'
import type { Income } from '@/stores/budgetEntriesStore'

export function useBudgetEntries() {
  const currentEntries = ref<Income[]>([])
  const previousEntries = ref<Income[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBetween(params: { start: Date; end: Date }): Promise<Income[]> {
    const { start, end } = params
    const keys: string[] = []
    const iter = new Date(start)
    while (iter <= end) {
      keys.push(`budget:${format(iter, 'yyyy-MM-dd')}`)
      iter.setDate(iter.getDate() + 1)
    }

    const result: Income[] = []
    const batchSize = 10
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize)
      const snapshots = await Promise.all(
        batch.map((key) => budgetDaySnapshotsDb.getById({ id: key })),
      )
      for (let j = 0; j < snapshots.length; j++) {
        const snap = snapshots[j]
        if (!snap?.data?.entries) continue
        const rawEntries = snap.data.entries as Array<Record<string, unknown>>
        const dateStr = keys[i + j].replace('budget:', '')
        for (const entry of rawEntries) {
          result.push({ ...entry, date: entry.date || dateStr } as unknown as Income)
        }
      }
    }
    return result
  }

  async function fetchPeriod(params: {
    start: Date
    end: Date
    previousStart?: Date
    previousEnd?: Date
  }) {
    isLoading.value = true
    error.value = null
    try {
      const [current, previous] = await Promise.all([
        fetchBetween({ start: params.start, end: params.end }),
        params.previousStart && params.previousEnd
          ? fetchBetween({ start: params.previousStart, end: params.previousEnd })
          : Promise.resolve<Income[]>([]),
      ])
      currentEntries.value = current
      previousEntries.value = previous
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error loading budget entries'
      console.error('[useBudgetEntries] fetchPeriod error:', e)
    } finally {
      isLoading.value = false
    }
  }

  return { currentEntries, previousEntries, isLoading, error, fetchPeriod }
}
