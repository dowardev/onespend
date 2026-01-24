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
import { parseLocalDate, safeIntlFormat } from '@/utils/date';

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
  chartData: () => ({ labels: [], datasets: [] }) as ChartData<'bar'>,
  chartOptions: () => ({}) as ChartOptions<'bar'>,
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

// watch
watch(
  () => props.chartData,
  v => {
    const cloned = v
      ? JSON.parse(JSON.stringify(v))
      : { labels: [], datasets: [] };
    cloned.labels = (cloned.labels || []).map(translateDayLabel);
    // Apply neon styles so monthly chart uses the shared pastel-neon palette
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
  const labelStr = String(label).trim();

  // If label is YYYY-MM (month key) -> format as "Ene 2025"
  if (/^\d{4}-\d{2}$/.test(labelStr)) {
      try {
        const d = parseLocalDate({ d: labelStr + '-01' });
        const formatted = safeIntlFormat(d, 'es-MX', { month: 'short', year: 'numeric' });
        if (formatted) return formatted.replace(/\./g, '').replace(/^(.)/, s => s.toUpperCase());
      } catch (_e) {
        // fall through
      }
  }

  // If label is a full ISO date YYYY-MM-DD, treat it as a month label as well
  if (/^\d{4}-\d{2}-\d{2}$/.test(labelStr)) {
    try {
      const d = parseLocalDate({ d: labelStr });
      const formatted = safeIntlFormat(d, 'es-MX', { month: 'short', year: 'numeric' });
      if (formatted) return formatted.replace(/\./g, '').replace(/^(.)/, s => s.toUpperCase());
    } catch (_e) {
      // fall through
    }
  }

  // If label already looks like 'MMM yyyy' (e.g. 'ene 2025' or 'Ene 2025'), normalize capitalization
  if (/^[A-Za-zÀ-ÖØ-öø-ÿ]{3}\s+\d{4}$/.test(labelStr)) {
    const parts = labelStr.split(/\s+/);
    parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return parts.join(' ');
  }

  // Try parsing full date (ISO fallback) and return short weekday + day
  const d = parseLocalDate(labelStr);
  if (!isNaN(d.getTime())) {
    const weekday = safeIntlFormat(d, 'es-MX', { weekday: 'short' });
    const dayNum = safeIntlFormat(d, 'es-MX', { day: 'numeric' });
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
</script>

<style scoped>
div {
  height: 300px;
}
</style>
