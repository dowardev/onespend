<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <div class="chart-container">
    <canvas ref="chartRef" style="display: none"></canvas>
    <Line v-if="canRender" :data="chartData" :options="chartOptions" />
    <div v-else class="chart-placeholder">
      <ion-text color="medium">{{ t('components.cashflowchart.empty') }}</ion-text>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { useLocale } from '@/composables/useLocale';
const { t } = useLocale();
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { IonText } from '@ionic/vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{
  labels: string[]
  ingresosData: number[]
  egresosData: number[]
}>()

const canRender = computed(() => props.labels.length > 0)

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: t('cashflowchart.income'),
      data: props.ingresosData,
      backgroundColor: 'rgba(75, 192, 192, 0.15)',
      borderColor: 'rgba(75, 192, 192, 1)',
      pointBackgroundColor: 'rgba(75, 192, 192, 1)',
      fill: true,
      tension: 0.3,
      borderWidth: 2,
    },
    {
      label: t('cashflowchart.expense'),
      data: props.egresosData,
      backgroundColor: 'rgba(255, 99, 132, 0.15)',
      borderColor: 'rgba(255, 99, 132, 1)',
      pointBackgroundColor: 'rgba(255, 99, 132, 1)',
      fill: true,
      tension: 0.3,
      borderWidth: 2,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y?: number } }) => {
          const label = ctx.dataset.label || ''
          const val = ctx.parsed.y || 0
          return `${label}: $${val.toLocaleString('es-MX')}`
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: number) => `$${value.toLocaleString('es-MX')}`,
      },
    },
  },
}
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  width: 100%;
}
</style>
