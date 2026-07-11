import { ref, computed } from 'vue'
import cashFlowController from '@/controllers/cashFlowController'
import type { CashFlowSummary } from '@/controllers/cashFlowController'

export function useCashFlow() {
  const rangeDays = ref<30 | 90 | 365>(30)
  const summary = ref<CashFlowSummary | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const chartData = computed(() => {
    if (!summary.value) return null
    return {
      labels: summary.value.labels,
      datasets: [
        {
          label: 'Ingresos',
          data: summary.value.ingresosData,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Egresos',
          data: summary.value.egresosData,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          fill: false,
          tension: 0.1,
        },
      ],
    }
  })

  function formatCurrency(val: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(val || 0)
  }

  async function load() {
    isLoading.value = true
    error.value = null
    try {
      summary.value = await cashFlowController.getSummary({ days: rangeDays.value })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error loading cash flow'
    } finally {
      isLoading.value = false
    }
  }

  function setRange(params: { days: 30 | 90 | 365 }) {
    rangeDays.value = params.days
    load()
  }

  return {
    rangeDays,
    summary,
    isLoading,
    error,
    chartData,
    formatCurrency,
    load,
    setRange,
  }
}
