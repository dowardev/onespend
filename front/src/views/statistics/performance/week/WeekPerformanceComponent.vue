<template>
  <PeriodLayout
    title="Semanal"
    :date-label="weekLabel"
    :on-prev="prevWeek"
    :on-next="nextWeek"
    :on-date-click="onMainDateClick"
    :modal-open="modalOpen"
    @update:modal-open="setModalFromLayout"
    @download-report="downloadPdf"
  >
    <template #chart>
      <PeriodChartWrapper
        :chart-data="netChartData"
        :chart-options="netChartOptions"
      />
    </template>

    <template #snapshots>
      <PeriodSnapshots
        :snapshots="snapshots"
        current-label="Esta semana"
        previous-label="Semana pasada"
      />
    </template>

    <template #analysis>
      <ion-grid>
        <ion-row>
          <ion-col class="ion-padding">
            <div ref="pdfReport">
              <ion-card-title
                >Análisis de la semana {{ weekLabel }}</ion-card-title
              >

              <!-- 1) Income -->
              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Ingresos (semana)</ion-label>

                  <ion-button id="dowButWeek" @click="downloadPdf">
                    <ion-icon :icon="downloadOutline"></ion-icon>
                  </ion-button>
                </ion-list-header>

                <div class="list-content">
                  <ion-item lines="full">
                    <ion-label>Ventas efectivo</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(income.salesCash)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Ventas tarjeta</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(income.salesCard)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Ventas credito</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(income.creditSales)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Total ventas</ion-label>

                    <ion-label slot="end">
                      <span style="font-weight: bold">{{
                        formatCurrency(income.totalSales)
                      }}</span>
                    </ion-label>
                  </ion-item>
                </div>
              </ion-list>

              <!-- 2) Costos (Costo de ventas + Utilidad bruta) -->
              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Costos</ion-label>
                </ion-list-header>

                <div class="list-content">
                  <ion-item
                    lines="full"
                    @mouseenter="setHover('costSales', true)"
                    @mouseleave="setHover('costSales', false)"
                  >
                    <ion-label
                      >Costo de ventas({{
                        formatPercent(costs.costSalesPercent)
                      }}%)</ion-label
                    >
                    <ion-label slot="end">{{
                      formatCurrency(costs.costSales)
                    }}</ion-label>

                    <ion-button
                      v-if="hovered.costSales"
                      slot="end"
                      fill="clear"
                      @click="
                        popovers.itemMessageHeleper.message =
                          descriptions.costSales;
                        popovers.itemMessageHeleper.open = true;
                        popovers.itemMessageHeleper.event = $event;
                      "
                    >
                      <ion-icon :icon="informationCircleOutline"></ion-icon>
                    </ion-button>
                  </ion-item>

                  <ion-item
                    lines="full"
                    @mouseenter="setHover('grossProfitCost', true)"
                    @mouseleave="setHover('grossProfitCost', false)"
                  >
                    <ion-label
                      >Utilidad bruta({{
                        formatPercent(costs.grossProfitPercent)
                      }}%)</ion-label
                    >

                    <ion-label slot="end">
                      <span style="font-weight: bold">{{
                        formatCurrency(Math.ceil(costs.grossProfit))
                      }}</span>
                    </ion-label>

                    <ion-button
                      v-if="hovered.grossProfitCost"
                      slot="end"
                      fill="clear"
                      @click="
                        popovers.itemMessageHeleper.message =
                          descriptions.grossProfit;
                        popovers.itemMessageHeleper.open = true;
                        popovers.itemMessageHeleper.event = $event;
                      "
                    >
                      <ion-icon :icon="informationCircleOutline"></ion-icon>
                    </ion-button>
                  </ion-item>
                </div>
              </ion-list>

              <!-- 3) Gastos -->
              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Gastos</ion-label>
                </ion-list-header>

                <div class="list-content">
                  <ion-item lines="full">
                    <ion-label
                      >Fijos por día (sumados para la semana)</ion-label
                    >
                    <ion-label slot="end">{{
                      formatCurrency(expenses.fixedPricesDay)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Variables</ion-label>
                    <ion-label slot="end">{{
                      formatCurrency(expenses.variables)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Total gastos</ion-label>

                    <ion-label slot="end"
                      ><span style="font-weight: bold">{{
                        formatCurrency(expenses.totalExpenses)
                      }}</span></ion-label
                    >
                  </ion-item>
                </div>
              </ion-list>

              <!-- 4) Utilidad neta (destacada) + delta semanal -->
              <div class="ion-padding">
                <ion-item
                  :class="netProfitClass"
                  lines="full"
                  @mouseenter="setHover('netProfit', true)"
                  @mouseleave="setHover('netProfit', false)"
                >
                  <ion-label>
                    <div>Utilidad neta (semana)</div>
                    <small
                      style="
                        display: block;
                        color: var(--ion-color-medium, #666);
                      "
                      >Δ vs semana anterior:
                      <span :class="profitDeltaClass">{{
                        formattedProfitDelta
                      }}</span></small
                    >
                  </ion-label>

                  <ion-label slot="end">
                    <span style="font-weight: bold">{{
                      formatCurrency(expenses.netProfit)
                    }}</span>
                  </ion-label>

                  <ion-button
                    v-if="hovered.netProfit"
                    slot="end"
                    fill="clear"
                    @click="
                      popovers.itemMessageHeleper.message =
                        descriptions.netProfit;
                      popovers.itemMessageHeleper.open = true;
                      popovers.itemMessageHeleper.event = $event;
                    "
                  >
                    <ion-icon :icon="informationCircleOutline"></ion-icon>
                  </ion-button>
                </ion-item>
              </div>

              <!-- 5) Indicadores / Extras -->
              <ion-list class="transparent">
                <div class="list-content">
                  <ion-item
                    lines="full"
                    @mouseenter="setHover('dailyBreakEvenPoint', true)"
                    @mouseleave="setHover('dailyBreakEvenPoint', false)"
                  >
                    <ion-label
                      >Punto de equilibrio semanal (suma equivalente)</ion-label
                    >

                    <ion-label slot="end">{{
                      formatCurrency(Math.ceil(extras.dailyBreakEvenPoint))
                    }}</ion-label>

                    <ion-button
                      v-if="hovered.dailyBreakEvenPoint"
                      slot="end"
                      fill="clear"
                      @click="
                        popovers.itemMessageHeleper.message =
                          descriptions.dailyBreakEvenPoint;
                        popovers.itemMessageHeleper.open = true;
                        popovers.itemMessageHeleper.event = $event;
                      "
                    >
                      <ion-icon :icon="informationCircleOutline"></ion-icon>
                    </ion-button>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Ventas sobre equilibrio</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(extras.salesOverBreakEven)
                    }}</ion-label>
                  </ion-item>

                  <ion-item
                    lines="full"
                    @mouseenter="setHover('netMarginDay', true)"
                    @mouseleave="setHover('netMarginDay', false)"
                  >
                    <ion-label>Margen neto semanal</ion-label>
                    <ion-label slot="end">{{ extras.netMarginDay }}%</ion-label>

                    <ion-button
                      v-if="hovered.netMarginDay"
                      slot="end"
                      fill="clear"
                      @click="
                        popovers.itemMessageHeleper.message =
                          descriptions.netMarginDay;
                        popovers.itemMessageHeleper.open = true;
                        popovers.itemMessageHeleper.event = $event;
                      "
                    >
                      <ion-icon :icon="informationCircleOutline"></ion-icon>
                    </ion-button>
                  </ion-item>
                </div>
              </ion-list>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </template>

    <template #modal-content>
      <ion-list-header>
        <ion-label>Días de la semana</ion-label>
      </ion-list-header>

      <div
        class="list-content"
        style="height: calc(100% - 58px); overflow-y: auto"
      >
        <ion-item
          v-for="day in weekDays"
          :key="day.date"
          class="transparent"
          lines="full"
        >
          <ion-label>
            <div style="font-weight: 600">{{ day.label }} — {{ day.date }}</div>
            <small style="display: block; color: var(--ion-color-medium, #666)"
              >Ventas: {{ formatCurrency(day.totalSales) }} • Proveedores:
              {{ formatCurrency(day.proveedores) }} • Neto:
              {{ formatCurrency(day.netProfit) }}</small
            >
          </ion-label>
        </ion-item>
      </div>
    </template>
  </PeriodLayout>

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

      <ion-item lines="full">
        <ion-button
          slot="end"
          fill="clear"
          class="no-shadow"
          color="primary"
          size="small"
          @click="resetToToday()"
        >
          Esta semana
        </ion-button>
      </ion-item>
    </ion-content>
  </ion-popover>

  <ion-popover
    :is-open="popovers.itemMessageHeleper.open"
    :event="popovers.itemMessageHeleper.event"
    @did-dismiss="popovers.itemMessageHeleper.open = false"
  >
    <ion-content class="ion-padding">{{
      popovers.itemMessageHeleper.message
    }}</ion-content>
  </ion-popover>
  <!-- end popovers -->

  <!-- loadings -->
  <ion-loading :is-open="isGeneratingPdf" message="Generando PDF..." />
  <!-- end loadings -->
</template>

<script setup lang="ts">
import {
  IonButton,
  IonCol,
  IonContent,
  IonLoading,
  IonDatetime,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPopover,
  IonRow,
} from '@ionic/vue';
import { downloadOutline, informationCircleOutline } from 'ionicons/icons';
import { computed, reactive, onMounted, ref } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  format,
  addDays,
  addWeeks,
  startOfWeek,
  endOfWeek,
  differenceInCalendarWeeks,
} from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// controllers
import { DixieController } from '@/controllers/dixie';
import dixieController from '@/controllers/dixie';
// end controllers

