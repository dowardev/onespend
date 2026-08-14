<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

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
// end vars

// watch
watch(
  () => props.chartData,
  v => {
    const cloned = v
      ? JSON.parse(JSON.stringify(v))
      : { labels: [], datasets: [] };
    cloned.labels = (cloned.labels || []).map(translateDayLabel);
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

  // If the label is a pure 4-digit year (e.g. "2021") return it as-is
  if (/^\d{4}$/.test(labelStr)) return labelStr;

  // Handle year and year-month labels like "2023-05", "202305" (month optional)
  const ymMatch = labelStr.match(
    /^(\d{4})(?:[-/]?(\d{1,2}))?(?:[-/]?\d{1,2})?$/
  );
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
        const monthYear = new Intl.DateTimeFormat('es-MX', {
          month: 'short',
          year: 'numeric',
        }).format(d);
        const parts = monthYear.split(' ');
        parts[0] = parts[0].replace(/\.$/, '');
        parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        return parts.join(' ');
      }
    }
  }

  // Try parsing as full date (day-level) and keep previous behavior
  const d = new Date(labelStr);
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
</script>

<style scoped>
div {
  height: 300px;
}
</style>
