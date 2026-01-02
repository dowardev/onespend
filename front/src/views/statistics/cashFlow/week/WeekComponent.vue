<template>
  <ion-list class="transparent shadow2 ion-padding">
    <ion-list-header>
      <ion-label>Semanal</ion-label>

      <ion-buttons>
        <ion-button fill="clear" @click="prevWeek">
          <ion-icon :icon="chevronBackOutline"> </ion-icon>
        </ion-button>

        <ion-button
          @click="
            popovers.mainDate.event = $event;
            popovers.mainDate.open = true;
          "
        >
          {{ weekRangeLabel }}
        </ion-button>

        <ion-button fill="clear" @click="nextWeek">
          <ion-icon :icon="chevronForwardOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-list-header>

    <div class="list-content">
      <ion-row>
        <ion-col size="6">
          <ion-card class="shadow2">
            <ion-item lines="none">
              <ion-label>Ganancia semanal actual</ion-label>

              <ion-label slot="end">{{ formattedWeeklyProfit }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-col>

        <ion-col size="6">
          <WeekChartComponent
            :chart-data="chartData"
            :chart-options="chartOptions"
          />
        </ion-col>
      </ion-row>
    </div>
  </ion-list>

  <!-- popovers -->
  <ion-popover
    :is-open="popovers.mainDate.open"
    :event="popovers.mainDate.event"
    :keep-contents-mounted="true"
    @did-dismiss="popovers.mainDate.open = false"
  >
    <ion-content>
      <ion-datetime
        :value="selectedDate"
        style="background: transparent"
        presentation="date"
        @ion-change="onPopoverDateChange"
      ></ion-datetime>

      <ion-item>
        <ion-button
          slot="end"
          fill="clear"
          class="no-shadow"
          color="primary"
          size="small"
          @click="resetToToday()"
          >Hoy</ion-button
        >
      </ion-item>
    </ion-content>
  </ion-popover>
  <!-- end popovers -->
</template>

<script setup lang="ts">
// Imports
import {
  IonButtons,
  IonButton,
  IonCard,
  IonCol,
  IonContent,
  IonDatetime,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPopover,
  IonRow,
} from '@ionic/vue';
import { computed, reactive, onMounted, ref } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  format,
  startOfWeek,
  addDays,
  differenceInCalendarWeeks,
} from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import dixieController from '@/controllers/dixie';

import WeekChartComponent from '@/views/statistics/cashFlow/week/WeekChartComponent.vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

// life
onMounted(() => {
  void loadWeeklyData();
});
// end life

// vars
// week navigation state: offset (number of weeks from current), and helpers to navigate
const weekOffset = ref<number>(0);
const popovers = reactive({
  mainDate: { open: false, event: null as Event | null },
});

// selected date for the popover datetime
const selectedDate = ref<string>(format(new Date(), 'yyyy-MM-dd'));
const chartData = reactive<ChartData<'bar'>>({
  labels: [],
  datasets: [
    { label: 'Ingresos', data: [] },
    { label: 'Egresos', data: [] },
  ],
});

const chartOptions = reactive<ChartOptions<'bar'>>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' },
    title: { display: true, text: 'Ingresos y Egresos (última semana)' },
  },
});

const weeklyProfit = ref<number>(0);
const previousWeeklyProfit = ref<number>(0);
// end vars

// computed
const formattedWeeklyProfit = computed(() =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    weeklyProfit.value
  )
);

