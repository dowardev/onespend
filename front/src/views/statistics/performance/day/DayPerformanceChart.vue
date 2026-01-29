<template>
  <div class="day-performance-chart" style="height: 100%">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref, computed } from 'vue';
import type { ChartOptions, ChartData } from 'chart.js';
import { useChart } from '@/composables/useChart';

// Initialize chart dependencies
const { loadChartDependencies, isLoaded } = useChart();
onMounted(loadChartDependencies);

const props = defineProps<{
  chartData: ChartData<'bar'> | null;
  chartOptions?: ChartOptions<'bar'> | null;
  colorIndex?: number;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart<'bar'> | null = null;

const hasData = computed(() => 
  props.chartData && 
  props.chartData.labels && 
  props.chartData.labels.length > 0 &&
  props.chartData.datasets && 
  props.chartData.datasets.length > 0
);

const canRenderChart = computed(() => hasData.value && isLoaded.value);

function createChart() {
  if (!canvasRef.value || !canRenderChart.value) return;
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
