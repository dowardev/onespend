<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <div class="day-performance-chart" style="height: 100%">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref } from 'vue';
import type { ChartOptions, ChartData } from 'chart.js';
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

// Register required Chart.js components
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const props = defineProps<{
  chartData: ChartData<'bar'> | null;
  chartOptions?: ChartOptions<'bar'> | null;
  colorIndex?: number;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart<'bar'> | null = null;

function createChart() {
  if (!canvasRef.value) return;
  // clean up previous instance if any
  if (chartInstance) {
    try {
      chartInstance.destroy();
    } catch (_e) {
      // noop
    }
    chartInstance = null;
  }

  try {
    chartInstance = new Chart(
      canvasRef.value.getContext('2d') as CanvasRenderingContext2D,
      {
        type: 'bar',
        data: props.chartData || { labels: [], datasets: [] },
        options: (props.chartOptions || {}) as ChartOptions<'bar'>,
      }
    );
  } catch (e) {
    console.error('[DayPerformanceChart] failed to create chart', e);
  }
}

onMounted(() => {
  createChart();
});

onBeforeUnmount(() => {
  if (chartInstance) {
    try {
      chartInstance.destroy();
    } catch (_e) {
      // noop
    }
    chartInstance = null;
  }
});

watch(
  () => props.chartData,
  newVal => {
    try {
      if (!chartInstance) {
        createChart();
        return;
      }
      chartInstance.data = JSON.parse(
        JSON.stringify(newVal || { labels: [], datasets: [] })
      ) as ChartData<'bar'>;
      chartInstance.update();
    } catch (e) {
      console.error('[DayPerformanceChart] update error', e);
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => props.chartOptions,
  newOpt => {
    try {
      if (!chartInstance) return;
      chartInstance.options = JSON.parse(
        JSON.stringify(newOpt || {})
      ) as ChartOptions<'bar'>;
      chartInstance.update();
    } catch (e) {
      console.error('[DayPerformanceChart] options update error', e);
    }
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.day-performance-chart {
  width: 100%;
  height: 320px;
}
</style>
