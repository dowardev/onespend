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
import { applyNeonStyles } from '@/utils/chartColors';
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
  colorIndex: 0,
});
// end main

// vars
// Provide reactive shallow refs that mirror the incoming props but are safe for vue-chartjs
const safeChartData = shallowRef<ChartData<'bar'>>(
  props.chartData
    ? applyNeonStyles(
        JSON.parse(
          JSON.stringify({
            ...props.chartData,
            labels: (props.chartData.labels || []).map(translateDayLabel),
          })
        ),
        props.colorIndex
      )
    : { labels: [], datasets: [] }
);
const safeChartOptions = shallowRef<ChartOptions<'bar'>>(
  props.chartOptions
    ? JSON.parse(JSON.stringify(props.chartOptions))
    : ({} as ChartOptions<'bar'>)
);
// end vars

// watch
watch(
  () => props.chartData,
  v => {
    const cloned = v
      ? JSON.parse(JSON.stringify(v))
      : { labels: [], datasets: [] };
    cloned.labels = (cloned.labels || []).map(translateDayLabel);
    // Apply shared pastel-neon palette on updates
    safeChartData.value = applyNeonStyles(cloned, props.colorIndex);
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

// computed
// end computed

// functions
function translateDayLabel(label: unknown): string {
  if (label == null) return '';
  const raw = String(label).trim();
  if (!raw) return '';
  // Remove trailing dots and extra whitespace
  const cleaned = raw.replace(/\./g, '').trim();

  // Spanish abbreviations map (common english/spanish names and abbreviations)
  const spanishMap: Record<string, string> = {
    sunday: 'Dom',
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mié',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sáb',
    sun: 'Dom',
    mon: 'Lun',
    tue: 'Mar',
    wed: 'Mié',
    thu: 'Jue',
    fri: 'Vie',
    sat: 'Sáb',
    domingo: 'Dom',
    lunes: 'Lun',
    martes: 'Mar',
    miércoles: 'Mié',
    miercoles: 'Mié',
    jueves: 'Jue',
    viernes: 'Vie',
    sábado: 'Sáb',
    sabado: 'Sáb',
  };

  // If pattern like "Lunes 6" or "Lun6" (letters + optional space + number)
  const dayNumPattern = /^([A-Za-zÁÉÍÓÚÜñáéíóúü]+)\s*(\d{1,2})$/;
  const mDayNum = cleaned.match(dayNumPattern);
  if (mDayNum) {
    const dayPart = mDayNum[1].toLowerCase();
    const num = mDayNum[2];
    const abbr =
      spanishMap[dayPart] ||
      spanishMap[dayPart.slice(0, 3)] ||
      dayPart.charAt(0).toUpperCase() + dayPart.slice(1).slice(0, 3);
    return `${abbr} ${num}`;
  }

  // Try parsing as a date (ISO strings, timestamps, Date objects)
  const d = parseLocalDate({ d: cleaned });
  if (!isNaN(d.getTime())) {
    // Force Spanish abbreviations using index (avoid Intl locale differences)
    const spanishWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const abbr = spanishWeek[d.getDay()];
    const dayNum = d.getDate();
    return `${abbr} ${dayNum}`;
  }

  const lower = cleaned.toLowerCase();
  const numMatch = cleaned.match(/(\d{1,2})$/);
  if (spanishMap[lower])
    return numMatch ? `${spanishMap[lower]} ${numMatch[1]}` : spanishMap[lower];
  const key3 = lower.slice(0, 3);
  if (spanishMap[key3])
    return numMatch ? `${spanishMap[key3]} ${numMatch[1]}` : spanishMap[key3];

  // If input is just a number (e.g. "6"), return it as-is
  if (/^\d{1,2}$/.test(cleaned)) return cleaned;

  // Fallback: return the cleaned original
  return cleaned;
}
// end functions
</script>

<style scoped>
div {
  height: 300px;
}
</style>
