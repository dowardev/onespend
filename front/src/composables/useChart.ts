import { ref } from 'vue';
import type { Chart as ChartJS, ChartData, ChartOptions } from 'chart.js';

export function useChart() {
  const isLoaded = ref(false);
  const loading = ref(false);
  let ChartJSInstance: typeof ChartJS | null = null;
  let chartComponents: any = null;

  async function loadChartDependencies() {
    if (isLoaded.value) {
      return { ChartJS: ChartJSInstance, chartComponents };
    }

    if (loading.value) {
      // Wait for loading to complete
      await new Promise(resolve => {
        const checkLoaded = () => {
          if (isLoaded.value) resolve(true);
          else setTimeout(checkLoaded, 50);
        };
        checkLoaded();
      });
      return { ChartJS: ChartJSInstance, chartComponents };
    }

    loading.value = true;

    try {
      // Dynamically import Chart.js and required components
      const [
        chartModule,
        { CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend }
      ] = await Promise.all([
        import('chart.js'),
        import('chart.js/auto')
      ]);

      ChartJSInstance = chartModule.Chart || chartModule.default;
      chartComponents = {
        CategoryScale,
        LinearScale,
        BarElement,
        Title,
        Tooltip,
        Legend
      };

      // Register components
      if (ChartJSInstance && ChartJSInstance.register) {
        ChartJSInstance.register(
          CategoryScale,
          LinearScale,
          BarElement,
          Title,
          Tooltip,
          Legend
        );
      }

      isLoaded.value = true;
    } catch (error) {
      console.error('Failed to load Chart.js:', error);
      throw error;
    } finally {
      loading.value = false;
    }

    return { ChartJS: ChartJSInstance, chartComponents };
  }

  return {
    loadChartDependencies,
    isLoaded,
    loading
  };
}