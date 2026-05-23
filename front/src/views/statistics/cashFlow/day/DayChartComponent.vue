<template>
  <div>
    <Bar v-if="canRenderChart" :data="safeChartData" :options="safeChartOptions" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef, watch, onMounted, computed } from 'vue';
import { Bar } from 'vue-chartjs';
import type { ChartOptions, ChartData } from 'chart.js';
import { parseLocalDate, safeIntlFormat } from '@/utils/date';
import { applyNeonStyles } from '@/utils/chartColors';
import { useChart } from '@/composables/useChart';

// interface
interface Props {
  chartData?: ChartData<'bar'>;
  chartOptions?: ChartOptions<'bar'>;
  colorIndex?: number;
}
// end interface

// props
const props = defineProps<Props>();
// end props

// Chart composable
const { loadChartDependencies, isLoaded } = useChart();

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
const safeChartData = shallowRef<ChartData<'bar'>>(
  props.chartData ? JSON.parse(JSON.stringify(props.chartData)) : { labels: [], datasets: [] },
);
const safeChartOptions = shallowRef<ChartOptions<'bar'>>(
  props.chartOptions ? JSON.parse(JSON.stringify(props.chartOptions)) : ({} as ChartOptions<'bar'>),
);
// end vars

// Load chart dependencies on mount
onMounted(async () => {
  try {
    await loadChartDependencies();
  } catch (error) {
    console.error('Failed to load chart dependencies:', error);
  }
});

// functions
// Use shared color utility which maps positive values to --ion-color-success
// and negative values to --ion-color-danger.

function translateDayLabel(params: { label: unknown }): string {
  const { label } = params;
  if (label == null) return '';
  const labelStr = String(label);
  // Try parsing as date
  const d = parseLocalDate({ d: labelStr });
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
// end functions

// watch
watch(
  () => props.chartData,
  (v) => {
    const cloned = v ? JSON.parse(JSON.stringify(v)) : { labels: [], datasets: [] };
    cloned.labels = (cloned.labels || []).map((l) => translateDayLabel({ label: l }));
    safeChartData.value = applyNeonStyles(cloned);
    // Debug: show final chart data sent to vue-chartjs
    try {
      // eslint-disable-next-line no-console
      console.log('[DayChart] safeChartData:', JSON.parse(JSON.stringify(safeChartData.value)));
    } catch (_e) {
      /* ignore */
    }
  },
  { immediate: true, deep: true },
);

watch(
  () => props.chartOptions,
  (v) => {
    safeChartOptions.value = v ? JSON.parse(JSON.stringify(v)) : ({} as ChartOptions<'bar'>);
  },
  { immediate: true, deep: true },
);
// end watch
</script>

<style scoped>
div {
  height: 300px;
}
</style>
