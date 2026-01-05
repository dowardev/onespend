<template>
  <div class="chart-wrapper">
    <Bar v-if="hasData" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

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
      stacked: true,
      grid: {
        display: false,
      },
      ticks: {
        display: false,
      },
    },
    y: {
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
