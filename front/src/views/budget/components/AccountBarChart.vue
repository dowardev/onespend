<template>
  <div class="chart-wrapper">
    <Bar v-if="canRenderChart" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Bar } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { useChart } from '@/composables/useChart';

// Initialize chart dependencies
const { loadChartDependencies, isLoaded } = useChart();
onMounted(() => {
  loadChartDependencies().catch(e => console.error('Failed to load chart dependencies:', e));
});

// Only render chart when data exists AND Chart.js dependencies are loaded
const canRenderChart = computed(() => hasData.value && isLoaded.value);

const props = defineProps<{
  ingresos: number;
  egresos: number;
}>();

const hasData = computed(() => {
  return props.ingresos > 0 || props.egresos > 0;
});

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: [''],
  datasets: [
    {
      label: 'Ingresos',
      data: [props.ingresos],
      backgroundColor: 'rgba(45, 213, 91, 0.7)',
      borderColor: 'rgba(45, 213, 91, 1)',
      borderWidth: 1,
    },
    {
      label: 'Egresos',
      data: [props.egresos],
      backgroundColor: 'rgba(197, 0, 15, 0.7)',
      borderColor: 'rgba(197, 0, 15, 1)',
      borderWidth: 1,
    },
  ],
}));

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    },
  },
  scales: {
    x: {
      type: 'linear',
      stacked: true,
      grid: {
        display: false,
      },
      ticks: {
        display: false,
      },
    },
    y: {
      type: 'category',
      stacked: true,
      grid: {
        display: false,
      },
      ticks: {
        display: false,
      },
    },
  },
}));
</script>

<style scoped>
.chart-wrapper {
  height: 100%;
  width: 100%;
  min-height: 30px;
  max-height: 40px;
}
</style>
