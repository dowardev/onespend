<template>
  <PeriodLayout
    title="Diario"
    :date-label="dayLabel"
    :on-prev="prevDay"
    :on-next="nextDay"
    :on-date-click="onMainDateClick"
    :modal-open="modalOpen"
    @update:modal-open="setModalFromLayout"
    @download-report="downloadPdf"
  >
    <template #chart>
      <PeriodChartWrapper
        :chart-data="chartData"
        :chart-options="chartOptions"
      />
    </template>

    <template #snapshots>
      <PeriodSnapshots
        :snapshots="snapshots"
        current-label="Hoy"
        previous-label="Ayer"
      />
    </template>

    <template #analysis>
      <ion-grid>
        <ion-row>
          <ion-col class="ion-padding">
            <div ref="pdfReport">
              <ion-card-title>Análisis del día {{ dayLabel }}</ion-card-title>

              <!-- 1) Income -->
              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Ingresos</ion-label>

                  <ion-button id="downloadButton" @click="downloadPdf">
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

                    <ion-label slot="end"
                      ><span style="font-weight: bold">{{
                        formatCurrency(income.totalSales)
                      }}</span></ion-label
                    >
                  </ion-item>
                </div>
              </ion-list>

              <!-- 2) Costs (Cost of sales + Gross profit) -->
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

                    <ion-label slot="end"
                      ><span style="font-weight: bold">{{
                        formatCurrency(costs.grossProfit)
                      }}</span></ion-label
                    >

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

              <!-- 3) Expenses -->
              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Gastos</ion-label>
                </ion-list-header>

                <div class="list-content">
                  <ion-item lines="full">
                    <ion-label>Fijos del dia</ion-label>

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

              <!-- 4) Net profit (highlighted) + daily delta -->
              <div class="ion-padding">
                <ion-item
                  :class="netProfitClass"
                  lines="full"
                  @mouseenter="setHover('netProfit', true)"
                  @mouseleave="setHover('netProfit', false)"
                >
                  <ion-label>
                    <div>Utilidad neta</div>

                    <small
                      style="
                        display: block;
                        color: var(--ion-color-medium, #666);
                      "
                    >
                      Δ vs ayer:
                      <span :class="profitDeltaClass">{{
                        formattedProfitDelta
                      }}</span></small
                    >
                  </ion-label>

                  <ion-label slot="end"
                    ><span style="font-weight: bold">{{
                      formatCurrency(expenses.netProfit)
                    }}</span></ion-label
                  >

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

              <!-- 5) Indicators / Extras -->
              <ion-list class="transparent">
                <div class="list-content">
                  <ion-item
                    lines="full"
                    @mouseenter="setHover('dailyBreakEvenPoint', true)"
                    @mouseleave="setHover('dailyBreakEvenPoint', false)"
                  >
                    <ion-label>Punto de equilibrio diario</ion-label>

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
                    <ion-label>Margen neto del dia</ion-label>

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
        <ion-label>Días</ion-label>
      </ion-list-header>

      <div
        class="list-content"
        style="height: calc(100% - 58px); overflow-y: auto"
      >
        <ion-item class="transparent" lines="full">
          <ion-label>
            <div style="font-weight: 600">Hoy — {{ selectedDate }}</div>

            <small style="display: block; color: var(--ion-color-medium, #666)"
              >Ventas: {{ formatCurrency(income.totalSales) }} • Proveedores:
              {{ formatCurrency(providersSumDay) }} • Neto:
              {{ formatCurrency(expenses.netProfit) }}</small
            >
          </ion-label>
        </ion-item>

        <ion-item class="transparent" lines="full">
          <ion-label>
            <div style="font-weight: 600">Ayer — {{ prevDayIso }}</div>

            <small style="display: block; color: var(--ion-color-medium, #666)"
              >Ventas: {{ formatCurrency(previousTotalSales) }} • Proveedores:
              {{ formatCurrency(previousProvidersSum) }} • Neto:
              {{ formatCurrency(previousGrossProfit) }}</small
            >
          </ion-label>
        </ion-item>
      </div>
    </template>
  </PeriodLayout>

  <!-- popovers -->
  <!-- popover selector date -->
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
          Hoy
        </ion-button>
      </ion-item>
    </ion-content>
  </ion-popover>

  <!-- popover item description -->
  <ion-popover
    :is-open="popovers.itemMessageHeleper.open"
    :event="popovers.itemMessageHeleper.event"
    @did-dismiss="popovers.itemMessageHeleper.open = false"
  >
    <ion-content class="ion-padding">{{
      popovers.itemMessageHeleper.message
    }}</ion-content>
  </ion-popover>
  <!-- end popover -->

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
import { format, addDays, differenceInCalendarDays } from 'date-fns';
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
import { usePerformancePeriod } from '@/composables/usePerformancePeriod';

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
import PeriodLayout from '@/components/statistics/PeriodLayout.vue';
import PeriodChartWrapper from '@/components/statistics/PeriodChartWrapper.vue';
import PeriodSnapshots from '@/components/statistics/PeriodSnapshots.vue';
// end components

