import type { ChartData } from 'chart.js';

// Pastel neon colors palette
export const pastelNeonColors = [
  { bg: 'rgba(255, 182, 193, 0.4)', border: 'rgba(255, 105, 180, 1)' }, // Pink
  { bg: 'rgba(173, 216, 230, 0.4)', border: 'rgba(0, 191, 255, 1)' }, // Light Blue
  { bg: 'rgba(144, 238, 144, 0.4)', border: 'rgba(0, 255, 127, 1)' }, // Light Green
  { bg: 'rgba(255, 218, 185, 0.4)', border: 'rgba(255, 165, 0, 1)' }, // Peach/Orange
  { bg: 'rgba(221, 160, 221, 0.4)', border: 'rgba(186, 85, 211, 1)' }, // Plum/Purple
  { bg: 'rgba(255, 255, 186, 0.4)', border: 'rgba(255, 215, 0, 1)' }, // Light Yellow
  { bg: 'rgba(176, 224, 230, 0.4)', border: 'rgba(64, 224, 208, 1)' }, // Powder Blue/Turquoise
  { bg: 'rgba(255, 182, 182, 0.4)', border: 'rgba(255, 99, 71, 1)' }, // Coral
];

export function applyNeonStyles(
  params: { data: ChartData<'bar'>; colorIndex?: number } | ChartData<'bar'> | undefined
): ChartData<'bar'> {
  // Support two call styles:
  //  - applyNeonStyles(chartData)
  //  - applyNeonStyles({ data: chartData, colorIndex })
  let data: ChartData<'bar'> | undefined;
  let colorIndex = 0;

  if (params && typeof params === 'object' && 'data' in (params as any)) {
    data = (params as any).data as ChartData<'bar'>;
    colorIndex = (params as any).colorIndex ?? 0;
  } else {
    data = params as ChartData<'bar'> | undefined;
  }

  if (!data || !data.datasets) return data || ({ labels: [], datasets: [] } as ChartData<'bar'>);

  data.datasets = data.datasets.map((dataset, datasetIndex) => {
    const dataArray = Array.isArray(dataset.data) ? dataset.data : [];

    // If dataset has multiple data points, apply different colors to each bar
    if (dataArray.length > 1) {
      const bgColors: string[] = [];
      const borderColors: string[] = [];
      const hoverBgColors: string[] = [];

      for (let i = 0; i < dataArray.length; i++) {
        const colors =
          pastelNeonColors[(colorIndex + i) % pastelNeonColors.length];
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

    // Single data point: apply single color based on dataset index
    const colors =
      pastelNeonColors[(colorIndex + datasetIndex) % pastelNeonColors.length];
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
  });

  return data;
}
