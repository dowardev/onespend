<template>
  <ion-list class="transparent shadow2 ion-padding">
    <ion-list-header>
      <ion-label>Mensual</ion-label>

      <ion-buttons>
        <ion-button fill="clear" @click="prevMonth">
          <ion-icon :icon="chevronBackOutline"> </ion-icon>
        </ion-button>

        <ion-button
          @click="
            popovers.mainDate.event = $event;
            popovers.mainDate.open = true;
          "
        >
          {{ monthRangeLabel }}
        </ion-button>

        <ion-button fill="clear" @click="nextMonth">
          <ion-icon :icon="chevronForwardOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-list-header>

    <div class="list-content">
      <ion-row>
        <ion-col size="6">
          <ion-card class="shadow2">
            <ion-item lines="none">
              <ion-label>Ganancia mensual actual</ion-label>

              <ion-label slot="end">{{ formattedMonthlyProfit }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-col>

        <ion-col size="6">
          <MonthChartComponent
            :chart-data="chartData"
            :chart-options="chartOptions"
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
        presentation="year"
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
import {
  format,
  startOfMonth,
  addMonths,
  differenceInCalendarMonths,
} from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import { es } from 'date-fns/locale';
import dixieController from '@/controllers/dixie';

import MonthChartComponent from '@/views/statistics/cashFlow/month/MonthChartComponent.vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

// life
onMounted(() => {
  void loadMonthlyData();
});
// end life

// vars
// month navigation state: offset (number of months from current), and helpers to navigate
const monthOffset = ref<number>(0);
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
    title: { display: true, text: 'Ingresos y Egresos (últimos 12 meses)' },
  },
});

const monthlyProfit = ref<number>(0);
// end vars

// computed
const monthRangeLabel = computed(() => {
  // Show window of months (e.g. Ene 2024 - Dic 2024 for 12 months)
  const N = 12;
  const endMonth = addMonths(startOfMonth(new Date()), monthOffset.value);
  const startWindow = addMonths(endMonth, -(N - 1));
  return `${format(startWindow, 'MMM yyyy', { locale: es })} - ${format(endMonth, 'MMM yyyy', { locale: es })}`;
});

const formattedMonthlyProfit = computed(() =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    monthlyProfit.value
  )
);
// end computed

// helpers
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

// navigation functions
function prevMonth() {
  monthOffset.value -= 1;
  void loadMonthlyData();
}

function nextMonth() {
  monthOffset.value += 1;
  void loadMonthlyData();
}

/**
 * Handle date selection from the popover datetime.
 * This computes how many calendar months away the selected date is
 * from the current month start and updates monthOffset accordingly,
 * then reloads the monthly data.
 */
function onPopoverDateChange(e: any) {
  try {
    const val = e?.detail?.value || selectedDate.value;
    const parsed = parseLocalDate(String(val).slice(0, 10));
    selectedDate.value = format(parsed, 'yyyy-MM-dd');
    const currentMonthStart = startOfMonth(new Date());
    monthOffset.value = differenceInCalendarMonths(parsed, currentMonthStart);
  } catch (_err) {
    monthOffset.value = 0;
  }
  popovers.mainDate.open = false;
  void loadMonthlyData();
}

/**
 * loadMonthlyData aggregated by months (last N months window)
 */
async function loadMonthlyData() {
  try {
    const all = ((await dixieController.listBackups()) as any[]) || [];

    const N = 12; // number of months to display
    const labels: string[] = [];
    const ingresosArr: number[] = [];
    const egresosArr: number[] = [];

    const endMonth = addMonths(startOfMonth(new Date()), monthOffset.value);

    for (let i = N - 1; i >= 0; i--) {
      const month = addMonths(endMonth, -i);
      const monthKey = format(month, 'yyyy-MM'); // e.g. 2025-01
      labels.push(format(month, 'MMM yyyy', { locale: es }));

      // filter backups that belong to this month
      const matches = (Array.isArray(all) ? all : []).filter(
        b =>
          b &&
          (b.component === 'BudgetView' ||
            String((b && b.component) || '').includes('Budget')) &&
          b.data &&
          String(b.data.selectedDate || '').slice(0, 7) === monthKey
      );

      // we want the latest backup per day inside this month to avoid duplicate days
      const latestPerDay: Record<string, any> = {};
      (matches || []).forEach(mb => {
        const dayKey = String(mb.data?.selectedDate || '').slice(0, 10);
        if (!dayKey) return;
        const curr = latestPerDay[dayKey];
        if (!curr || (mb.createdAt || 0) > (curr.createdAt || 0)) {
          latestPerDay[dayKey] = mb;
        }
      });

      let monthIngresos = 0;
      let monthProveedores = 0;

      Object.values(latestPerDay).forEach((latest: any) => {
        if (!latest || !latest.data) return;
        const d = latest.data;
        if (Array.isArray(d.ingresos || d.entries)) {
          monthIngresos += (d.ingresos || d.entries).reduce(
            (s: number, i: any) => s + (Number(i.amount || 0) || 0),
            0
          );
        }
        if (Array.isArray(d.proveedores)) {
          monthProveedores += d.proveedores.reduce(
            (s: number, p: any) => s + (Number(providerValue(p) || 0) || 0),
            0
          );
        }
      });

      ingresosArr.push(Number(monthIngresos || 0));
      egresosArr.push(Number(monthProveedores || 0));
    }

    // assign to reactive chartData
    chartData.labels = labels as any;
    chartData.datasets[0].data = ingresosArr as any;
    chartData.datasets[1].data = egresosArr as any;

    // calculate current monthly profit (for the endMonth)
    try {
      const idx = ingresosArr.length - 1;
      if (idx >= 0) {
        monthlyProfit.value =
          Number(ingresosArr[idx] || 0) - Number(egresosArr[idx] || 0);
      } else {
        monthlyProfit.value = 0;
      }
    } catch (_err) {
      monthlyProfit.value = 0;
    }

    // Note: Monthly profit UI restored and computed above.
  } catch (e) {
    console.error('loadMonthlyData error', e);
  }
}

function resetToToday() {
  try {
    const today = new Date();
    selectedDate.value = format(today, 'yyyy-MM-dd');

    // update monthOffset so the charts reflect the current month window
    const currentMonthStart = startOfMonth(new Date());
    monthOffset.value = differenceInCalendarMonths(today, currentMonthStart);

    // close the popover and reload monthly data
    popovers.mainDate.open = false;
    void loadMonthlyData();
  } catch (_e) {
    /* noop */
  }
}
</script>

<style scoped></style>