const weekRangeLabel = computed(() => {
  const weekStart = addDays(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    weekOffset.value * 7
  );
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, 'dd MMM yyyy')} - ${format(weekEnd, 'dd MMM yyyy')}`;
});
// end computed

// functions
function prevWeek() {
  weekOffset.value -= 1;
  void loadWeeklyData();
}

/**
 * Handle date selection from the popover datetime.
 * This computes how many calendar weeks away the selected date is
 * from the current week start and updates weekOffset accordingly,
 * then reloads the weekly data.
 */
function onPopoverDateChange(e: any) {
  try {
    const val = e?.detail?.value || selectedDate.value;
    const parsed = parseLocalDate(String(val).slice(0, 10));
    selectedDate.value = format(parsed, 'yyyy-MM-dd');
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    weekOffset.value = differenceInCalendarWeeks(parsed, currentWeekStart);
  } catch (_err) {
    weekOffset.value = 0;
  }
  popovers.mainDate.open = false;
  void loadWeeklyData();
}

function nextWeek() {
  weekOffset.value += 1;
  void loadWeeklyData();
}

// chart data exposed to child via props
function providerValue(p: any) {
  try {
    const efectivo = Number(p?.efectivo || 0);
    const tarjeta = Number(p?.tarjeta || 0);
    const credito = Number(p?.credito || 0);
    const sumPayments = efectivo + tarjeta + credito;
    if (sumPayments > 0) return sumPayments;
    const d = Number(p?.dollar || 0);
    const e = Number(p?.estimated || 0);
    return d > 0 ? d : e;
  } catch (_e) {
    return 0;
  }
}

function isoDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

async function loadWeeklyData() {
  try {
    const all = ((await dixieController.listBackups()) as any[]) || [];

    const labels: string[] = [];
    const ingresosArr: number[] = [];
    const egresosArr: number[] = [];

    const weekStart = addDays(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      weekOffset.value * 7
    );
    for (let i = 0; i <= 6; i++) {
      const day = addDays(weekStart, i);
      const target = isoDate(day);
      labels.push(format(day, 'eee dd'));

      const matches = (Array.isArray(all) ? all : []).filter(
        b =>
          b &&
          (b.component === 'BudgetView' ||
            String((b && b.component) || '').includes('Budget')) &&
          b.data &&
          String(b.data.selectedDate || '').slice(0, 10) === target
      );

      const latest = (matches || []).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
      )[0];

      let ingresosSum = 0;
      let proveedoresSum = 0;

      if (latest && latest.data) {
        const d = latest.data;
        if (Array.isArray(d.ingresos || d.entries)) {
          ingresosSum = (d.ingresos || d.entries).reduce(
            (s: number, i: any) => s + (Number(i.amount || 0) || 0),
            0
          );
        }
        if (Array.isArray(d.proveedores)) {
          proveedoresSum = d.proveedores.reduce(
            (s: number, p: any) => s + (Number(providerValue(p) || 0) || 0),
            0
          );
        }
      }

      ingresosArr.push(Number(ingresosSum || 0));
      egresosArr.push(Number(proveedoresSum || 0));
    }

    // assign to reactive chartData
    chartData.labels = labels as any;
    chartData.datasets[0].data = ingresosArr as any;
    chartData.datasets[1].data = egresosArr as any;

    // calculate weekly profit (total ingresos - total egresos)
    try {
      const totalIngresos = ingresosArr.reduce((s, v) => s + Number(v || 0), 0);
      const totalEgresos = egresosArr.reduce((s, v) => s + Number(v || 0), 0);
      weeklyProfit.value = totalIngresos - totalEgresos;
    } catch (_err) {
      weeklyProfit.value = 0;
    }

    // calculate previous weekly profit
    try {
      const prevWeekStart = addDays(weekStart, -7);
      const prevIngresosArr: number[] = [];
      const prevEgresosArr: number[] = [];

      for (let i = 0; i <= 6; i++) {
        const day = addDays(prevWeekStart, i);
        const target = isoDate(day);

        const prevMatches = (Array.isArray(all) ? all : []).filter(
          b =>
            b &&
            (b.component === 'BudgetView' ||
              String((b && b.component) || '').includes('Budget')) &&
            b.data &&
            String(b.data.selectedDate || '').slice(0, 10) === target
        );

        const prevLatest = (prevMatches || []).sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        )[0];

        let prevIngresosSum = 0;
        let prevProveedoresSum = 0;

        if (prevLatest && prevLatest.data) {
          const d = prevLatest.data;
          if (Array.isArray(d.ingresos || d.entries)) {
            prevIngresosSum = (d.ingresos || d.entries).reduce(
              (s: number, i: any) => s + (Number(i.amount || 0) || 0),
              0
            );
          }
          if (Array.isArray(d.proveedores)) {
            prevProveedoresSum = d.proveedores.reduce(
              (s: number, p: any) => s + (Number(providerValue(p) || 0) || 0),
              0
            );
          }
        }

        prevIngresosArr.push(Number(prevIngresosSum || 0));
        prevEgresosArr.push(Number(prevProveedoresSum || 0));
      }

      const totalPrevIngresos = prevIngresosArr.reduce(
        (s, v) => s + Number(v || 0),
        0
      );
      const totalPrevEgresos = prevEgresosArr.reduce(
        (s, v) => s + Number(v || 0),
        0
      );
      previousWeeklyProfit.value = totalPrevIngresos - totalPrevEgresos;
    } catch (_err) {
      previousWeeklyProfit.value = 0;
    }
  } catch (e) {
    console.error('loadWeeklyData error', e);
  }
}

function resetToToday() {
  try {
    const today = new Date();
    selectedDate.value = format(today, 'yyyy-MM-dd');

    // update weekOffset so the charts reflect the current week
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    weekOffset.value = differenceInCalendarWeeks(today, currentWeekStart);

    // close the popover and reload weekly data
    popovers.mainDate.open = false;
    void loadWeeklyData();
  } catch (_e) {
    /* noop */
  }
}
</script>

<style scoped></style>
