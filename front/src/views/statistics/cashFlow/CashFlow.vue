<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Cash Flow</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-grid style="height: 100%">
        <ion-row style="height: 100%; overflow: auto">
          <!-- day -->
<ion-col size="12" size-lg="6">
          <DayComponent
              v-model:popover-open="day.popovers.mainDate.open"
              v-model:popover-event="day.popovers.mainDate.event"
              :chart-data="day.chartData"
              :chart-options="day.chartOptions"
              :day-label="day.dayLabel"
              :formatted-daily-profit="day.formattedDailyProfit"
              :selected-date="day.selectedDate"
              @prev="dayPrev"
              @next="dayNext"
              @popover-date-change="dayOnPopoverDateChange"
              @reset-today="dayResetToToday"
            />
          </ion-col>

          <!-- week -->
          <ion-col size="12" size-lg="6">
            <WeekComponent
              v-model:popover-open="week.popovers.mainDate.open"
              v-model:popover-event="week.popovers.mainDate.event"
              :chart-data="week.chartData"
              :chart-options="week.chartOptions"
              :week-range-label="week.weekRangeLabel"
              :formatted-weekly-profit="week.formattedWeeklyProfit"
              :selected-date="week.selectedDate"
              @prev="weekPrev"
              @next="weekNext"
              @popover-date-change="weekOnPopoverDateChange"
              @reset-today="weekResetToToday"
            />
          </ion-col>

          <!-- month -->
          <ion-col size="12" size-lg="6">
            <MonthComponent
              v-model:popover-open="month.popovers.mainDate.open"
              v-model:popover-event="month.popovers.mainDate.event"
              :chart-data="month.chartData"
              :chart-options="month.chartOptions"
              :month-range-label="month.monthRangeLabel"
              :formatted-monthly-profit="month.formattedMonthlyProfit"
              :selected-date="month.selectedDate"
              @prev="monthPrev"
              @next="monthNext"
              @popover-date-change="monthOnPopoverDateChange"
              @reset-today="monthResetToToday"
            />
          </ion-col>

          <!-- year -->
          <ion-col size="12" size-lg="6">
            <YearComponent
              v-model:popover-open="year.popovers.mainDate.open"
              v-model:popover-event="year.popovers.mainDate.event"
              :chart-data="year.chartData"
              :chart-options="year.chartOptions"
              :year-label="year.yearLabel"
              :formatted-year-profit="year.formattedYearProfit"
              :selected-date="year.selectedDate"
              @prev="yearPrev"
              @next="yearNext"
              @popover-date-change="yearOnPopoverDateChange"
              @reset-today="yearResetToToday"
            />
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
// Imports
import { reactive, ref, computed, onMounted } from 'vue';
import {
  format,
  addDays,
  startOfWeek,
  differenceInCalendarWeeks,
  startOfMonth,
  addMonths,
  differenceInCalendarMonths,
  startOfYear,
  addMonths as addMonths2,
  differenceInCalendarYears,
} from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import { budgetDaySnapshotsDb } from '@/db/controllers/budgetDaySnapshotsDb';

// Components
import DayComponent from '@/views/statistics/cashFlow/day/DayComponent.vue';
import WeekComponent from '@/views/statistics/cashFlow/week/WeekComponent.vue';
import MonthComponent from '@/views/statistics/cashFlow/month/MonthComponent.vue';
import YearComponent from '@/views/statistics/cashFlow/year/YearComponent.vue';
// End Components

// Utility helpers copied from child components (small wrappers)
function providerValue(p: any) {
  try {
    const efectivo = Number(p?.efectivo || 0);
    const tarjeta = Number(p?.tarjeta || 0);
    const credito = Number(p?.credito || 0);
    const sumPayments = efectivo + tarjeta + credito;
    if (sumPayments > 0) return sumPayments;
    const e = Number(p?.estimated || 0);
    return e;
  } catch (_e) {
    return 0;
  }
}

