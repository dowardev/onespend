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

  <!-- popovers -->
  <ion-popover
    :is-open="popovers.mainDate.open"
    :event="popovers.mainDate.event"
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

// For daily view we'll show two labels (previous day, current day)
// and two datasets (Ingresos, Egresos) so the chart renders 4 bars (2 per day)
const chartData = reactive<ChartData<'bar'>>({
  labels: [],
  datasets: [],
});

const chartOptions = reactive<ChartOptions<'bar'>>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' },
    title: { display: true, text: 'Ingresos y Egresos (día)' },
  },
  scales: {
    x: {
      type: 'category',
    },
    y: {
      type: 'linear',
    },
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
function onPopoverDateChange(e: CustomEvent) {
  try {
    const val = e?.detail?.value || selectedDate.value;
    const parsed = parseLocalDate({ d: String(val).slice(0, 10) });
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
function providerValue(p: ProviderValue) {
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

function isoDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function getBackupSelectedDate(b: any) {
  // Prefer explicit data.selectedDate, but fall back to key/id like 'budget:YYYY-MM-DD'
  try {
    const sd = b && b.data && b.data.selectedDate;
    if (sd) return String(sd).slice(0, 10);
    const id = b && (b.id || b.key || b.name);
    if (id && String(id).includes(':')) {
      return String(id).split(':')[1].slice(0, 10);
    }
    return '';
  } catch (_e) {
    return '';
  }
}

// Load data for the single day defined by dayOffset (0 = today)
async function loadDayData() {
  try {
    const all = ((await dixieController.listBackups()) as Backup[]) || [];
    // inspect backups and targets

    const targetDay = addDays(new Date(), dayOffset.value);
    const target = isoDate(targetDay);

    // find latest backup for that day (BudgetView / Budget components)
    const matches = (Array.isArray(all) ? all : []).filter(b => {
      try {
        if (!b) return false;
        const comp = String((b && b.component) || '').toLowerCase();
        const idRaw = String((b && (b.id || b.key || b.name)) || '').toLowerCase();
        // allow backup entries that either declare a component containing 'budget' or have an id like 'budget:YYYY-MM-DD'
        if (!comp.includes('budget') && !idRaw.includes('budget')) return false;
        const sd = getBackupSelectedDate(b);
        return sd === target;
      } catch (e) {
        return false;
      }
    });

    const latest = (matches || []).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    )[0];

    let ingresosSum = 0;
    let egresosSum = 0;

    if (latest && latest.data) {
      const d = latest.data;
      const entries = Array.isArray(d.entries) ? d.entries : Array.isArray(d.ingresos) ? d.ingresos : [];
      // If entries are present on latest.data use them directly
      if (Array.isArray(entries) && entries.length > 0) {
        const safeEntries = entries.map((i: any) => ({ ...i }));
        ingresosSum = safeEntries
        .filter((i: Income) => i && i.entryType === 'ingreso')
        .reduce((s: number, i: Income) => s + (Number(i.amount || 0) || 0), 0);
        egresosSum = safeEntries
          .filter((i: Income) => i && i.entryType === 'egreso')
          .reduce((s: number, i: Income) => s + (Number(i.amount || 0) || 0), 0);
      } else {
        ingresosSum = 0;
        egresosSum = 0;
      }
    }

    // calculate daily profit (ingresos - egresos)
    try {
      dailyProfit.value = Number(ingresosSum || 0) - Number(egresosSum || 0);
    } catch (_err) {
      dailyProfit.value = 0;
    }

    // previous day
    try {
      const prevDay = addDays(targetDay, -1);
      const prevTarget = isoDate(prevDay);

      const prevMatches = (Array.isArray(all) ? all : []).filter(
        b => {
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
        }
      );

      const prevLatest = (prevMatches || []).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
      )[0];

      let prevIngresosSum = 0;
      let prevEgresosSum = 0;

       if (prevLatest && prevLatest.data) {
        const d = prevLatest.data;
        const prevEntries = Array.isArray(d.entries) ? d.entries : Array.isArray(d.ingresos) ? d.ingresos : [];
        if (Array.isArray(prevEntries) && prevEntries.length > 0) {
          const safePrev = prevEntries.map((i: any) => ({ ...i }));
          prevIngresosSum = safePrev
            .filter((i: Income) => i && i.entryType === 'ingreso')
            .reduce((s: number, i: Income) => s + (Number(i.amount || 0) || 0), 0);
          prevEgresosSum = safePrev
            .filter((i: Income) => i && i.entryType === 'egreso')
            .reduce((s: number, i: Income) => s + (Number(i.amount || 0) || 0), 0);
        } else {
          prevIngresosSum = 0;
          prevEgresosSum = 0;
        }
       }

      previousDailyProfit.value = Number(prevIngresosSum || 0) - Number(prevEgresosSum || 0);

      // prepare chart labels and datasets (previous day, current day)
      // Use ISO dates as labels so DayChartComponent can parse them reliably
      const prevLabel = format(prevDay, 'yyyy-MM-dd');
      const currLabel = format(targetDay, 'yyyy-MM-dd');

      chartData.labels = [prevLabel, currLabel];
       chartData.datasets = [
         { label: 'Ingresos', data: [Number(prevIngresosSum || 0), Number(ingresosSum || 0)] },
         { label: 'Egresos', data: [Number(prevEgresosSum || 0), Number(egresosSum || 0)] },
       ];
      // chartData prepared
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
