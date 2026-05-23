<template>
  <div>
    <Bar v-if="canRenderChart" :key="chartKey" :data="safeChartData" :options="safeChartOptions" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef, watch, onMounted, computed, ref } from 'vue';
import { Bar } from 'vue-chartjs';
import type { ChartOptions, ChartData } from 'chart.js';
import { applyNeonStyles } from '@/utils/chartColors';
import { parseLocalDate, safeIntlFormat } from '@/utils/date';
import { useChart } from '@/composables/useChart';

// Initialize chart dependencies
const { loadChartDependencies, isLoaded } = useChart();
onMounted(async () => {
  try {
    await loadChartDependencies();
  } catch (e) {
    console.error('Failed to load chart dependencies:', e);
  }
});

// interface
interface Props {
  chartData?: ChartData<'bar'>;
  chartOptions?: ChartOptions<'bar'>;
  colorIndex?: number;
}
// end interface

// main
const props = withDefaults(defineProps<Props>(), {
  colorIndex: 0,
  chartData: () => ({ labels: [], datasets: [] }) as ChartData<'bar'>,
  chartOptions: () => ({}) as ChartOptions<'bar'>,
});
// end main

// computed
const hasData = computed(
  () =>
    props.chartData &&
    props.chartData.labels &&
    props.chartData.labels.length > 0 &&
    props.chartData.datasets &&
    props.chartData.datasets.length > 0,
);

const canRenderChart = computed(() => hasData.value && isLoaded.value);
// end computed

// vars
// Provide reactive shallow refs that mirror the incoming props but are safe for vue-chartjs
const safeChartData = shallowRef<ChartData<'bar'>>(
  props.chartData
    ? applyNeonStyles(
        JSON.parse(
          JSON.stringify({
            ...props.chartData,
            labels: (props.chartData.labels || []).map(translateDayLabel),
          }),
        ),
        props.colorIndex,
      )
    : { labels: [], datasets: [] },
);
const safeChartOptions = shallowRef<ChartOptions<'bar'>>(
  props.chartOptions ? JSON.parse(JSON.stringify(props.chartOptions)) : ({} as ChartOptions<'bar'>),
);

// Force remount key to ensure vue-chartjs fully re-renders when data changes
const chartKey = ref(0);
// end vars

// watch
// update safeChartData whenever props.chartData changes
watch(
  () => props.chartData,
  (v) => {
    const cloned = v ? JSON.parse(JSON.stringify(v)) : { labels: [], datasets: [] };
    cloned.labels = (cloned.labels || []).map(translateDayLabel);
    safeChartData.value = applyNeonStyles(cloned, props.colorIndex);
    try {
      chartKey.value = (chartKey.value || 0) + 1;
    } catch (_e) {}
  },
  { immediate: true, deep: true },
);
// end watch

// computed
// end computed

// functions
function translateDayLabel(label: unknown): string {
  if (label == null) return '';
  const labelStr = String(label).trim();

  // If the label is a pure 4-digit year (e.g. "2021") return it as-is
  if (/^\d{4}$/.test(labelStr)) return labelStr;

  // Handle year and year-month labels like "2023-05", "202305" (month optional)
  const ymMatch = labelStr.match(/^(\d{4})(?:[-/]?(\d{1,2}))?(?:[-/]?\d{1,2})?$/);
  if (ymMatch) {
    const year = ymMatch[1];
    const monthPart = ymMatch[2];
    if (!monthPart) {
      return year;
    } else {
      const monthNum = Number(monthPart);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        const d = new Date(Number(year), monthNum - 1, 1);
        // Format like "May 2023" in es-MX locale and capitalize month
        const monthYear = safeIntlFormat(d, 'es-MX', { month: 'short', year: 'numeric' });
        if (monthYear) {
          const parts = monthYear.split(' ');
          parts[0] = parts[0].replace(/\.$/, '');
          parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
          return parts.join(' ');
        }
      }
    }
  }

  // Try parsing as full date (day-level) and keep previous behavior
  const d = new Date(labelStr);
  if (!isNaN(d.getTime())) {
    const weekday = safeIntlFormat(d, 'es-MX', { weekday: 'short' }) || '';
    const dayNum = safeIntlFormat(d, 'es-MX', { day: 'numeric' }) || '';
    const weekdayNorm = weekday.replace(/\.$/, '');
    const capitalized = weekdayNorm.charAt(0).toUpperCase() + weekdayNorm.slice(1);
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
</script>

<style scoped>
div {
  height: 300px;
}
</style>
