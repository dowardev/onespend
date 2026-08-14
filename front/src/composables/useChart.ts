// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ref } from 'vue';
import type { Chart as ChartJS } from 'chart.js';

export function useChart() {
  const isLoaded = ref(false);
  const loading = ref(false);
  let ChartJSInstance: typeof ChartJS | null = null;
  let chartComponents: any = null;

  async function loadChartDependencies() {
    if (isLoaded.value || loading.value) {
      return { ChartJS: ChartJSInstance, chartComponents };
    }

    loading.value = true;

    try {
      // Explicitly import Chart.js components
      const { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } =
        await import('chart.js');

      // Explicitly register components to ensure LinearScale is available
      Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

      ChartJSInstance = Chart;
      chartComponents = {
        CategoryScale,
        LinearScale,
        BarElement,
        Title,
        Tooltip,
        Legend,
      };

      isLoaded.value = true;
    } catch (error) {
      console.error('Failed to load Chart.js dependencies:', error);
    } finally {
      loading.value = false;
    }

    return { ChartJS: ChartJSInstance, chartComponents };
  }

  return {
    loadChartDependencies,
    isLoaded,
    loading,
  };
}
