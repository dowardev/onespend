import { reactive } from 'vue';
import { formatLocalDate } from '@/utils/date';

/**
 * Composable para compartir utilidades comunes entre vistas de performance
 * (day/week/month/year). Centraliza popovers, hovered state, helpers de formato,
 * providerValue y utilidades para PDFs.
 */
export interface ProviderValue {
  efectivo?: number | string | null;
  tarjeta?: number | string | null;
  credito?: number | string | null;
  estimated?: number | string | null;
}

export function usePerformancePeriod() {
  const popovers = reactive({
    mainDate: { open: false as boolean, event: null as Event | null },
    itemMessageHeleper: {
      open: false as boolean,
      event: null as Event | null,
      message: '.' as string,
    },
  });

  const hovered = reactive<Record<string, boolean>>({
    costSales: false,
    grossProfitCost: false,
    netProfit: false,
    dailyBreakEvenPoint: false,
    netMarginDay: false,
  });

  function setHover(key: string, value: boolean) {
    try {
      hovered[key] = value;
    } catch {
      // noop
    }
  }

  function isoDate(params: { d: Date }) {
    const { d } = params;
    return formatLocalDate({ d });
  }

  function providerValue(params: { p: ProviderValue }) {
    const p = params.p;
    try {
      const efectivo = Number(p?.efectivo || 0);
      const tarjeta = Number(p?.tarjeta || 0);
      const credito = Number(p?.credito || 0);
      const sumPayments = efectivo + tarjeta + credito;
      if (sumPayments > 0) return sumPayments;
      const e = Number(p?.estimated || 0);
      return e;
    } catch {
      return 0;
    }
  }

  function formatCurrency(params: { val: number | null | undefined }) {
    const val = params.val;
    const n = Number(val ?? 0);
    const nf = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (!Number.isFinite(n)) {
      return nf.format(0);
    }

    return nf.format(n);
  }

  function formatPercent(params: { val: number | null | undefined }) {
    const val = params.val;
    const n = Number(val ?? 0);
    if (!Number.isFinite(n)) return '0';
    return String(Math.round(n));
  }

  return {
    popovers,
    hovered,
    setHover,
    isoDate,
    providerValue,
    formatCurrency,
    formatPercent,
  };
}