// components
import PeriodLayout from '../components/PeriodLayout.vue';
import PeriodChartWrapper from '../components/PeriodChartWrapper.vue';
import PeriodSnapshots from '../components/PeriodSnapshots.vue';
// end components

// shared performance helpers
import { usePerformancePeriod } from '@/composables/usePerformancePeriod';
const {
  popovers: sharedPopovers,
  hovered: sharedHovered,
  setHover: sharedSetHover,
  isoDate: sharedIsoDate,
  providerValue: sharedProviderValue,
  formatCurrency: sharedFormatCurrency,
  formatPercent: sharedFormatPercent,
} = usePerformancePeriod();
// end shared helpers

// composables
import { usePeriodView } from '@/composables/usePeriodView';
import { usePdfReport } from '@/composables/usePdfReport';
// end composables

// life
onMounted(() => {
  void loadWeekData();
});
// end life

// vars
// week navigation state: offset (number of weeks from current week)
const weekOffset = ref<number>(0);
const weekDays = ref<any[]>([]);
// Use shared popovers & hovered state from composable
const popovers = sharedPopovers;
const hovered = sharedHovered;

// selected date for the popover datetime (YYYY-MM-DD)
const selectedDate = ref<string>(format(new Date(), 'yyyy-MM-dd'));

// Chart (Ingresos vs Egresos) for the week
const chartData = reactive<ChartData<'bar'>>({
  labels: ['Ingresos', 'Egresos'],
  datasets: [
    {
      label: 'Valores (semana)',
      data: [],
    },
  ],
});

