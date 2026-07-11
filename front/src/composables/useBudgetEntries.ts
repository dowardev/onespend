import { ref } from 'vue'
import type { Income } from '@/stores/budgetEntriesStore'
import budgetEntriesController from '@/controllers/budgetEntriesController'

export function useBudgetEntries() {
  const currentEntries = ref<Income[]>([])
  const previousEntries = ref<Income[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPeriod(params: {
    start: Date
    end: Date
    previousStart?: Date
    previousEnd?: Date
  }) {
    isLoading.value = true
    error.value = null
    try {
      currentEntries.value = await budgetEntriesController.getEntriesBetween({
        start: params.start,
        end: params.end,
      })
      previousEntries.value = params.previousStart && params.previousEnd
        ? await budgetEntriesController.getEntriesBetween({
            start: params.previousStart,
            end: params.previousEnd,
          })
        : []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error loading budget entries'
      console.error('[useBudgetEntries] fetchPeriod error:', e)
    } finally {
      isLoading.value = false
    }
  }

  return { currentEntries, previousEntries, isLoading, error, fetchPeriod }
}
