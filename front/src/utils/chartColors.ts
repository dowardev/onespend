import type { ChartData } from 'chart.js';
import { registerCleanup } from './domCleanup';

// Use Ionic theme colors (CSS variables) for success/danger
// We rely on the theme providing both the RGB var (e.g. --ion-color-success-rgb)
// and the color var (e.g. --ion-color-success). Chart.js running on canvas
// accepts CSS color strings; using `rgba(var(--ion-color-*-rgb), alpha)` lets
// us keep proper alpha channels for backgrounds while using the exact theme
// hues.

const DEFAULT_SUCCESS = '#10dc60'; // light green (Ionic-ish)
const DEFAULT_DANGER = '#ff3b30'; // red

function getComputedVar(name: string): string {
  if (typeof window === 'undefined' || !window.getComputedStyle) return '';
  try {
    const elems = [document.documentElement, document.body, document.querySelector('ion-app')].filter(Boolean) as Element[];
    for (const el of elems) {
      try {
        const v = getComputedStyle(el as Element).getPropertyValue(name).trim();
        if (v) {
          // eslint-disable-next-line no-console
          console.debug('[chartColors] found CSS var', name, 'on', el && (el as any).tagName ? (el as any).tagName : el, v);
          return v;
        }
      } catch (_e) {
        // continue
      }
    }
    return '';
  } catch (_e) {
    return '';
  }
}

function getRawVar(name: string): string {
  return getComputedVar(name) || '';
}

function hexToRgb(hex: string): string | null {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return null;
}

function rgbStringToRgb(s: string): string | null {
  // accepts formats like 'rgb(1,2,3)' or 'rgba(1,2,3,1)'
  const m = s.match(/(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (m) return `${m[1]}, ${m[2]}, ${m[3]}`;
  const m2 = s.match(/rgb\(([^)]+)\)/);
  if (m2) return m2[1];
  return null;
}

function resolveColorRgb(varNameRgb: string, varNameHex: string, fallbackHex: string) {
  // Try direct rgb CSS variable first (should be like "46, 204, 113")
  const vRgb = getComputedVar(varNameRgb);
  if (vRgb) return vRgb;

  // Then try the color variable (could be hex or rgb())
  const vColor = getComputedVar(varNameHex);
  if (vColor) {
    // If it's already a comma-separated rgb() inside, extract numbers
    const fromRgb = rgbStringToRgb(vColor);
    if (fromRgb) return fromRgb;
    // If hex, convert
    const fromHex = hexToRgb(vColor);
    if (fromHex) return fromHex;
  }

  // If the computed var returned something like 'var(--other-var)' or wasn't
  // resolvable above, try forcing resolution by using a temporary element and
  // setting its color to `var(--ion-color-...)`, then reading computed color.
  try {
    if (typeof document !== 'undefined' && document.createElement) {
      const el = document.createElement('span');
      el.style.display = 'none';
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      el.style.visibility = 'hidden';
      // use var() form for the property
      el.style.color = `var(${varNameHex})`;
      el.setAttribute('data-chart-colors-temp', 'true');
      
      // Use document.body instead of documentElement for better isolation
      document.body.appendChild(el);
      const computed = getComputedStyle(el).color;
      
      // Register cleanup task
      registerCleanup(`chart-colors-${varNameHex}`, () => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }, el);
      
      // Immediate cleanup
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      
      const forced = rgbStringToRgb(computed);
      if (forced) return forced;
      const fromHex2 = hexToRgb(computed);
      if (fromHex2) return fromHex2;
    }
  } catch (_e) {
    // ignore
  }

  // final fallback: convert provided fallback hex
  return hexToRgb(fallbackHex) || '16, 220, 96';
}

const SUCCESS_RGB = resolveColorRgb('--ion-color-success-rgb', '--ion-color-success', DEFAULT_SUCCESS);
const DANGER_RGB = resolveColorRgb('--ion-color-danger-rgb', '--ion-color-danger', DEFAULT_DANGER);

const successBg = `rgba(${SUCCESS_RGB}, 0.15)`;
const successBorder = `rgba(${SUCCESS_RGB}, 1)`;
const successHover = `rgba(${SUCCESS_RGB}, 0.25)`;

const dangerBg = `rgba(${DANGER_RGB}, 0.15)`;
const dangerBorder = `rgba(${DANGER_RGB}, 1)`;
const dangerHover = `rgba(${DANGER_RGB}, 0.25)`;

function isEgresoLabel(label: unknown) {
  if (!label) return false;
  const s = String(label).toLowerCase();
  return /egres|egreso|expense|gasto|outcome|out\b/.test(s);
}

