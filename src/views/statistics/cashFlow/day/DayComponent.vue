<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-list class="transparent shadow2 ion-padding">
    <ion-list-header>
      <ion-label>Diario</ion-label>

      <ion-buttons>
        <ion-button fill="clear" @click="prevDay">
          <ion-icon :icon="chevronBackOutline"> </ion-icon>
        </ion-button>

        <ion-button
          @click="
            popovers.mainDate.event = $event;
            popovers.mainDate.open = true;
          "
        >
          {{ dayLabel }}
        </ion-button>

        <ion-button fill="clear" @click="nextDay">
          <ion-icon :icon="chevronForwardOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-list-header>

    <div class="list-content">
      <ion-row>
        <ion-col size="6">
          <ion-card class="shadow2">
            <ion-item lines="none">
              <ion-label>Ganancia del día</ion-label>

              <ion-label slot="end">{{ formattedDailyProfit }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-col>

        <ion-col size="6">
          <DayChartComponent
            :chart-data="chartData"
            :chart-options="chartOptions"
            :color-index="1"
          />
        </ion-col>
      </ion-row>
    </div>
  </ion-list>

  <!-- popover -->
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
        >
          Hoy
        </ion-button>
      </ion-item>
    </ion-content>
  </ion-popover>
  <!-- end popover -->
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
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import dixieController from '@/controllers/dixie';

import DayChartComponent from '@/views/statistics/cashFlow/day/DayChartComponent.vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

// life
onMounted(() => {
  void loadDayData();
});
// end life

// vars
// day navigation state: offset (number of days from today)
const dayOffset = ref<number>(0);
const popovers = reactive({
  mainDate: { open: false, event: null as Event | null },
});

// selected date for the popover datetime (YYYY-MM-DD)
const selectedDate = ref<string>(format(new Date(), 'yyyy-MM-dd'));

// For daily view we'll show two bars (Ingresos, Egresos) as labels and a single dataset
const chartData = reactive<ChartData<'bar'>>({
  labels: ['Ingresos', 'Egresos'],
  datasets: [
    {
      label: 'Valores',
      data: [],
    },
  ],
});

const chartOptions = reactive<ChartOptions<'bar'>>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' },
    title: { display: true, text: 'Ingresos y Egresos (día)' },
  },
});

const dailyProfit = ref<number>(0);
const previousDailyProfit = ref<number>(0);

// computed
const formattedDailyProfit = computed(() =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    dailyProfit.value
  )
);

const dayLabel = computed(() => {
  const day = addDays(new Date(), dayOffset.value);
  return format(day, 'dd MMM yyyy');
});
// end computed

// functions
function prevDay() {
  dayOffset.value -= 1;
  void loadDayData();
}

/**
 * Handle date selection from the popover datetime.
 * Compute difference in calendar days relative to today and load that day's data.
 */
function onPopoverDateChange(e: any) {
  try {
    const val = e?.detail?.value || selectedDate.value;
    const parsed = parseLocalDate(String(val).slice(0, 10));
    selectedDate.value = format(parsed, 'yyyy-MM-dd');
    const today = new Date();
    dayOffset.value = differenceInCalendarDays(parsed, today);
  } catch (_err) {
    dayOffset.value = 0;
  }
  popovers.mainDate.open = false;
  void loadDayData();
}

function nextDay() {
  dayOffset.value += 1;
  void loadDayData();
}

// chart helper that returns a sensible numeric value for provider entries
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

// Load data for the single day defined by dayOffset (0 = today)
async function loadDayData() {
  try {
    const all = ((await dixieController.listBackups()) as any[]) || [];

    const targetDay = addDays(new Date(), dayOffset.value);
    const target = isoDate(targetDay);

    // find latest backup for that day (BudgetView / Budget components)
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
      if (Array.isArray(d.ingresos)) {
        ingresosSum = d.ingresos.reduce(
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

    // assign to reactive chartData: labels already ['Ingresos','Egresos']
    chartData.datasets[0].data = [
      Number(ingresosSum || 0),
      Number(proveedoresSum || 0),
    ];

    // calculate daily profit (ingresos - egresos)
    try {
      dailyProfit.value =
        Number(ingresosSum || 0) - Number(proveedoresSum || 0);
    } catch (_err) {
      dailyProfit.value = 0;
    }

    // previous day
    try {
      const prevDay = addDays(targetDay, -1);
      const prevTarget = isoDate(prevDay);

      const prevMatches = (Array.isArray(all) ? all : []).filter(
        b =>
          b &&
          (b.component === 'BudgetView' ||
            String((b && b.component) || '').includes('Budget')) &&
          b.data &&
          String(b.data.selectedDate || '').slice(0, 10) === prevTarget
      );

      const prevLatest = (prevMatches || []).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
      )[0];

      let prevIngresosSum = 0;
      let prevProveedoresSum = 0;

      if (prevLatest && prevLatest.data) {
        const d = prevLatest.data;
        if (Array.isArray(d.ingresos)) {
          prevIngresosSum = d.ingresos.reduce(
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

      previousDailyProfit.value =
        Number(prevIngresosSum || 0) - Number(prevProveedoresSum || 0);
    } catch (_err) {
      previousDailyProfit.value = 0;
    }
  } catch (e) {
    console.error('loadDayData error', e);
  }
}

function resetToToday() {
  try {
    const today = new Date();
    selectedDate.value = format(today, 'yyyy-MM-dd');

    // reset dayOffset to today
    dayOffset.value = 0;

    // close the popover and reload daily data
    popovers.mainDate.open = false;
    void loadDayData();
  } catch (_e) {
    /* noop */
  }
}
</script>

<style scoped></style>
