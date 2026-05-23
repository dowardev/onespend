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

// interface
interface Props {
  chartData?: ChartData<'bar'>;
  chartOptions?: ChartOptions<'bar'>;
  colorIndex?: number;
}

// props
const props = withDefaults(defineProps<Props>(), {
  colorIndex: 0,
  chartData: () => ({ labels: [], datasets: [] }) as ChartData<'bar'>,
  chartOptions: () => ({}) as ChartOptions<'bar'>,
});

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

// vars
const safeChartData = shallowRef<ChartData<'bar'>>(
  props.chartData
    ? applyNeonStyles(
        JSON.parse(
          JSON.stringify({
            ...props.chartData,
            labels: (props.chartData.labels || []).map(translateMonthLabel),
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

// Load chart dependencies on mount (await like other chart components)
onMounted(async () => {
  try {
    await loadChartDependencies();
  } catch (error) {
    console.error('Failed to load chart dependencies:', error);
  }
});

// watch
watch(
  () => props.chartData,
  (v) => {
    const cloned = v ? JSON.parse(JSON.stringify(v)) : { labels: [], datasets: [] };
    cloned.labels = (cloned.labels || []).map(translateMonthLabel);
    safeChartData.value = applyNeonStyles(cloned, props.colorIndex);
    // bump key to force Bar remount (works around chart update detection issues)
    try {
      chartKey.value = (chartKey.value || 0) + 1;
    } catch (_e) {}
    // debug logs removed
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

// watch chart loading state to help debugging
watch(
  () => isLoaded.value,
  (v) => {
    // debug logs removed
  },
  { immediate: true },
);

// functions
function translateMonthLabel(label: unknown): string {
  if (label == null) return '';
  const labelStr = String(label).trim();

  // If label is YYYY-MM (month key) -> format as "Ene 2025"
  if (/^\d{4}-\d{2}$/.test(labelStr)) {
    try {
      const d = parseLocalDate({ d: labelStr + '-01' });
      const formatted = safeIntlFormat(d, 'es-MX', { month: 'short', year: 'numeric' });
      if (formatted) return formatted.replace(/\./g, '').replace(/^(.)/, (s) => s.toUpperCase());
    } catch (_e) {
      // fall through
    }
  }

  // If label is a full ISO date YYYY-MM-DD, treat it as a month label as well
  if (/^\d{4}-\d{2}-\d{2}$/.test(labelStr)) {
    try {
      const d = parseLocalDate({ d: labelStr });
      const formatted = safeIntlFormat(d, 'es-MX', { month: 'short', year: 'numeric' });
      if (formatted) return formatted.replace(/\./g, '').replace(/^(.)/, (s) => s.toUpperCase());
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

  // Fallback: try to parse as date and return month-year
  try {
    const d = parseLocalDate({ d: labelStr });
    if (!isNaN(d.getTime())) {
      const formatted = safeIntlFormat(d, 'es-MX', { month: 'short', year: 'numeric' });
      if (formatted) return formatted.replace(/\./g, '').replace(/^(.)/, (s) => s.toUpperCase());
    }
  } catch (_e) {
    // ignore
  }

  return labelStr;
}
</script>

<style scoped>
div {
  height: 300px;
}
</style>
