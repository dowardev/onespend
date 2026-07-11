import { reactive } from 'vue'
import { useBudgetDayStore } from '@/stores/budgetDayStore'
import { storeToRefs } from 'pinia'

export function useBudgetDay() {
  const store = useBudgetDayStore()
  const { selectedDate, isLoading } = storeToRefs(store)

  function setSelectedDate(date: string) {
    store.setSelectedDate(date)
  }

  function setIsLoading(value: boolean) {
    store.setIsLoading(value)
  }

  async function loadBudgetForDate(params: { date: string }) {
    await store.loadBudgetForDate(params)
  }

  return reactive({
    selectedDate,
    isLoading,
    setSelectedDate,
    setIsLoading,
    loadBudgetForDate,
  })
}