// Try to extract a numeric amount from an arbitrary entry object
function extractAmountFromItem(item: any) {
  try {
    if (item == null) return 0;
    if (typeof item === 'number') return Number(item) || 0;
    // commonly used keys
    const keys = ['amount', 'monto', 'total', 'value', 'valor', 'estimated', 'cantidad'];
    for (const k of keys) {
      if (k in item) {
        const v = item[k];
        const n = Number((typeof v === 'string' ? v.replace(/[^0-9.-]+/g, '') : v) || 0);
        if (!isNaN(n)) return n;
      }
    }
    // if item has numeric properties, try to find first numeric
    for (const k of Object.keys(item)) {
      const v = item[k];
      const n = Number((typeof v === 'string' ? v.replace(/[^0-9.-]+/g, '') : v) || 0);
      if (!isNaN(n) && n !== 0) return n;
    }
    return 0;
  } catch (_e) {
    return 0;
  }
}

// Robust helpers to extract total ingresos/egresos from a backup data object
function sumIngresosFromData(d: any) {
  try {
    if (!d) return 0;
    // common explicit ingresos array
    if (Array.isArray(d.ingresos))
      return d.ingresos.reduce((s: number, i: any) => s + (Number(i?.amount || 0) || 0), 0);
    // english alternative
    if (Array.isArray(d.incomes))
      return d.incomes.reduce((s: number, i: any) => s + (Number(i?.amount || 0) || 0), 0);
    // entries with entryType 'ingreso' or 'income'
    if (Array.isArray(d.entries)) {
      return (d.entries || [])
        .filter((e: any) => {
          const t = String(e?.entryType || '').toLowerCase();
          return t === 'ingreso' || t === 'income';
        })
        .reduce((s: number, i: any) => s + (Number(i?.amount || 0) || 0), 0);
    }
    // fallback: try to find any numeric property
    return extractAmountFromItem(d) || 0;
  } catch (_e) {
    return 0;
  }
}

function sumEgresosFromData(d: any) {
  try {
    if (!d) return 0;

    // Prefer entries-based egresos (day uses entries). If entries contain egreso/expense items, use that.
    let entriesEgresos = 0;
    if (Array.isArray(d.entries)) {
      entriesEgresos = (d.entries || [])
        .filter((e: any) => {
          const t = String(e?.entryType || '').toLowerCase();
          return t === 'egreso' || t === 'expense';
        })
        .reduce(
          (s: number, i: any) => s + (Number(i?.amount || i?.monto || i?.total || 0) || 0),
          0,
        );
    }
    // Sum both entries-based egresos and provider expenses
    // (not early-return so provider expenses aren't missed)
    let proveedoresSum = 0;
    if (Array.isArray(d.proveedores)) {
      proveedoresSum += d.proveedores.reduce((s: number, p: any) => {
        if (p == null) return s;
        if (typeof p === 'number') return s + Number(p || 0);
        const extracted = extractAmountFromItem(p);
        if (extracted && extracted !== 0) return s + extracted;
        return s + (Number(providerValue(p) || 0) || 0);
      }, 0);
    }
    if (Array.isArray(d.providers)) {
      proveedoresSum += d.providers.reduce((s: number, p: any) => {
        if (p == null) return s;
        if (typeof p === 'number') return s + Number(p || 0);
        const extracted = extractAmountFromItem(p);
        if (extracted && extracted !== 0) return s + extracted;
        return s + (Number(providerValue(p) || 0) || 0);
      }, 0);
    }

    const egKeys = ['egresos', 'gastos', 'expenses'];
    for (const k of egKeys) {
      if (Array.isArray(d[k])) {
        proveedoresSum += d[k].reduce(
          (s: number, i: any) => s + (Number(i?.amount || i?.monto || i?.total || 0) || 0),
          0,
        );
      }
    }

    return entriesEgresos + proveedoresSum;
  } catch (_e) {
    return 0;
  }
}

function isoDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function getBackupSelectedDate(b: any) {
  try {
    const id = b && (b.id || b.key || b.name);
    if (id && String(id).includes(':')) {
      return String(id).split(':')[1].slice(0, 10);
    }
    return '';
  } catch (_e) {
    return '';
  }
}

// Centralized state for each view
const day = reactive<any>({
  dayOffset: 0,
  popovers: { mainDate: { open: false, event: null as Event | null } },
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  chartData: { labels: [], datasets: [] },
  chartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      title: { display: true, text: 'Ingresos y Egresos (día)' },
    },
    scales: { x: { type: 'category' }, y: { type: 'linear' } },
  },
  dailyProfit: 0,
  previousDailyProfit: 0,
});

const week = reactive<any>({
  weekOffset: 0,
  popovers: { mainDate: { open: false, event: null as Event | null } },
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  chartData: {
    labels: [],
    datasets: [
      { label: 'Ingresos', data: [] },
      { label: 'Egresos', data: [] },
    ],
  },
  chartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      title: { display: true, text: 'Ingresos y Egresos (última semana)' },
    },
    scales: { x: { type: 'category' }, y: { type: 'linear' } },
  },
  weeklyProfit: 0,
  previousWeeklyProfit: 0,
});

const month = reactive<any>({
  monthOffset: 0,
  popovers: { mainDate: { open: false, event: null as Event | null } },
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  chartData: {
    labels: [],
    datasets: [
      { label: 'Ingresos', data: [] },
      { label: 'Egresos', data: [] },
    ],
  },
  chartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      title: { display: true, text: 'Ingresos y Egresos (últimos 12 meses)' },
    },
    scales: { x: { type: 'category' }, y: { type: 'linear' } },
  },
  monthlyProfit: 0,
});

const year = reactive<any>({
  yearOffset: 0,
  yearsToCompare: 5,
  popovers: { mainDate: { open: false, event: null as Event | null } },
  selectedDate: format(new Date(), 'yyyy'),
  chartData: { labels: [], datasets: [] },
  chartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      title: { display: true, text: `Comparativa anual (últimos 5 años)` },
    },
    scales: { x: { type: 'category' }, y: { type: 'linear' } },
  },
  yearProfit: 0,
});