// composables
import { usePeriodView } from '@/composables/usePeriodView';
import { usePdfReport } from '@/composables/usePdfReport';
// end composables

// life
onMounted(() => {
  void loadDayData();
});
// end life

// vars
const { snapshots, modalOpen, setSnapshots } = usePeriodView(false);
// day navigation state: offset (number of days from today)
const dayOffset = ref<number>(0);
const dailyProfit = ref<number>(0);
const previousDailyProfit = ref<number>(0);
const previousGrossProfit = ref<number>(0);
const previousTotalSales = ref<number>(0);
const providersSumDay = ref<number>(0);
const previousProvidersSum = ref<number>(0);
const income = reactive({
  salesCash: 1425,
  salesCard: 1425,
  creditSales: 850,
  totalSales: 3700,
});
const costs = reactive({
  salesMargin: 28,
  costSalesPercent: 72,
  costSales: 2664,
  grossProfitPercent: 1,
  grossProfit: 1036,
});
const expenses = reactive({
  fixedPricesDay: 560,
  variables: 0,
  totalExpenses: 760,
  netProfit: 276,
});
const extras = reactive({
  dailyBreakEvenPoint: 2000,
  salesOverBreakEven: 1700,
  netMarginDay: 7.5,
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
const {
  popovers: sharedPopovers,
  hovered: sharedHovered,
  setHover: sharedSetHover,
  isoDate: sharedIsoDate,
  providerValue: sharedProviderValue,
  formatCurrency: sharedFormatCurrency,
  formatPercent: sharedFormatPercent,
} = usePerformancePeriod();
const popovers = sharedPopovers;
const hovered = sharedHovered;
// end vars

// computed
// Delta between today and previous day (dailyProfit - previousDailyProfit)
const profitDelta = computed(() => {
  try {
    return (
      Number(dailyProfit.value || 0) - Number(previousDailyProfit.value || 0)
    );
  } catch (_e) {
    return 0;
  }
});

const formattedProfitDelta = computed(() => {
  const val = profitDelta.value;
  const sign = val > 0 ? '+' : val < 0 ? '-' : '';
  return `${sign}${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Math.abs(Number(val || 0)))}`;
});

const profitDeltaClass = computed(() => {
  if (profitDelta.value > 0) return 'positive-profit';
  if (profitDelta.value < 0) return 'negative-profit';
  return '';
});

// Computed class for net profit color: positive (green) or negative (red)
const netProfitClass = computed(() => {
  return Number(expenses.netProfit ?? 0) < 0
    ? 'negative-profit'
    : 'positive-profit';
});

const dayLabel = computed(() => {
  const day = addDays(new Date(), dayOffset.value);
  return format(day, 'dd MMM yyyy');
});
// end computed

const prevDayIso = computed(() => {
  try {
    const d = addDays(new Date(), dayOffset.value - 1);
    return isoDate(d);
  } catch (_e) {
    return isoDate(addDays(new Date(), -1));
  }
});

const grossProfitPercentComputed = computed(() => {
  const gp = Number(costs.grossProfit ?? 0);
  const ts = Number(income.totalSales ?? 0);
  if (Number.isFinite(ts) && ts !== 0) {
    return Number(((gp / ts) * 100).toFixed(2));
  }
  return 0;
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
    // parse safely using parseISO and format to yyyy-MM-dd to avoid TZ issues
    const parsed = parseLocalDate(String(val).slice(0, 10));
    selectedDate.value = format(parsed, 'yyyy-MM-dd');
    const today = new Date();
    dayOffset.value = differenceInCalendarDays(parsed, today);
  } catch (_err) {
    dayOffset.value = 0;
  }
  popovers.mainDate.open = false;
  // loadDayData accepts an optional date parameter; pass the selected date so we load the exact day
  void loadDayData(selectedDate.value);
}

function nextDay() {
  dayOffset.value += 1;
  void loadDayData();
}

// chart helper that returns a sensible numeric value for provider entries
// Use shared providerValue from composable
const providerValue = sharedProviderValue;

// Use shared isoDate
const isoDate = sharedIsoDate;

// Load data for the single day defined by dayOffset (0 = today)
// If a specific date is provided (string YYYY-MM-DD or Date), the function will
// compute the corresponding dayOffset and keep selectedDate in sync.
async function loadDayData(dateParam?: string | Date) {
  try {
    // If a specific date was provided, update dayOffset and selectedDate accordingly
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
        dayOffset.value = differenceInCalendarDays(parsed, today);
        // sync selectedDate (YYYY-MM-DD)
        selectedDate.value = format(parsed, 'yyyy-MM-dd');
      } catch (_e) {
        // ignore and keep existing dayOffset
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
        // Compute total expenses as fixed daily prices + variable expenses
        expenses.totalExpenses =
          Number(expenses.fixedPricesDay ?? 0) +
          Number(expenses.variables ?? 0);
      } catch (_e) {
        // If something unexpected happens, fallback to fixedPricesDay only
        expenses.totalExpenses = Number(expenses.fixedPricesDay ?? 0);
      }

      // Initialize daily break-even point (will be recalculated later)
      try {
        extras.dailyBreakEvenPoint = 0;
      } catch (_e) {
        extras.dailyBreakEvenPoint = 0;
      }
    } catch (_e) {
      // noop - keep existing expenses.fixedPricesDay if something goes wrong
    }

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

    // If there's no data for the selected date reset reactive state so the UI
    // does not show stale values from the last visited date.
    if (!(latest && latest.data)) {
      try {
        income.salesCash = 0;
        income.salesCard = 0;
        income.creditSales = 0;
        income.totalSales = 0;

        costs.salesMargin = 0;
        costs.costSalesPercent = 0;
        costs.costSales = 0;
        costs.grossProfitPercent = 0;
        costs.grossProfit = 0;

        expenses.fixedPricesDay = 0;
        expenses.variables = 0;
        expenses.totalExpenses = 0;
        expenses.netProfit = 0;

        extras.dailyBreakEvenPoint = 0;
        extras.salesOverBreakEven = 0;
        extras.netMarginDay = 0;

        dailyProfit.value = 0;
        previousDailyProfit.value = 0;
        previousGrossProfit.value = 0;
        previousTotalSales.value = 0;

        // Reset chart to zeros so the inline chart and main chart do not show stale values
        try {
          chartData.datasets = [
            {
              ...(chartData.datasets && chartData.datasets[0]
                ? chartData.datasets[0]
                : { label: 'Valores' }),
              data: [0, 0],
            },
          ];
        } catch (_e) {
          try {
            chartData.datasets[0].data = [0, 0];
          } catch (_err) {
            void _err;
          }
        }
      } catch (_e) {
        // noop
      }
    }

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

      // If a finishDay payload exists either embedded in the BudgetView backup or as a
      // dedicated BudgetFinishDay entry, prefer its explicit totals and populate the
      // income reactive so the UI shows the values entered in the modal.
      try {
        // First, try to find a dedicated BudgetFinishDay entry for the target date
        let finishEntry: any = null;
        try {
          const finishMatches = (Array.isArray(all) ? all : []).filter(
            b =>
              b &&
              b.component === 'BudgetFinishDay' &&
              b.data &&
              String(b.data.selectedDate || '').slice(0, 10) === target
          );
          if (finishMatches && finishMatches.length) {
            finishEntry = finishMatches.sort(
              (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)
            )[0];
          }
        } catch (_e) {
          finishEntry = null;
        }

        // Prefer the dedicated finishEntry if present, otherwise fall back to d.finishDay
        const f =
          finishEntry && finishEntry.data
            ? finishEntry.data
            : d.finishDay
              ? d.finishDay
              : null;

        if (f) {
          // Assign individual totals (prefer explicit per-method fields, fallback to legacy totalSales)
          // Use nullish coalescing so an explicit 0 is preserved instead of being treated as falsy.
          income.salesCash = Number(f.totalSalesEfectivo ?? 0);
          income.salesCard = Number(f.totalSalesTarjeta ?? 0);
          income.creditSales = Number(f.totalSalesCredito ?? 0);

          // Assign sales margin coming from the finish-day payload (ensure 0 is preserved)
          try {
            costs.salesMargin = Number(f.margin ?? 0);
          } catch (_e) {
            costs.salesMargin = 0;
          }

          // Recalculate totalSales as the sum of the three explicit fields (allowing 0).
          // Use a proper numeric check so a 0 sum is preserved instead of falling back via ||
          const sumTotalSales =
            Number(f.totalSalesEfectivo ?? 0) +
            Number(f.totalSalesTarjeta ?? 0) +
            Number(f.totalSalesCredito ?? 0);

          if (Number.isFinite(sumTotalSales)) {
            income.totalSales = sumTotalSales;
          } else if (Number.isFinite(Number(f.totalSales))) {
            income.totalSales = Number(f.totalSales);
          } else {
            income.totalSales = Number(ingresosSum ?? 0);
          }

          // Ensure ingresosSum reflects the stored total so charts/use of ingresosSum match what was saved
          ingresosSum = Number(income.totalSales ?? ingresosSum ?? 0);

          // Recalculate cost of sales and gross profit from totalSales and salesMargin
          try {
            // Compute raw cost
            const rawCost =
              Number(income.totalSales ?? 0) *
              (1 - Number(costs.salesMargin ?? 0) / 100);

            // Round to 2 decimal places while keeping numeric type
            // Use Number(...) to convert back from string produced by toFixed
            costs.costSales = Number(rawCost.toFixed(2));

            // Recalculate gross profit using the rounded costSales value
            costs.grossProfit =
              Number(income.totalSales ?? 0) - Number(costs.costSales ?? 0);

            // DEBUG LOG: print values used to compute gross profit for debugging
            try {
              console.log('[DayPerformance] computed grossProfit debug', {
                target,
                incomeTotalSales: income.totalSales,
                salesMargin: costs.salesMargin,
                costSales: costs.costSales,
                grossProfit: costs.grossProfit,
              });
            } catch (_e) {
              // noop
            }
          } catch (_e) {
            // noop - keep existing values if something goes wrong
          }
        }
      } catch (_err) {
        /* noop, keep existing computed sums */
      }
    }

    // assign to reactive chartData: labels already ['Ingresos','Egresos']
    // Create a new data array and reassign the datasets array so Vue reactivity notices the change
    try {
      const newData = [Number(ingresosSum || 0), Number(proveedoresSum || 0)];
      // persist provider sums for modal / snapshots
      try {
        providersSumDay.value = Number(proveedoresSum || 0);
      } catch (_e) {
        providersSumDay.value = 0;
      }
      // Prefer replacing the datasets array to avoid reactivity caveats with nested proxies
      chartData.datasets = [
        {
          ...(chartData.datasets && chartData.datasets[0]
            ? chartData.datasets[0]
            : { label: 'Valores' }),
          data: newData,
        },
      ];

      // Debug log to verify values being passed to the chart
      try {
        console.debug('[DayPerformance] setting chart data', {
          target,
          ingresosSum,
          proveedoresSum,
          newData,
          chartData: JSON.parse(JSON.stringify(chartData)),
        });
      } catch (_e) {
        // noop
      }
    } catch (_e) {
      // fallback to direct assignment if something goes wrong
      try {
        chartData.datasets[0].data = [
          Number(ingresosSum || 0),
          Number(proveedoresSum || 0),
        ];
      } catch (_err) {
        // noop
      }
    }

    // calculate daily profit (ingresos - egresos)
    try {
      dailyProfit.value =
        Number(ingresosSum || 0) - Number(proveedoresSum || 0);
    } catch (_err) {
      dailyProfit.value = 0;
    }

    try {
      // net profit = total sales - cost of sales - total expenses (fijos + variables)
      expenses.netProfit =
        Number(income.totalSales ?? ingresosSum ?? 0) -
        Number(costs.costSales ?? 0) -
        Number(expenses.totalExpenses ?? 0);
    } catch (_err) {
      // fallback to 0 in case of unexpected values
      expenses.netProfit = 0;
    }

    try {
      // sales over break-even = total sales - fixed daily expenses
      extras.salesOverBreakEven =
        Number(income.totalSales ?? ingresosSum ?? 0) -
        Number(expenses.fixedPricesDay ?? 0);
    } catch (_err) {
      extras.salesOverBreakEven = 0;
    }

    // Calculate net margin day = (net profit / total sales) * 100
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
      // Calculate gross profit percent and cost of sales percent safely: (value / totalSales) * 100
      const totalSalesNum = Number(income.totalSales ?? 0);
      if (totalSalesNum > 0) {
        costs.grossProfitPercent = Number(
          ((Number(costs.grossProfit ?? 0) / totalSalesNum) * 100).toFixed(2)
        );
        costs.costSalesPercent = Number(
          ((Number(costs.costSales ?? 0) / totalSalesNum) * 100).toFixed(2)
        );

        // Calculate daily break-even point using the requested formula:
        // (costs.grossProfit / income.totalSales) * 100
        try {
          // Calculate daily break-even point using grossProfitPercentComputed
          // Formula requested: expenses.fixedPricesDay / grossProfitPercentComputed
          // Use computed value and protect against division by zero -> result will be 0 when percentage is 0
          const gpPercent = Number(grossProfitPercentComputed.value || 0);
          if (Number.isFinite(gpPercent) && gpPercent !== 0) {
            // Convert percentage to ratio before division: e.g. 16.68% -> 0.1668
            extras.dailyBreakEvenPoint = Number(
              (
                Number(expenses.fixedPricesDay ?? 0) /
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

    // Recalculate sales over break-even using dailyBreakEvenPoint for semantic consistency
    try {
      extras.salesOverBreakEven =
        Number(income.totalSales ?? ingresosSum ?? 0) -
        Number(extras.dailyBreakEvenPoint ?? 0);
    } catch (_err) {
      extras.salesOverBreakEven = 0;
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
      let prevNetProfit = 0;
      // declare prevFinish in outer scope so it can be used later to compute gross profit
      let prevFinish: any = null;

      if (prevLatest && prevLatest.data) {
        const d = prevLatest.data;
        if (Array.isArray(d.ingresos || d.entries)) {
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

        // Try to get previous net profit if available in a finish entry
        try {
          const finishMatches = (Array.isArray(all) ? all : []).filter(
            b =>
              b &&
              b.component === 'BudgetFinishDay' &&
              b.data &&
              String(b.data.selectedDate || '').slice(0, 10) === prevTarget
          );
          prevFinish =
            finishMatches && finishMatches.length
              ? finishMatches.sort(
                  (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)
                )[0]
              : null;

          if (
            prevFinish &&
            prevFinish.data &&
            typeof prevFinish.data.netProfit !== 'undefined'
          ) {
            prevNetProfit = Number(prevFinish.data.netProfit || 0);
          }
        } catch (_e) {
          prevNetProfit = 0;
        }
      }

      // prefer previous net profit if available, otherwise compute a proxy using ingresos - proveedores
      previousDailyProfit.value = Number(
        prevNetProfit || prevIngresosSum - prevProveedoresSum
      );

      // Determine previous total sales (prefer explicit finish entry totals, fallback to ingresosSum)
      try {
        let prevTotal = 0;
        if (prevFinish && prevFinish.data) {
          const pf = prevFinish.data;
          const totalFromFinish =
            Number(pf.totalSalesEfectivo ?? 0) +
            Number(pf.totalSalesTarjeta ?? 0) +
            Number(pf.totalSalesCredito ?? 0);

          if (Number.isFinite(totalFromFinish) && totalFromFinish !== 0) {
            prevTotal = totalFromFinish;
          } else if (Number.isFinite(Number(pf.totalSales))) {
            prevTotal = Number(pf.totalSales);
          } else {
            prevTotal = Number(prevIngresosSum ?? 0);
          }
        } else {
          prevTotal = Number(prevIngresosSum ?? 0);
        }

        previousTotalSales.value = prevTotal;
      } catch (_e) {
        previousTotalSales.value = Number(prevIngresosSum ?? 0);
      }

      try {
        previousProvidersSum.value = Number(prevProveedoresSum || 0);
      } catch (_e) {
        previousProvidersSum.value = 0;
      }

      // Calculate previous day's gross profit (prefer explicit finish entry values when available)
      try {
        let prevGross = 0;
        if (prevFinish && prevFinish.data) {
          const pf = prevFinish.data;
          if (typeof pf.grossProfit !== 'undefined') {
            // If an explicit grossProfit field was stored, prefer it
            prevGross = Number(pf.grossProfit || 0);
          } else {
            // Try to compute from explicit per-method totals (prefer these if present)
            const totalPrev =
              Number(pf.totalSalesEfectivo ?? 0) +
              Number(pf.totalSalesTarjeta ?? 0) +
              Number(pf.totalSalesCredito ?? 0);
            const marginPrev = Number(pf.margin ?? 0);
            if (Number.isFinite(totalPrev) && totalPrev !== 0) {
              const rawCostPrev = totalPrev * (1 - marginPrev / 100);
              const costSalesPrev = Number(rawCostPrev.toFixed(2));
              prevGross = Number(totalPrev) - Number(costSalesPrev);
            } else if (Number.isFinite(Number(pf.totalSales))) {
              // Fallback to legacy totalSales field if present
              const totalLegacy = Number(pf.totalSales);
              const marginLegacy = Number(pf.margin ?? 0);
              const rawCostLegacy = totalLegacy * (1 - marginLegacy / 100);
              const costSalesLegacy = Number(rawCostLegacy.toFixed(2));
              prevGross = Number(totalLegacy) - Number(costSalesLegacy);
            } else {
              // As a last resort, use ingresos - proveedores for a proxy
              prevGross =
                Number(prevIngresosSum || 0) - Number(prevProveedoresSum || 0);
            }
          }
        } else {
          // No dedicated finish entry: compute proxy from ingresos/proveedores
          prevGross =
            Number(prevIngresosSum || 0) - Number(prevProveedoresSum || 0);
        }
        previousGrossProfit.value = prevGross;

        // DEBUG LOG: print values used to compute previous gross profit for debugging
        try {
          console.log('[DayPerformance] previous grossProfit debug', {
            prevTarget,
            prevIngresosSum,
            prevProveedoresSum,
            prevFinish: prevFinish && prevFinish.data ? prevFinish.data : null,
            previousGrossProfit: previousGrossProfit.value,
            previousTotalSales: previousTotalSales.value,
          });
        } catch (_e) {
          // noop
        }
      } catch (_e) {
        previousGrossProfit.value = 0;
      }
    } catch (_err) {
      previousDailyProfit.value = 0;
    }

    // update shared snapshots state
    try {
      // Set chart to show Ayer vs Hoy (ventas)
      try {
        chartData.labels = ['Ayer', 'Hoy'];
        chartData.datasets = [
          {
            label: 'Ventas',
            data: [
              Number(previousTotalSales.value ?? 0),
              Number(income.totalSales ?? 0),
            ],
          },
        ];
      } catch (_e) {
        // fallback: keep previous chart values
      }

      setSnapshots({
        current: {
          totalSales: Number(income.totalSales ?? 0),
          netProfit: Number(expenses.netProfit ?? 0),
        },
        previous: {
          totalSales: Number(previousTotalSales.value ?? 0),
          netProfit: Number(previousGrossProfit.value ?? 0),
        },
      });
    } catch (_e) {
      // noop
    }
  } catch (e) {
    console.error('loadDayData error', e);
  }
}

function onMainDateClick(e: Event | null) {
  try {
    // Save the event so the popover positions correctly and open it
    popovers.mainDate.event = e || null;
    popovers.mainDate.open = true;
  } catch (_e) {
    /* noop */
  }
}

function resetToToday() {
  try {
    // set selectedDate to today in yyyy-mm-dd format using format()
    selectedDate.value = format(new Date(), 'yyyy-MM-dd');

    // reset dayOffset to today
    dayOffset.value = 0;

    // close the popover and reload daily data for today
    popovers.mainDate.open = false;
    // Pass selectedDate so loadDayData loads the exact date and keeps state in sync
    void loadDayData(selectedDate.value);
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
    console.warn('[DayPerformance] pdfReport element not available');
    return;
  }
  if (isGeneratingPdf.value) return; // avoid concurrent runs

  // Call the composable helper with the container ref, button selector and filename factory
  await generatePdf({
    containerRef: pdfReport,
    buttonSelector: '#downloadButton',
    filenameFactory: () =>
      `reporte_dia_${selectedDate.value || isoDate(new Date())}.pdf`,
  });
}

// Helper to format currency consistently across the component
// Use shared formatCurrency
const formatCurrency = sharedFormatCurrency;

// helper to format percentages without decimals
// Use shared formatPercent
const formatPercent = sharedFormatPercent;

function setModalFromLayout(val: boolean) {
  try {
    modalOpen.value = !!val;
  } catch (_e) {
    // noop
  }
}
// alias local API to shared implementation
const setHover = sharedSetHover;
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