const chartOptions = reactive<ChartOptions<'bar'>>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' },
    title: { display: true, text: 'Ingresos y Egresos (semana)' },
  },
});

const weeklyProfit = ref<number>(0);
const previousWeeklyProfit = ref<number>(0);
const income = reactive({
  salesCash: 0,
  salesCard: 0,
  creditSales: 0,
  totalSales: 0,
});
const costs = reactive({
  salesMargin: 28,
  costSalesPercent: 72,
  costSales: 0,
  grossProfitPercent: 0,
  grossProfit: 0,
});
const expenses = reactive({
  fixedPricesDay: 0, // this remains per-day fixed sum, displayed as sum for the week
  variables: 0,
  totalExpenses: 0,
  netProfit: 0,
});
const extras = reactive({
  dailyBreakEvenPoint: 0,
  salesOverBreakEven: 0,
  netMarginDay: 0,
});
const descriptions = reactive({
  costSales:
    'Es lo que te cuesta directamente hacer o comprar lo que vendes (materia prima, mercancía, mano de obra). Se resta de las ventas para calcular la ganancia inicial.',
  grossProfit:
    'Es tu ganancia inicial después de descontar solo el costo directo de lo que vendiste. Muestra qué tan bien estás comprando o produciendo tus productos antes de pagar otros gastos fijos.',
  netProfit:
    'Es la ganancia final, la que de verdad te queda en el bolsillo. Es el dinero que le queda al negocio después de haber pagado absolutamente todos los gastos: costos, renta, sueldos, impuestos, etc. Utilidad neta = Total ventas - Costo de ventas - Gastos (fijos + variables)',
  dailyBreakEvenPoint:
    'Es la cantidad mínima de dinero que tienes que vender en un día para no perder dinero. En este punto, tus ingresos son justo suficientes para cubrir todos tus gastos de ese día.',
  netMarginDay:
    'Es un porcentaje que te dice qué tan rentable es tu negocio. Por cada $100 que vendes, este porcentaje te dice cuántos pesos se convierten en ganancia final (Utilidad Neta).',
});
// Shared snapshots & modal state (extracted to composable)
const { snapshots, modalOpen } = usePeriodView(false);

