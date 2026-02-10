<template>
  <div class="chart-container" v-if="items.length > 0">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
  <div class="chart-container empty-chart" v-else>
    <ion-text color="medium">
      <em>No hay datos para mostrar</em>
    </ion-text>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonText } from '@ionic/vue';
import { Chart as ChartJS, CategoryScale, Tooltip, Legend, BarElement } from 'chart.js';
import { Bar } from 'vue-chartjs';

ChartJS.register(CategoryScale, BarElement, Tooltip, Legend);

export interface EntryChartItem {
  name: string;
  amount: number;
}

const props = defineProps<{
  items: EntryChartItem[];
  colors?: string[];
}>();

const defaultColors = [
  '#4BC0C0',
  '#36A2EB',
  '#FFCE56',
  '#FF6384',
  '#9966FF',
  '#FF9F40',
  '#7BC225',
  '#C9CBCF',
];

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => (b.amount || 0) - (a.amount || 0));
});

const chartData = computed(() => ({
  labels: sortedItems.value.map(item => item.name),
  datasets: [
    {
      data: sortedItems.value.map(item => item.amount || 0),
      backgroundColor: sortedItems.value.map(
        (_, i) => (props.colors || defaultColors)[i % (props.colors || defaultColors).length]
      ),
      borderRadius: 4,
    },
  ],
}));

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const value = context.raw;
          return `$${value.toLocaleString('es-MX')}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        callback: (value: any) => `$${value.toLocaleString('es-MX')}`,
      },
    },
    y: {
      grid: {
        display: false,
      },
    },
  },
};
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 200px;
  width: 100%;
}

.empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--ion-color-medium);
  border-radius: 8px;
}
</style>
