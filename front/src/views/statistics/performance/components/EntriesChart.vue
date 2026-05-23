<template>
  <div v-if="hasData" class="chart-wrapper">
    <div class="chart-container">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
  <div v-else class="chart-wrapper empty">
    <ion-text color="medium">
      <em>No hay datos para mostrar</em>
    </ion-text>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonText } from '@ionic/vue';
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

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

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

const hasData = computed(() => props.items && props.items.length > 0);

const sortedItems = computed(() => {
  if (!props.items || props.items.length === 0) return [];
  return [...props.items]
    .filter((item) => item && item.amount > 0)
    .sort((a, b) => (b.amount || 0) - (a.amount || 0));
});

const chartData = computed(() => {
  if (sortedItems.value.length === 0) {
    return { labels: [], datasets: [] };
  }

  return {
    labels: sortedItems.value.map((item) => item.name),
    datasets: [
      {
        label: 'Monto',
        data: sortedItems.value.map((item) => item.amount || 0),
        backgroundColor: sortedItems.value.map(
          (_, i) => (props.colors || defaultColors)[i % (props.colors || defaultColors).length],
        ),
        borderRadius: 4,
        barThickness: 20,
      },
    ],
  };
});

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 12,
      titleFont: { size: 14 },
      bodyFont: { size: 13 },
      callbacks: {
        label: (context: any) => {
          const value = context.raw;
          return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
          }).format(value);
        },
      },
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: true,
        color: 'rgba(0,0,0,0.05)',
      },
      ticks: {
        callback: (value: any) => {
          if (typeof value === 'number') {
            return new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              maximumSignificantDigits: 3,
            }).format(value);
          }
          return value;
        },
      },
    },
    y: {
      display: true,
      grid: {
        display: false,
      },
    },
  },
};
</script>

<style scoped>
.chart-wrapper {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--ion-color-light);
  background: var(--ion-background-color);
}

.chart-wrapper.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  border-style: dashed;
}

.chart-container {
  position: relative;
  height: 180px;
  width: 100%;
}
</style>