// end vars

// computed
const formattedProfitDelta = computed(() => {
  const val = profitDelta.value;
  const sign = val > 0 ? '+' : val < 0 ? '-' : '';
  return `${sign}${new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Math.abs(Number(val || 0)))}`;
});

const profitDelta = computed(() => {
  try {
    return (
      Number(weeklyProfit.value || 0) - Number(previousWeeklyProfit.value || 0)
    );
  } catch (_e) {
    return 0;
  }
});

const profitDeltaClass = computed(() => {
  if (profitDelta.value > 0) return 'positive-profit';
  if (profitDelta.value < 0) return 'negative-profit';
  return '';
});

// expose chart data wrapper expected by template
const netChartData = computed(() => chartData as ChartData<'bar'>);
const netChartOptions = chartOptions;

// Use shared formatCurrency
const formatCurrency = sharedFormatCurrency;

const netProfitClass = computed(() => {
  return Number(expenses.netProfit ?? 0) < 0
    ? 'negative-profit'
    : 'positive-profit';
});

const weekLabel = computed(() => {
  const targetWeek = addWeeks(new Date(), weekOffset.value);
  const start = startOfWeek(targetWeek, { weekStartsOn: 1 });
  const end = endOfWeek(targetWeek, { weekStartsOn: 1 });
  return `${format(start, 'dd MMM yyyy')} - ${format(end, 'dd MMM yyyy')}`;
});

const grossProfitPercentComputed = computed(() => {
  const gp = Number(costs.grossProfit ?? 0);
  const ts = Number(income.totalSales ?? 0);
  if (Number.isFinite(ts) && ts !== 0) {
    return Number(((gp / ts) * 100).toFixed(2));
  }
  return 0;
});

// Use shared formatPercent
const formatPercent = sharedFormatPercent;

// helper used for provider aggregation
// Use shared providerValue
const providerValue = sharedProviderValue;

// Use shared isoDate
const isoDate = sharedIsoDate;

// navigation
function onMainDateClick(e: Event | null) {
  try {
    popovers.mainDate.event = e || null;
    popovers.mainDate.open = true;
  } catch (_e) {
    // noop
  }
}

function prevWeek() {
  weekOffset.value -= 1;
  void loadWeekData();
}
function nextWeek() {
  weekOffset.value += 1;
  void loadWeekData();
}

function onPopoverDateChange(e: any) {
  try {
    const val = e?.detail?.value || selectedDate.value;
    // parse safely using parseISO
    const parsed = parseLocalDate(String(val).slice(0, 10));
    selectedDate.value = format(parsed, 'yyyy-MM-dd');
    const today = new Date();
    weekOffset.value = differenceInCalendarWeeks(parsed, today, {
      weekStartsOn: 1,
    });
  } catch (_err) {
    weekOffset.value = 0;
  }
  popovers.mainDate.open = false;
  // loadWeekData accepts an optional date parameter; pass the selected date so we load the exact week
  void loadWeekData(selectedDate.value);
}