// Computed labels exposed to children
const dayLabel = computed(() => {
  const d = addDays(new Date(), day.dayOffset);
  return format(d, 'dd MMM yyyy');
});
const weekRangeLabel = computed(() => {
  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), week.weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, 'dd MMM yyyy')} - ${format(weekEnd, 'dd MMM yyyy')}`;
});
const monthRangeLabel = computed(() => {
  try {
    // Show full calendar year for the selected date's year (Ene YYYY - Dic YYYY)
    const parsed = parseLocalDate({ d: String(month.selectedDate).slice(0, 10) });
    const year = isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 1);
    return `${format(start, 'MMM yyyy')} - ${format(end, 'MMM yyyy')}`;
  } catch (_e) {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 1);
    return `${format(start, 'MMM yyyy')} - ${format(end, 'MMM yyyy')}`;
  }
});
const yearLabel = computed(() => String(new Date().getFullYear() + year.yearOffset));

const formattedDailyProfit = computed(() =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(day.dailyProfit),
);
const formattedWeeklyProfit = computed(() =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(week.weeklyProfit),
);
const formattedMonthlyProfit = computed(() =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    month.monthlyProfit,
  ),
);
const formattedYearProfit = computed(() =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(year.yearProfit),
);

// Expose label/computed into reactive objects so child props can read them
Object.assign(day, { dayLabel, formattedDailyProfit });
Object.assign(week, { weekRangeLabel, formattedWeeklyProfit });
Object.assign(month, { monthRangeLabel, formattedMonthlyProfit });
Object.assign(year, { yearLabel, formattedYearProfit });

// Data loading functions (adapted from child components)
async function loadDayData() {
  try {
    const all = (await budgetDaySnapshotsDb.getAll()) as any[] || [];
    // (debug exports removed)
    const targetDay = addDays(new Date(), day.dayOffset);
    const target = isoDate(targetDay);

    const matches = (Array.isArray(all) ? all : []).filter((b) => {
      try {
        if (!b) return false;
        const comp = String((b && b.component) || '').toLowerCase();
        const idRaw = String((b && (b.id || b.key || b.name)) || '').toLowerCase();
        if (!comp.includes('budget') && !idRaw.includes('budget')) return false;
        const sd = getBackupSelectedDate(b);
        return sd === target;
      } catch (e) {
        return false;
      }
    });

    const latest = (matches || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

    let ingresosSum = 0;
    let egresosSum = 0;

    if (latest && latest.data) {
      const d = latest.data;
      const entries = Array.isArray(d.entries)
        ? d.entries
        : Array.isArray(d.ingresos)
          ? d.ingresos
          : [];
      if (Array.isArray(entries) && entries.length > 0) {
        const safeEntries = entries.map((i: any) => ({ ...i }));
        ingresosSum = safeEntries
          .filter((i: any) => i && i.entryType === 'ingreso')
          .reduce((s: number, i: any) => s + (Number(i.amount || 0) || 0), 0);
        egresosSum = safeEntries
          .filter((i: any) => i && i.entryType === 'egreso')
          .reduce((s: number, i: any) => s + (Number(i.amount || 0) || 0), 0);
      }
    }

    try {
      day.dailyProfit = Number(ingresosSum || 0) - Number(egresosSum || 0);
    } catch (_err) {
      day.dailyProfit = 0;
    }

    // previous day
    try {
      const prevDay = addDays(targetDay, -1);
      const prevTarget = isoDate(prevDay);

      const prevMatches = (Array.isArray(all) ? all : []).filter((b) => {
        try {
          if (!b) return false;
          const comp = String((b && b.component) || '').toLowerCase();
          const idRaw = String((b && (b.id || b.key || b.name)) || '').toLowerCase();
          if (!comp.includes('budget') && !idRaw.includes('budget')) return false;
          const sd = getBackupSelectedDate(b);
          return sd === prevTarget;
        } catch (e) {
          return false;
        }
      });

      const prevLatest = (prevMatches || []).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      )[0];

      let prevIngresosSum = 0;
      let prevEgresosSum = 0;

      if (prevLatest && prevLatest.data) {
        const d = prevLatest.data;
        const prevEntries = Array.isArray(d.entries)
          ? d.entries
          : Array.isArray(d.ingresos)
            ? d.ingresos
            : [];
        if (Array.isArray(prevEntries) && prevEntries.length > 0) {
          const safePrev = prevEntries.map((i: any) => ({ ...i }));
          prevIngresosSum = safePrev
            .filter((i: any) => i && i.entryType === 'ingreso')
            .reduce((s: number, i: any) => s + (Number(i.amount || 0) || 0), 0);
          prevEgresosSum = safePrev
            .filter((i: any) => i && i.entryType === 'egreso')
            .reduce((s: number, i: any) => s + (Number(i.amount || 0) || 0), 0);
        }
      }

      day.previousDailyProfit = Number(prevIngresosSum || 0) - Number(prevEgresosSum || 0);

      const prevLabel = format(prevDay, 'yyyy-MM-dd');
      const currLabel = format(targetDay, 'yyyy-MM-dd');

      day.chartData.labels = [prevLabel, currLabel];
      day.chartData.datasets = [
        { label: 'Ingresos', data: [Number(prevIngresosSum || 0), Number(ingresosSum || 0)] },
        { label: 'Egresos', data: [Number(prevEgresosSum || 0), Number(egresosSum || 0)] },
      ];
    } catch (_err) {
      day.previousDailyProfit = 0;
    }
  } catch (e) {
    console.error('loadDayData error', e);
  }
}

async function loadWeeklyData() {
  try {
    const all = (await budgetDaySnapshotsDb.getAll()) as any[] || [];

    const labels: string[] = [];
    const ingresosArr: number[] = [];
    const egresosArr: number[] = [];

    const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), week.weekOffset * 7);
    for (let i = 0; i <= 6; i++) {
      const dayDate = addDays(weekStart, i);
      const target = isoDate(dayDate);
      labels.push(format(dayDate, 'eee dd'));

      const matches = (Array.isArray(all) ? all : []).filter((b) => {
        try {
          if (!b) return false;
          const comp = String((b && b.component) || '').toLowerCase();
          const idRaw = String((b && (b.id || b.key || b.name)) || '').toLowerCase();
          if (!comp.includes('budget') && !idRaw.includes('budget')) return false;
          const sd = getBackupSelectedDate(b);
          return sd === target;
        } catch (e) {
          return false;
        }
      });



      const latest = (matches || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

      let ingresosSum = 0;
      let proveedoresSum = 0;

      if (latest && latest.data) {
        try {
          ingresosSum = sumIngresosFromData(latest.data);
        } catch (_e) {
          ingresosSum = 0;
        }
        try {
          proveedoresSum = sumEgresosFromData(latest.data);
        } catch (_e) {
          proveedoresSum = 0;
        }
      }

      ingresosArr.push(Number(ingresosSum || 0));
      egresosArr.push(Number(proveedoresSum || 0));


    }

    week.chartData.labels = labels as string[];
    week.chartData.datasets[0].data = ingresosArr as number[];
    week.chartData.datasets[1].data = egresosArr as number[];



    try {
      const totalIngresos = ingresosArr.reduce((s, v) => s + Number(v || 0), 0);
      const totalEgresos = egresosArr.reduce((s, v) => s + Number(v || 0), 0);
      week.weeklyProfit = totalIngresos - totalEgresos;
    } catch (_err) {
      week.weeklyProfit = 0;
    }

    // previous week
    try {
      const prevWeekStart = addDays(weekStart, -7);
      const prevIngresosArr: number[] = [];
      const prevEgresosArr: number[] = [];

      for (let i = 0; i <= 6; i++) {
        const dayDate = addDays(prevWeekStart, i);
        const target = isoDate(dayDate);

        const prevMatches = (Array.isArray(all) ? all : []).filter((b) => {
          try {
            if (!b) return false;
            const comp = String((b && b.component) || '').toLowerCase();
            const idRaw = String((b && (b.id || b.key || b.name)) || '').toLowerCase();
            if (!comp.includes('budget') && !idRaw.includes('budget')) return false;
            const sd = getBackupSelectedDate(b);
            return sd === target;
          } catch (e) {
            return false;
          }
        });

        const prevLatest = (prevMatches || []).sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
        )[0];

        let prevIngresosSum = 0;
        let prevProveedoresSum = 0;

        if (prevLatest && prevLatest.data) {
          try {
            prevIngresosSum = sumIngresosFromData(prevLatest.data);
          } catch (_e) {
            prevIngresosSum = 0;
          }
          try {
            prevProveedoresSum = sumEgresosFromData(prevLatest.data);
          } catch (_e) {
            prevProveedoresSum = 0;
          }
        }

        prevIngresosArr.push(Number(prevIngresosSum || 0));
        prevEgresosArr.push(Number(prevProveedoresSum || 0));
      }

      const totalPrevIngresos = prevIngresosArr.reduce((s, v) => s + Number(v || 0), 0);
      const totalPrevEgresos = prevEgresosArr.reduce((s, v) => s + Number(v || 0), 0);
      week.previousWeeklyProfit = totalPrevIngresos - totalPrevEgresos;
    } catch (_err) {
      week.previousWeeklyProfit = 0;
    }
  } catch (e) {
    console.error('loadWeeklyData error', e);
  }
}

async function loadMonthlyData() {
  try {
    const all = (await budgetDaySnapshotsDb.getAll()) as any[] || [];

    // Determine year from selectedDate (fallback to current year)
    let parsed: Date;
    try {
      parsed = parseLocalDate({ d: String(month.selectedDate).slice(0, 10) });
      if (isNaN(parsed.getTime())) parsed = new Date();
    } catch (_e) {
      parsed = new Date();
    }
    const year = parsed.getFullYear();

    // (debug exports removed)

    const labels: string[] = [];
    const ingresosArr: number[] = [];
    const egresosArr: number[] = [];

    // Build Jan..Dec for that year
    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(year, m, 1);
      const monthKey = format(monthDate, 'yyyy-MM');
      labels.push(format(monthDate, 'MMM yyyy'));

      const matches = (Array.isArray(all) ? all : []).filter((b) => {
        try {
          if (!b) return false;
          const comp = String((b && b.component) || '').toLowerCase();
          const idRaw = String((b && (b.id || b.key || b.name)) || '').toLowerCase();
          if (!comp.includes('budget') && !idRaw.includes('budget')) return false;
          const sd = getBackupSelectedDate(b);
          return sd && sd.slice(0, 7) === monthKey;
        } catch (e) {
          return false;
        }
      });

      // latest per day
      const latestPerDay: Record<string, any> = {};
      (matches || []).forEach((mb) => {
        // Use getBackupSelectedDate to obtain the backup's selected date (some backups store date in id rather than data.selectedDate)
        const dayKeyRaw = getBackupSelectedDate(mb);
        const dayKey = String(dayKeyRaw || '').slice(0, 10);
        if (!dayKey) return;
        const curr = latestPerDay[dayKey];
        if (!curr || (mb.createdAt || 0) > (curr.createdAt || 0)) latestPerDay[dayKey] = mb;
      });

      let monthIngresos = 0;
      let monthProveedores = 0;
      Object.values(latestPerDay).forEach((latest: any) => {
        if (!latest || !latest.data) return;
        try {
          monthIngresos += sumIngresosFromData(latest.data);
        } catch (_e) {
          /* ignore per-day ingreso errors */
        }
        try {
          monthProveedores += sumEgresosFromData(latest.data);
        } catch (_e) {
          /* ignore per-day egreso errors */
        }
      });

      ingresosArr.push(Number(monthIngresos || 0));
      egresosArr.push(Number(monthProveedores || 0));
    }

    month.chartData.labels = labels as string[];
    month.chartData.datasets = [
      { label: 'Ingresos', data: ingresosArr.map((v) => Number(v || 0)) },
      { label: 'Egresos', data: egresosArr.map((v) => Number(v || 0)) },
    ];

    try {
      // monthlyProfit based on selectedDate's month within this year
      // If selectedDate is YYYY-01-01 (year-only selection), use current month instead
      const selParsed = parseLocalDate({ d: String(month.selectedDate).slice(0, 10) });
      const isYearOnly = String(month.selectedDate).endsWith('-01-01');
      const monthIndex = isYearOnly ? new Date().getMonth() : (isNaN(selParsed.getTime()) ? new Date().getMonth() : selParsed.getMonth());
      if (monthIndex >= 0 && monthIndex < ingresosArr.length)
        month.monthlyProfit =
          Number(ingresosArr[monthIndex] || 0) - Number(egresosArr[monthIndex] || 0);
      else month.monthlyProfit = 0;
    } catch (_err) {
      month.monthlyProfit = 0;
    }
  } catch (e) {
    console.error('loadMonthlyData error', e);
  }
}

async function loadYearData() {
  try {
    const all = (await budgetDaySnapshotsDb.getAll()) as any[] || [];

    const yearStart = startOfYear(new Date());
    const baseYearStart = new Date(yearStart);
    baseYearStart.setFullYear(baseYearStart.getFullYear() + year.yearOffset);

    const selectedYear = baseYearStart.getFullYear();
    const N = Math.max(1, Number(year.yearsToCompare || 5));
    const yearsArr: number[] = [];
    const startYear = selectedYear - (N - 1);
    for (let y = startYear; y <= selectedYear; y++) yearsArr.push(y);

    const labels: string[] = yearsArr.map((y) => String(y));
    const yearIngresosTotals: number[] = [];
    const yearEgresosTotals: number[] = [];

    for (let yi = 0; yi < yearsArr.length; yi++) {
      const y = yearsArr[yi];
      let yearIngresos = 0;
      let yearEgresos = 0;

      const yearBase = new Date(yearStart);
      yearBase.setFullYear(y);

      for (let m = 0; m < 12; m++) {
        const monthDate = addMonths2(yearBase, m);
        const target = format(monthDate, 'yyyy-MM');

        // For each month, there may be multiple daily backups; build latestPerDay then sum those
        const matches = (Array.isArray(all) ? all : []).filter((b) => {
          try {
            if (!b) return false;
            const comp = String((b && b.component) || '').toLowerCase();
            const idRaw = String((b && (b.id || b.key || b.name)) || '').toLowerCase();
            if (!comp.includes('budget') && !idRaw.includes('budget')) return false;
            const sd = getBackupSelectedDate(b);
            return sd && sd.slice(0, 7) === target;
          } catch (e) {
            return false;
          }
        });

        const latestPerDay: Record<string, any> = {};
        (matches || []).forEach((mb) => {
          const dayKey = String(getBackupSelectedDate(mb) || '').slice(0, 10);
          if (!dayKey) return;
          const curr = latestPerDay[dayKey];
          if (!curr || (mb.createdAt || 0) > (curr.createdAt || 0)) latestPerDay[dayKey] = mb;
        });

        // Sum across latestPerDay entries for this month
        let monthIngresos = 0;
        let monthProveedores = 0;
        Object.values(latestPerDay).forEach((latest: any) => {
          if (!latest || !latest.data) return;
          try {
            monthIngresos += sumIngresosFromData(latest.data);
          } catch (_e) {
            /* ignore malformed ingresos */
          }
          try {
            monthProveedores += sumEgresosFromData(latest.data);
          } catch (_e) {
            /* ignore malformed proveedores */
          }
        });

        yearIngresos += Number(monthIngresos || 0);
        yearEgresos += Number(monthProveedores || 0);
      }

      yearIngresosTotals.push(Number(yearIngresos || 0));
      yearEgresosTotals.push(Number(yearEgresos || 0));
    }

    year.chartData.labels = labels as string[];
    year.chartData.datasets = [
      { label: 'Ingresos', data: yearIngresosTotals.map((v) => Number(v || 0)) },
      { label: 'Egresos', data: yearEgresosTotals.map((v) => Number(v || 0)) },
    ];

    try {
      const selectedIndex = yearsArr.indexOf(selectedYear);
      if (selectedIndex >= 0) {
        const ingresos = Number(yearIngresosTotals[selectedIndex] || 0);
        const egresos = Number(yearEgresosTotals[selectedIndex] || 0);
        year.yearProfit = ingresos - egresos;
      } else {
        year.yearProfit = 0;
      }
    } catch (_err) {
      year.yearProfit = 0;
    }
  } catch (e) {
    console.error('loadYearData error', e);
  }
}

// Navigation helpers invoked by child components (delegates to central loaders)
function dayPrev() {
  day.dayOffset -= 1;
  void loadDayData();
}
function dayNext() {
  day.dayOffset += 1;
  void loadDayData();
}
function dayOnPopoverDateChange(e: CustomEvent) {
  try {
    const val = e?.detail?.value || day.selectedDate;
    const parsed = parseLocalDate({ d: String(val).slice(0, 10) });
    day.selectedDate = format(parsed, 'yyyy-MM-dd');
    const today = new Date();
    // differenceInCalendarDays imported via date-fns wasn't included; compute offset
    day.dayOffset = Math.round((parsed.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  } catch (_err) {
    day.dayOffset = 0;
  }
  day.popovers.mainDate.open = false;
  void loadDayData();
}
function dayResetToToday() {
  const today = new Date();
  day.selectedDate = format(today, 'yyyy-MM-dd');
  day.dayOffset = 0;
  day.popovers.mainDate.open = false;
  void loadDayData();
}

function weekPrev() {
  week.weekOffset -= 1;
  void loadWeeklyData();
}
function weekNext() {
  week.weekOffset += 1;
  void loadWeeklyData();
}
function weekOnPopoverDateChange(e: CustomEvent) {
  try {
    const val = e?.detail?.value || week.selectedDate;
    const parsed = parseLocalDate({ d: String(val).slice(0, 10) });
    week.selectedDate = format(parsed, 'yyyy-MM-dd');
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    week.weekOffset = differenceInCalendarWeeks(parsed, currentWeekStart);
  } catch (_err) {
    week.weekOffset = 0;
  }
  week.popovers.mainDate.open = false;
  void loadWeeklyData();
}
function weekResetToToday() {
  const today = new Date();
  week.selectedDate = format(today, 'yyyy-MM-dd');
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  week.weekOffset = differenceInCalendarWeeks(today, currentWeekStart);
  week.popovers.mainDate.open = false;
  void loadWeeklyData();
}

function monthPrev() {
  try {
    const parsed = parseLocalDate({ d: String(month.selectedDate).slice(0, 10) });
    parsed.setFullYear(parsed.getFullYear() - 1);
    month.selectedDate = format(parsed, 'yyyy-MM-dd');
  } catch (_e) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    month.selectedDate = format(d, 'yyyy-MM-dd');
  }
  month.popovers.mainDate.open = false;
  void loadMonthlyData();
}
function monthNext() {
  try {
    const parsed = parseLocalDate({ d: String(month.selectedDate).slice(0, 10) });
    parsed.setFullYear(parsed.getFullYear() + 1);
    month.selectedDate = format(parsed, 'yyyy-MM-dd');
  } catch (_e) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    month.selectedDate = format(d, 'yyyy-MM-dd');
  }
  month.popovers.mainDate.open = false;
  void loadMonthlyData();
}
function monthOnPopoverDateChange(e: CustomEvent) {
  try {
    const val = e?.detail?.value || month.selectedDate;
    const yearStr = String(val).slice(0, 4);
    const parsed = parseLocalDate({ d: `${yearStr}-01-01` });
    month.selectedDate = format(parsed, 'yyyy-MM-dd');
  } catch (_err) {
    month.selectedDate = format(new Date(), 'yyyy-MM-dd');
  }
  month.popovers.mainDate.open = false;
  void loadMonthlyData();
}
function monthResetToToday() {
  const today = new Date();
  month.selectedDate = format(today, 'yyyy-MM-dd');
  month.popovers.mainDate.open = false;
  void loadMonthlyData();
}

function yearPrev() {
  year.yearOffset -= 1;
  void loadYearData();
}
function yearNext() {
  year.yearOffset += 1;
  void loadYearData();
}
function yearOnPopoverDateChange(e: CustomEvent) {
  try {
    const val = e?.detail?.value || year.selectedDate;
    const yearStr = String(val).slice(0, 4);
    const parsed = parseLocalDate({ d: `${yearStr}-01-01` });
    year.selectedDate = format(parsed, 'yyyy');
    const currentYearStart = startOfYear(new Date());
    year.yearOffset = differenceInCalendarYears(parsed, currentYearStart);
  } catch (_err) {
    year.yearOffset = 0;
  }
  year.popovers.mainDate.open = false;
  void loadYearData();
}
function yearResetToToday() {
  const today = new Date();
  year.selectedDate = format(today, 'yyyy');
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(year.selectedDate, 10) || currentYear;
  year.yearOffset = selectedYear - currentYear;
  year.popovers.mainDate.open = false;
  void loadYearData();
}

// Initial load
onMounted(() => {
  void Promise.all([loadDayData(), loadWeeklyData(), loadMonthlyData(), loadYearData()]);
});
</script>
