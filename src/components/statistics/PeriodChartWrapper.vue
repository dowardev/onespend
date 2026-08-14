<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <div style="height: 100%">
    <DayPerformanceChart
      :chart-data="styledChartData"
      :chart-options="chartOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue';
import DayPerformanceChart from '@/views/statistics/performance/day/DayPerformanceChart.vue';
import type { ChartData, ChartOptions } from 'chart.js';

const props = withDefaults(
  defineProps<{
    chartData: ChartData<'bar'> | any;
    chartOptions?: ChartOptions<'bar'> | null;
    colorIndex?: number;
  }>(),
  { colorIndex: 1, chartOptions: null }
);

// safe reactive clone used for the canvas chart
const styledChartData = shallowRef<ChartData<'bar'>>(
  props.chartData
    ? JSON.parse(JSON.stringify(props.chartData))
    : { labels: [], datasets: [] }
);

// Pastel neon colors palette (copiado de DayChartComponent)
const pastelNeonColors = [
  { bg: 'rgba(255, 182, 193, 0.4)', border: 'rgba(255, 105, 180, 1)' },
  { bg: 'rgba(173, 216, 230, 0.4)', border: 'rgba(0, 191, 255, 1)' },
  { bg: 'rgba(144, 238, 144, 0.4)', border: 'rgba(0, 255, 127, 1)' },
  { bg: 'rgba(255, 218, 185, 0.4)', border: 'rgba(255, 165, 0, 1)' },
  { bg: 'rgba(221, 160, 221, 0.4)', border: 'rgba(186, 85, 211, 1)' },
  { bg: 'rgba(255, 255, 186, 0.4)', border: 'rgba(255, 215, 0, 1)' },
  { bg: 'rgba(176, 224, 230, 0.4)', border: 'rgba(64, 224, 208, 1)' },
  { bg: 'rgba(255, 182, 182, 0.4)', border: 'rgba(255, 99, 71, 1)' },
];

function applyNeonStyles(data: ChartData<'bar'>): ChartData<'bar'> {
  if (!data || !data.datasets) return data;

  const cloned = JSON.parse(JSON.stringify(data));

  cloned.datasets = (cloned.datasets || []).map(
    (dataset: any, datasetIndex: number) => {
      const dataArray = Array.isArray(dataset.data) ? dataset.data : [];

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
    }
  );

  return cloned;
}

watch(
  () => props.chartData,
  v => {
    try {
      const cloned = v
        ? JSON.parse(JSON.stringify(v))
        : { labels: [], datasets: [] };
      styledChartData.value = applyNeonStyles(cloned as ChartData<'bar'>);
    } catch (_e) {
      styledChartData.value = props.chartData
        ? JSON.parse(JSON.stringify(props.chartData))
        : { labels: [], datasets: [] };
    }
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
div {
  height: 100%;
}
</style>