// Load data for the week defined by weekOffset (0 = current week)
async function loadWeekData(dateParam?: string | Date) {
  try {
    // If a specific date was provided, update weekOffset and selectedDate accordingly
    if (typeof dateParam !== 'undefined' && dateParam !== null) {
      try {
        let parsed: Date;
        if (typeof dateParam === 'string') {
          parsed = parseLocalDate(String(dateParam).slice(0, 10));
        } else if (dateParam instanceof Date) {
          parsed = dateParam as Date;
        } else {
          parsed = new Date(dateParam as any);
        }
        const today = new Date();
        weekOffset.value = differenceInCalendarWeeks(parsed, today, {
          weekStartsOn: 1,
        });
        // sync selectedDate (YYYY-MM-DD)
        selectedDate.value = format(parsed, 'yyyy-MM-dd');
      } catch (_e) {
        // ignore and keep existing weekOffset
      }
    }
    const all = ((await dixieController.listBackups()) as any[]) || [];

    // Load statistics config fields (statisticsFields store) and sum their amounts
    try {
      const statsDixie = new DixieController({ storeName: 'statisticsFields' });
      const statsList = ((await statsDixie.listBackups()) as any[]) || [];
      let fixedSum = 0;
      if (Array.isArray(statsList)) {
        fixedSum = statsList.reduce(
          (s: number, it: any) => s + (Number(it.amount ?? 0) || 0),
          0
        );
      }
      // Assign the computed fixed daily prices sum to the reactive expenses object
      expenses.fixedPricesDay = fixedSum;
      try {
        expenses.totalExpenses =
          Number(expenses.fixedPricesDay ?? 0) * 7 +
          Number(expenses.variables ?? 0);
      } catch (_e) {
        expenses.totalExpenses = Number(expenses.fixedPricesDay ?? 0) * 7;
      }
      try {
        extras.dailyBreakEvenPoint = 0;
      } catch (_e) {
        extras.dailyBreakEvenPoint = 0;
      }
    } catch (_e) {
      // noop
    }

    const targetWeek = addWeeks(new Date(), weekOffset.value);
    const start = startOfWeek(targetWeek, { weekStartsOn: 1 });
    const end = endOfWeek(targetWeek, { weekStartsOn: 1 });
    const targetStart = isoDate(start);
    const targetEnd = isoDate(end);

    // find backups (BudgetView / Budget) whose selectedDate lies within the week interval
    const matches = (Array.isArray(all) ? all : []).filter(b => {
      try {
        const sel = String((b && b.data && b.data.selectedDate) || '').slice(
          0,
          10
        );
        return (
          sel >= targetStart &&
          sel <= targetEnd &&
          (b.component === 'BudgetView' ||
            String((b && b.component) || '').includes('Budget'))
        );
      } catch (_e) {
        return false;
      }
    });

    // Also find finish-day entries that belong to any day in the week
    const finishMatches = (Array.isArray(all) ? all : []).filter(b => {
      try {
        const sel = String((b && b.data && b.data.selectedDate) || '').slice(
          0,
          10
        );
        return (
          sel >= targetStart &&
          sel <= targetEnd &&
          b.component === 'BudgetFinishDay'
        );
      } catch (_e) {
        return false;
      }
    });

    let ingresosSum = 0;
    let proveedoresSum = 0;

    // Aggregate from BudgetView backups
    for (const entry of matches) {
      try {
        const d = entry.data;
        if (Array.isArray(d.ingresos || d.entries)) {
          ingresosSum += (d.ingresos || d.entries).reduce(
            (s: number, i: any) => s + (Number(i.amount || 0) || 0),
            0
          );
        }
        if (Array.isArray(d.proveedores)) {
          proveedoresSum += d.proveedores.reduce(
            (s: number, p: any) => s + (Number(providerValue(p) || 0) || 0),
            0
          );
        }
      } catch (_e) {
        // noop
      }
    }

    // Aggregate explicit finish-day totals if present (prefer explicit per-method fields)
    let finishSalesCash = 0;
    let finishSalesCard = 0;
    let finishSalesCredit = 0;
    let finishTotalSales = 0;

    for (const fEntry of finishMatches) {
      try {
        const f = fEntry.data;
        finishSalesCash += Number(f.totalSalesEfectivo ?? 0);
        finishSalesCard += Number(f.totalSalesTarjeta ?? 0);
        finishSalesCredit += Number(f.totalSalesCredito ?? 0);
        finishTotalSales += Number(f.totalSales ?? 0);
      } catch (_e) {
        // noop
      }
    }

    // If any finish-day explicit totals exist, prefer them (sum across the week)
    if (
      finishSalesCash ||
      finishSalesCard ||
      finishSalesCredit ||
      finishTotalSales
    ) {
      income.salesCash = finishSalesCash;
      income.salesCard = finishSalesCard;
      income.creditSales = finishSalesCredit;
      // If explicit per-method totals sum to a finite number, use that, otherwise use finishTotalSales or ingresosSum
      const sumMethods = finishSalesCash + finishSalesCard + finishSalesCredit;
      if (Number.isFinite(sumMethods) && sumMethods !== 0) {
        income.totalSales = sumMethods;
      } else if (Number.isFinite(finishTotalSales) && finishTotalSales !== 0) {
        income.totalSales = finishTotalSales;
      } else {
        income.totalSales = Number(ingresosSum || 0);
      }
      // Ensure ingresosSum reflects stored total
      ingresosSum = Number(income.totalSales ?? ingresosSum ?? 0);
    } else {
      // fallback to aggregated sums from BudgetView
      income.totalSales = Number(ingresosSum || 0);
      ingresosSum = Number(income.totalSales || 0);
    }

    // proveedoresSum already aggregated from matches

    // Build per-day list for the week (one entry per day)
    try {
      const days: any[] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const iso = isoDate(d);
        // totals for this specific day
        let dayIngresos = 0;
        let dayProveedores = 0;
        // find BudgetView matches for this iso
        for (const entry of Array.isArray(all) ? all : []) {
          try {
            const sel = String(
              (entry && entry.data && entry.data.selectedDate) || ''
            ).slice(0, 10);
            if (
              sel === iso &&
              (entry.component === 'BudgetView' ||
                String((entry && entry.component) || '').includes('Budget'))
            ) {
              const ddata = entry.data;
              if (Array.isArray(ddata.ingresos)) {
                dayIngresos += ddata.ingresos.reduce(
                  (s: number, i: any) => s + (Number(i.amount || 0) || 0),
                  0
                );
              }
              if (Array.isArray(ddata.proveedores)) {
                dayProveedores += ddata.proveedores.reduce(
                  (s: number, p: any) =>
                    s + (Number(providerValue(p) || 0) || 0),
                  0
                );
              }
            }
          } catch (_e) {
            void _e;
          }
        }

        // prefer finish-day explicit totals if present
        try {
          const fMatches = (Array.isArray(all) ? all : []).filter(
            b =>
              b &&
              b.component === 'BudgetFinishDay' &&
              String((b && b.data && b.data.selectedDate) || '').slice(
                0,
                10
              ) === iso
          );
          if (fMatches && fMatches.length) {
            const f = fMatches.sort(
              (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)
            )[0];
            const ft = f && f.data ? Number(f.data.totalSales ?? 0) || 0 : 0;
            if (ft) {
              dayIngresos = ft;
            }
          }
        } catch (_e) {
          void _e;
        }

        const label = format(d, 'EEE dd');
        days.push({
          date: iso,
          label,
          totalSales: dayIngresos,
          proveedores: dayProveedores,
          netProfit: Number(dayIngresos) - Number(dayProveedores),
        });
      }
      weekDays.value = days;

      // Set chart to show each day of the week
      try {
        chartData.labels = weekDays.value.map((x: any) => x.label);
        chartData.datasets = [
          {
            label: 'Ventas (día)',
            data: weekDays.value.map((x: any) => Number(x.totalSales || 0)),
          },
        ];
      } catch (_e) {
        void _e;
      }
    } catch (_e) {
      void _e;
    }

    try {
      weeklyProfit.value =
        Number(ingresosSum || 0) - Number(proveedoresSum || 0);
    } catch (_err) {
      weeklyProfit.value = 0;
    }

    try {
      // net profit = total sales - cost of sales - total expenses
      expenses.netProfit =
        Number(income.totalSales ?? ingresosSum ?? 0) -
        Number(costs.costSales ?? 0) -
        Number(expenses.totalExpenses ?? 0);
    } catch (_err) {
      expenses.netProfit = 0;
    }

    try {
      extras.salesOverBreakEven =
        Number(income.totalSales ?? ingresosSum ?? 0) -
        Number(expenses.fixedPricesDay ?? 0) * 7;
    } catch (_err) {
      extras.salesOverBreakEven = 0;
    }

    try {
      const totalSalesForMargin = Number(income.totalSales ?? ingresosSum ?? 0);
      const netProfitForMargin = Number(expenses.netProfit ?? 0);
      if (Number.isFinite(totalSalesForMargin) && totalSalesForMargin !== 0) {
        extras.netMarginDay = Number(
          ((netProfitForMargin / totalSalesForMargin) * 100).toFixed(2)
        );
      } else {
        extras.netMarginDay = 0;
      }
    } catch (_e) {
      extras.netMarginDay = 0;
    }

    try {
      const totalSalesNum = Number(income.totalSales ?? 0);
      if (totalSalesNum > 0) {
        costs.grossProfitPercent = Number(
          ((Number(costs.grossProfit ?? 0) / totalSalesNum) * 100).toFixed(2)
        );
        costs.costSalesPercent = Number(
          ((Number(costs.costSales ?? 0) / totalSalesNum) * 100).toFixed(2)
        );

        try {
          const gpPercent = Number(grossProfitPercentComputed.value || 0);
          if (Number.isFinite(gpPercent) && gpPercent !== 0) {
            // For weekly view, fixedPricesDay should be scaled to the week (7 days)
            extras.dailyBreakEvenPoint = Number(
              (
                (Number(expenses.fixedPricesDay ?? 0) * 7) /
                (gpPercent / 100)
              ).toFixed(2)
            );
          } else {
            extras.dailyBreakEvenPoint = 0;
          }
        } catch (_e) {
          extras.dailyBreakEvenPoint = 0;
        }
      } else {
        costs.grossProfitPercent = 0;
        costs.costSalesPercent = 0;
        extras.dailyBreakEvenPoint = 0;
      }
    } catch (_err) {
      costs.grossProfitPercent = 0;
      costs.costSalesPercent = 0;
      extras.dailyBreakEvenPoint = 0;
    }

    try {
      extras.salesOverBreakEven =
        Number(income.totalSales ?? ingresosSum ?? 0) -
        Number(extras.dailyBreakEvenPoint ?? 0);
    } catch (_err) {
      extras.salesOverBreakEven = 0;
    }

    // previous week
    try {
      const prevWeekDate = addWeeks(targetWeek, -1);
      const prevStart = isoDate(startOfWeek(prevWeekDate, { weekStartsOn: 1 }));
      const prevEnd = isoDate(endOfWeek(prevWeekDate, { weekStartsOn: 1 }));

      const prevMatches = (Array.isArray(all) ? all : []).filter(b => {
        try {
          const sel = String((b && b.data && b.data.selectedDate) || '').slice(
            0,
            10
          );
          return (
            sel >= prevStart &&
            sel <= prevEnd &&
            (b.component === 'BudgetView' ||
              String((b && b.component) || '').includes('Budget'))
          );
        } catch (_e) {
          return false;
        }
      });

      const prevFinishMatches = (Array.isArray(all) ? all : []).filter(b => {
        try {
          const sel = String((b && b.data && b.data.selectedDate) || '').slice(
            0,
            10
          );
          return (
            sel >= prevStart &&
            sel <= prevEnd &&
            b.component === 'BudgetFinishDay'
          );
        } catch (_e) {
          return false;
        }
      });

      let prevIngresosSum = 0;
      let prevProveedoresSum = 0;
      let prevNetProfit = 0;

      for (const entry of prevMatches) {
        try {
          const d = entry.data;
          if (Array.isArray(d.ingresos || d.entries)) {
            prevIngresosSum += (d.ingresos || d.entries).reduce(
              (s: number, i: any) => s + (Number(i.amount || 0) || 0),
              0
            );
          }
          if (Array.isArray(d.proveedores)) {
            prevProveedoresSum += d.proveedores.reduce(
              (s: number, p: any) => s + (Number(providerValue(p) || 0) || 0),
              0
            );
          }
        } catch (_e) {
          // noop
        }
      }

      // Aggregate explicit finish-day totals for previous week (prefer explicit stored totals)
      let prevFinishSalesCash = 0;
      let prevFinishSalesCard = 0;
      let prevFinishSalesCredit = 0;
      let prevFinishTotalSales = 0;

      for (const fEntry of prevFinishMatches) {
        try {
          const f = fEntry.data;
          prevFinishSalesCash += Number(f.totalSalesEfectivo ?? 0);
          prevFinishSalesCard += Number(f.totalSalesTarjeta ?? 0);
          prevFinishSalesCredit += Number(f.totalSalesCredito ?? 0);
          prevFinishTotalSales += Number(f.totalSales ?? 0);
        } catch (_e) {
          // noop
        }
      }

      // If any finish-day explicit totals exist, prefer them (sum across the week)
      if (
        prevFinishSalesCash ||
        prevFinishSalesCard ||
        prevFinishSalesCredit ||
        prevFinishTotalSales
      ) {
        const sumMethodsPrev =
          prevFinishSalesCash + prevFinishSalesCard + prevFinishSalesCredit;
        if (Number.isFinite(sumMethodsPrev) && sumMethodsPrev !== 0) {
          prevIngresosSum = sumMethodsPrev;
        } else if (
          Number.isFinite(prevFinishTotalSales) &&
          prevFinishTotalSales !== 0
        ) {
          prevIngresosSum = prevFinishTotalSales;
        }
      }

      // try to get previous week's netProfit from finish entries if available
      let prevFinishNet = 0;
      for (const f of prevFinishMatches) {
        try {
          if (f && f.data && typeof f.data.netProfit !== 'undefined') {
            prevFinishNet += Number(f.data.netProfit || 0);
          }
        } catch (_e) {
          // noop
        }
      }

      if (prevFinishNet) {
        prevNetProfit = prevFinishNet;
      }

      previousWeeklyProfit.value = Number(
        prevNetProfit || prevIngresosSum - prevProveedoresSum
      );

      // Assign snapshots for UI (current week and previous week)
      try {
        snapshots.current.totalSales = Number(
          income.totalSales ?? ingresosSum ?? 0
        );
        snapshots.current.netProfit = Number(
          expenses.netProfit ?? weeklyProfit.value ?? 0
        );
      } catch (_e) {
        snapshots.current.totalSales = 0;
        snapshots.current.netProfit = 0;
      }

      try {
        snapshots.previous.totalSales = Number(prevIngresosSum || 0);
        snapshots.previous.netProfit = Number(
          prevFinishNet ||
            prevNetProfit ||
            prevIngresosSum - prevProveedoresSum ||
            0
        );
      } catch (_e) {
        snapshots.previous.totalSales = 0;
        snapshots.previous.netProfit = 0;
      }
    } catch (_err) {
      previousWeeklyProfit.value = 0;
    }
  } catch (e) {
    console.error('loadWeekData error', e);
  }
}

