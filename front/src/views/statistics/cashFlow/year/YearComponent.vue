<template>
  <ion-list class="transparent shadow2 ion-padding">
    <ion-list-header>
      <ion-label>Anual</ion-label>

      <ion-buttons>
        <ion-button fill="clear" @click="prevYear">
          <ion-icon :icon="chevronBackOutline"> </ion-icon>
        </ion-button>

        <ion-button
          @click="
            popovers.mainDate.event = $event;
            popovers.mainDate.open = true;
          "
        >
          {{ yearLabel }}
        </ion-button>

        <ion-button fill="clear" @click="nextYear">
          <ion-icon :icon="chevronForwardOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-list-header>

    <div class="list-content">
      <ion-row>
        <ion-col size="6">
          <ion-card class="shadow2">
            <ion-item lines="full">
              <ion-label>Ganancia año</ion-label>

              <ion-label slot="end">{{ formattedYearProfit }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-col>

        <ion-col size="6">
          <YearChartComponent
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
  startOfYear,
  addMonths,
  differenceInCalendarYears,
  format,
} from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import dixieController from '@/controllers/dixie';

import YearChartComponent from '@/views/statistics/cashFlow/year/YearChartComponent.vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

// life
onMounted(() => {
  void loadYearData();
});
// end life

// vars
// year navigation state: offset (number of years from current), and helpers to navigate
const yearOffset = ref<number>(0);
const yearsToCompare = ref<number>(5); // default compare 5 years
const popovers = reactive({
  mainDate: { open: false, event: null as Event | null },
});

// selected date for the popover datetime (we only use the year part)
const selectedDate = ref<string>(format(new Date(), 'yyyy'));
const chartData = reactive<ChartData<'bar'>>({
  labels: [],
  datasets: [],
});

const chartOptions = reactive<ChartOptions<'bar'>>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' },
    title: {
      display: true,
      text: `Comparativa anual (\u00faltimos ${yearsToCompare.value} a\u00f1os)`,
    },
  },
});

const yearProfit = ref<number>(0);
// end vars

// computed
const formattedYearProfit = computed(() =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    yearProfit.value
  )
);

const yearLabel = computed(() => {
  const y = new Date().getFullYear() + yearOffset.value;
  return String(y);
});
// end computed

// helpers
// helper: generate color per dataset
function colorForIndex(i: number, total: number) {
  const hue = Math.round((i / Math.max(1, total)) * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

// chart helpers
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

function isoMonth(d: Date) {
  return format(d, 'yyyy-MM'); // yyyy-mm
}

// navigation functions
function prevYear() {
  yearOffset.value -= 1;
  void loadYearData();
}

function nextYear() {
  yearOffset.value += 1;
  void loadYearData();
}

/**
 * Handle date selection from the popover datetime.
 * This computes how many calendar years away the selected date is
 * from the current year and updates yearOffset accordingly,
 * then reloads the yearly data.
 */
function onPopoverDateChange(e: any) {
  try {
    const val = e?.detail?.value || selectedDate.value;
    const yearStr = String(val).slice(0, 4);
    const parsed = parseLocalDate({ d: `${yearStr}-01-01` });
    selectedDate.value = format(parsed, 'yyyy');
    const currentYearStart = startOfYear(new Date());
    yearOffset.value = differenceInCalendarYears(parsed, currentYearStart);
  } catch (_err) {
    yearOffset.value = 0;
  }
  popovers.mainDate.open = false;
  void loadYearData();
}

async function loadYearData() {
  try {
    const all = ((await dixieController.listBackups()) as any[]) || [];

    // build years labels (last N years ending at selected year)
    const yearStart = startOfYear(new Date());
    const baseYearStart = new Date(yearStart);
    baseYearStart.setFullYear(baseYearStart.getFullYear() + yearOffset.value);

    const selectedYear = baseYearStart.getFullYear();
    const N = Math.max(1, Number(yearsToCompare.value || 5));
    const yearsArr: number[] = [];
    const startYear = selectedYear - (N - 1);
    for (let y = startYear; y <= selectedYear; y++) yearsArr.push(y);

    const labels: string[] = yearsArr.map(y => String(y));

    // build year totals (one value per year)
    const yearTotals: number[] = [];

    for (let yi = 0; yi < yearsArr.length; yi++) {
      const y = yearsArr[yi];
      let yearTotal = 0;

      const yearBase = new Date(yearStart);
      yearBase.setFullYear(y);

      for (let m = 0; m < 12; m++) {
        const monthDate = addMonths(yearBase, m);
        const target = isoMonth(monthDate);

        const matches = (Array.isArray(all) ? all : []).filter(
          b =>
            b &&
            (b.component === 'BudgetView' ||
              String((b && b.component) || '').includes('Budget')) &&
            b.data &&
            String(b.data.selectedDate || '').slice(0, 7) === target
        );

        const latest = (matches || []).sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        )[0];

        if (latest && latest.data) {
          const d = latest.data;
          let ingresosSum = 0;
          let proveedoresSum = 0;

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

          yearTotal += Number(ingresosSum - proveedoresSum || 0);
        }
      }

      yearTotals.push(yearTotal);
    }

    // assign to reactive chartData
    // Use a single dataset whose data array aligns with labels (one value per year)
    chartData.labels = labels as any;
    chartData.datasets = [
      {
        label: `Ganancia`,
        data: yearTotals,
      },
    ] as any;

    // calculate year profit (selected year total)
    try {
      const selectedIndex = yearsArr.indexOf(selectedYear);
      if (selectedIndex >= 0) {
        yearProfit.value = Number(yearTotals[selectedIndex] || 0);
      } else {
        yearProfit.value = 0;
      }
    } catch (_err) {
      yearProfit.value = 0;
    }
  } catch (e) {
    console.error('loadYearData error', e);
  }
}

function resetToToday() {
  try {
    const today = new Date();
    selectedDate.value = format(today, 'yyyy');

    // update yearOffset so the charts reflect the current year
    const currentYear = new Date().getFullYear();
    const selectedYear = parseInt(selectedDate.value, 10) || currentYear;
    yearOffset.value = selectedYear - currentYear;

    // close the popover and reload data
    popovers.mainDate.open = false;
    void loadYearData();
  } catch (_e) {
    /* noop */
  }
}
</script>

<style scoped></style>
