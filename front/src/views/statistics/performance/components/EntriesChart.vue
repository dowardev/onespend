<template>
  <div class="chart-container" v-if="items.length > 0">
    <Pie :data="chartData" :options="chartOptions" />
  </div>
  <div class="chart-container empty-chart" v-else>
    <ion-text color="medium">
      <em>No hay datos para mostrar</em>
    </ion-text>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'vue-chartjs';

ChartJS.register(ArcElement, Tooltip, Legend);

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

const chartData = computed(() => ({
  labels: props.items.map(item => item.name),
  datasets: [
    {
      data: props.items.map(item => item.amount || 0),
      backgroundColor: props.items.map(
        (_, i) => (props.colors || defaultColors)[i % (props.colors || defaultColors).length]
      ),
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
};
</script>

<style scoped>
.chart-container {
  height: 200px;
  padding: 8px;
}

.empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--ion-color-medium);
  border-radius: 8px;
}
</style>