function resetToToday() {
  try {
    const today = new Date();
    selectedDate.value = format(today, 'yyyy-MM-dd');
    weekOffset.value = 0;
    popovers.mainDate.open = false;
    // Pass selectedDate so loadWeekData loads the exact week and keeps state in sync
    void loadWeekData(selectedDate.value);
  } catch (_e) {
    /* noop */
  }
}
// PDF report ref + download handler
const pdfReport = ref<HTMLElement | null>(null);
const { downloadPdf: generatePdf, isGeneratingPdf } = usePdfReport();

/**
 * Generate a PDF from the pdfReport element using html2canvas + jsPDF.
 * Dynamically imports the libraries to keep the bundle small.
 */
async function downloadPdf() {
  // Delegate PDF generation to the centralized composable
  if (!pdfReport.value) {
    console.warn('[WeekPerformance] pdfReport element not available');
    return;
  }
  if (isGeneratingPdf.value) return; // avoid concurrent runs

  await generatePdf({
    containerRef: pdfReport,
    buttonSelector: '#dowButWeek',
    filenameFactory: () =>
      `reporte_semana_${String(weekLabel.value || isoDate(new Date())).replace(/\s+/g, '_')}.pdf`,
  });
}

// alias to shared setHover implementation
const setHover = sharedSetHover;

function setModalFromLayout(val: boolean) {
  try {
    modalOpen.value = !!val;
  } catch (_e) {
    // noop
  }
}
</script>

<style scoped>
.positive-profit {
  color: #155724; /* dark green */
  background: rgba(21, 87, 36, 0.06);
  border-radius: 4px;
}

.negative-profit {
  color: #721c24; /* dark red */
  background: rgba(114, 28, 36, 0.06);
  border-radius: 4px;
}

.netprofit-explanation small {
  color: var(--ion-color-medium, #666);
  font-size: 0.85rem;
}
</style>