function buildColors(type: 'success' | 'danger') {
  const varRgbName = type === 'danger' ? '--ion-color-danger-rgb' : '--ion-color-success-rgb';
  const varColorName = type === 'danger' ? '--ion-color-danger' : '--ion-color-success';
  const fallbackHex = type === 'danger' ? DEFAULT_DANGER : DEFAULT_SUCCESS;

  // Prefer explicit rgb var or convertible color; otherwise fall back to raw CSS var (keeps exact Ionic color)
  const raw = getRawVar(varColorName);
  const rgbResolved = resolveColorRgb(varRgbName, varColorName, fallbackHex);

  // If raw exists but is not convertible to rgb (e.g. contains another var()), use it directly
  const rawIsUseful = raw && !/^\s*$/.test(raw);

  // Try to get numeric rgb string from rgbResolved
  const numericRgb = rgbResolved && rgbResolved.split && rgbResolved.split(',').length >= 3 ? rgbResolved : null;

  // Border: prefer the raw CSS var (keeps exact Ionic color string like hex or var())
  const borderColor = rawIsUseful ? raw : `rgba(${numericRgb || hexToRgb(fallbackHex)}, 1)`;

  // Background: use a semi-transparent rgba to preserve neon effect
  const baseRgb = numericRgb || hexToRgb(fallbackHex) || '16, 220, 96';
  const bgColor = `rgba(${baseRgb}, 0.16)`; // subtle translucent background
  const hoverColor = `rgba(${baseRgb}, 0.28)`; // slightly stronger on hover

  return {
    bg: bgColor,
    border: borderColor,
    hover: hoverColor,
  };
}

function pickColorForValue(v: unknown, datasetLabel?: unknown, datasetIndex?: number) {
  // Prefer explicit dataset label (e.g. 'egresos')
  if (isEgresoLabel(datasetLabel)) return buildColors('danger');
  // If index 1 (common pattern: [ingresos, egresos]) treat as danger
  if (typeof datasetIndex === 'number' && datasetIndex === 1) return buildColors('danger');

  const n = typeof v === 'number' ? v : (typeof v === 'string' && v !== '' ? Number(v) : NaN);
  if (!isNaN(n) && n < 0) return buildColors('danger');
  return buildColors('success');
}

export function applyNeonStyles(
  params: { data: ChartData<'bar'>; colorIndex?: number } | ChartData<'bar'> | undefined
): ChartData<'bar'> {
  // Backwards-compatible signature retained
  let data: ChartData<'bar'> | undefined;
  if (params && typeof params === 'object' && 'data' in (params as any)) {
    data = (params as any).data as ChartData<'bar'>;
  } else {
    data = params as ChartData<'bar'> | undefined;
  }

  if (!data || !data.datasets) return data || ({ labels: [], datasets: [] } as ChartData<'bar'>);

  // Debug info to help trace why colors appear incorrect in runtime.
  try {
    const ss = resolveColorRgb('--ion-color-success-rgb', '--ion-color-success', DEFAULT_SUCCESS);
    const dd = resolveColorRgb('--ion-color-danger-rgb', '--ion-color-danger', DEFAULT_DANGER);
    // eslint-disable-next-line no-console
    console.log('[chartColors] resolved success rgb:', ss, 'danger rgb:', dd);
  } catch (_e) {
    /* ignore */
  }

  // If there are exactly two datasets, assume convention: [ingresos, egresos]
  const assumeTwoSets = data.datasets.length === 2;

  data.datasets = data.datasets.map((dataset, datasetIndex) => {
    const dataArray = Array.isArray(dataset.data) ? dataset.data : [];

    // If dataset has multiple data points, color each bar by sign or by dataset index when there are two datasets
    if (dataArray.length > 1) {
      const bgColors: string[] = [];
      const borderColors: string[] = [];
      const hoverBgColors: string[] = [];

      for (let i = 0; i < dataArray.length; i++) {
        const colors = assumeTwoSets
          ? buildColors(datasetIndex === 1 ? 'danger' : 'success')
          : pickColorForValue(dataArray[i], dataset.label, datasetIndex);
        bgColors.push(colors.bg);
        borderColors.push(colors.border);
        hoverBgColors.push(colors.hover);
      }
      try {
        // eslint-disable-next-line no-console
        console.log('[chartColors] dataset', datasetIndex, dataset.label, 'per-item colors used', bgColors.slice(0, 5));
      } catch (_e) {
        /* noop */
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

    // Single data point: decide color from its (first) value
    const val = dataArray.length === 1 ? dataArray[0] : (dataset.data as any) || NaN;
    const colors = assumeTwoSets
      ? buildColors(datasetIndex === 1 ? 'danger' : 'success')
      : pickColorForValue(val, dataset.label, datasetIndex);
    try {
      // eslint-disable-next-line no-console
      console.log('[chartColors] dataset', datasetIndex, dataset.label, 'single colors used', colors);
    } catch (_e) {
      /* noop */
    }
    return {
      ...dataset,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      borderWidth: 2,
      borderRadius: 4,
      hoverBackgroundColor: colors.hover,
      hoverBorderColor: colors.border,
      hoverBorderWidth: 3,
    };
  });

  return data;
}
