import { defineStore } from 'pinia';
import { ref } from 'vue';
import { formatLocalDate } from '@/utils/date';

export const useBudgetDayStore = defineStore('budgetDay', () => {
  const selectedDate = ref(formatLocalDate({ d: new Date() }));
  const isLoading = ref(false);

  function setSelectedDate(date: string) {
    selectedDate.value = date;
  }

  function setIsLoading(value: boolean) {
    isLoading.value = value;
  }

  async function loadBudgetForDate(params: { date: string }) {
    const { date } = params;
    selectedDate.value = date;
    isLoading.value = true;
    try {
      // DataMediator handles entries/providers from Dexie — no snapshot loading needed
    } catch (e) {
      console.error('budgetDayStore.loadBudgetForDate error', e);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    selectedDate,
    isLoading,
    setSelectedDate,
    setIsLoading,
    loadBudgetForDate,
  };
});
