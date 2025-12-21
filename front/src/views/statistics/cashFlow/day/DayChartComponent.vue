<template>
  <div>
    <Bar
      v-if="
        safeChartData &&
        safeChartData.labels &&
        safeChartData.labels.length &&
        safeChartData.datasets &&
        safeChartData.datasets.length
      "
      :data="safeChartData"
      :options="safeChartOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue';
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
import type { ChartOptions, ChartData } from 'chart.js';
import { parseLocalDate } from '@/utils/date';

// Register Chart.js components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

// interface
interface Props {
  chartData?: ChartData<'bar'>;
  chartOptions?: ChartOptions<'bar'>;
  colorIndex?: number;
}
// end interface

// main
const props = withDefaults(defineProps<Props>(), {
  colorIndex: 1, // Default to Light Blue
  // Provide safe defaults for chartData and chartOptions to satisfy linters
  chartData: () => ({ labels: [], datasets: [] }) as ChartData<'bar'>,
  chartOptions: () => ({}) as ChartOptions<'bar'>,
});
// end main

// vars
// Provide reactive shallow refs that mirror the incoming props but are safe for vue-chartjs
const safeChartData = shallowRef<ChartData<'bar'>>(
  props.chartData
    ? JSON.parse(
        JSON.stringify({
          ...props.chartData,
          labels: (props.chartData.labels || []).map(translateDayLabel),
        })
      )
    : { labels: [], datasets: [] }
);
const safeChartOptions = shallowRef<ChartOptions<'bar'>>(
  props.chartOptions
    ? JSON.parse(JSON.stringify(props.chartOptions))
    : ({} as ChartOptions<'bar'>)
);
// end vars

// functions
// Pastel neon colors palette
const pastelNeonColors = [
  { bg: 'rgba(255, 182, 193, 0.4)', border: 'rgba(255, 105, 180, 1)' }, // Pink
  { bg: 'rgba(173, 216, 230, 0.4)', border: 'rgba(0, 191, 255, 1)' }, // Light Blue
  { bg: 'rgba(144, 238, 144, 0.4)', border: 'rgba(0, 255, 127, 1)' }, // Light Green
  { bg: 'rgba(255, 218, 185, 0.4)', border: 'rgba(255, 165, 0, 1)' }, // Peach/Orange
  { bg: 'rgba(221, 160, 221, 0.4)', border: 'rgba(186, 85, 211, 1)' }, // Plum/Purple
  { bg: 'rgba(255, 255, 186, 0.4)', border: 'rgba(255, 215, 0, 1)' }, // Light Yellow
  { bg: 'rgba(176, 224, 230, 0.4)', border: 'rgba(64, 224, 208, 1)' }, // Powder Blue/Turquoise
  { bg: 'rgba(255, 182, 182, 0.4)', border: 'rgba(255, 99, 71, 1)' }, // Coral
];

function applyNeonStyles(data: ChartData<'bar'>): ChartData<'bar'> {
  if (!data.datasets) return data;

  data.datasets = data.datasets.map((dataset, datasetIndex) => {
    const dataArray = Array.isArray(dataset.data) ? dataset.data : [];

    // If dataset has multiple data points, apply different colors to each bar
    if (dataArray.length > 1) {
      const bgColors: string[] = [];
      const borderColors: string[] = [];
      const hoverBgColors: string[] = [];

      for (let i = 0; i < dataArray.length; i++) {
        const colors =
          pastelNeonColors[(props.colorIndex + i) % pastelNeonColors.length];
        bgColors.push(colors.bg);
        borderColors.push(colors.border);
        hoverBgColors.push(colors.border.replace(', 1)', ', 0.6)'));
      }

      return {
        ...dataset,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 4,
        hoverBackgroundColor: hoverBgColors,
        hoverBorderColor: borderColors,
        hoverBorderWidth: 3,
      };
    }

    // Single data point: apply single color based on dataset index
    const colors =
      pastelNeonColors[
        (props.colorIndex + datasetIndex) % pastelNeonColors.length
      ];
    return {
      ...dataset,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      borderWidth: 2,
      borderRadius: 4,
      hoverBackgroundColor: colors.border.replace(', 1)', ', 0.6)'),
      hoverBorderColor: colors.border,
      hoverBorderWidth: 3,
    };
  });

  return data;
}

function translateDayLabel(label: unknown): string {
  if (label == null) return '';
  const labelStr = String(label);
  // Try parsing as date
  const d = parseLocalDate(labelStr);
  if (!isNaN(d.getTime())) {
    const weekday = new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
    }).format(d);
    const dayNum = new Intl.DateTimeFormat('es-MX', { day: 'numeric' }).format(
      d
    );
    const weekdayNorm = weekday.replace(/\.$/, '');
    const capitalized =
      weekdayNorm.charAt(0).toUpperCase() + weekdayNorm.slice(1);
    return `${capitalized} ${dayNum}`;
  }
  const map: Record<string, string> = {
    sunday: 'Domingo',
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sun: 'Dom',
    mon: 'Lun',
    tue: 'Mar',
    wed: 'Mié',
    thu: 'Jue',
    fri: 'Vie',
    sat: 'Sáb',
    domingo: 'Domingo',
    lunes: 'Lunes',
    martes: 'Martes',
    miércoles: 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
    sábado: 'Sábado',
  };
  const lower = labelStr.toLowerCase().replace(/\./g, '');
  const numMatch = labelStr.match(/\d+/);
  if (map[lower]) return numMatch ? `${map[lower]} ${numMatch[0]}` : map[lower];
  // try first three letters
  const key3 = lower.slice(0, 3);
  if (map[key3]) return numMatch ? `${map[key3]} ${numMatch[0]}` : map[key3];
  return labelStr;
}
// end functions

// watch
watch(
  () => props.chartData,
  v => {
    const cloned = v
      ? JSON.parse(JSON.stringify(v))
      : { labels: [], datasets: [] };
    cloned.labels = (cloned.labels || []).map(translateDayLabel);
    safeChartData.value = applyNeonStyles(cloned);
  },
  { immediate: true, deep: true }
);

watch(
  () => props.chartOptions,
  v => {
    safeChartOptions.value = v
      ? JSON.parse(JSON.stringify(v))
      : ({} as ChartOptions<'bar'>);
  },
  { immediate: true, deep: true }
);
// end watch
</script>

<style scoped>
div {
  height: 300px;
}
</style>
