import { ref } from 'vue'
import systemController from '@/controllers/systemConfigController'

export function usePeriodConfig() {
  const weekStartDay = ref(1)

  async function load() {
    try {
      const saved = await systemController.getWeekStartDay()
      if (saved !== undefined && saved !== null) {
        weekStartDay.value = saved
      }
    } catch (e) {
      console.error('[usePeriodConfig] Error loading weekStartDay:', e)
    }
  }

  return { weekStartDay, load }
}
