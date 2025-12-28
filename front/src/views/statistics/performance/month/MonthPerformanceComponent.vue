<template>
  <PeriodLayout
    title="Mensual"
    :date-label="monthLabel"
    :on-prev="prevMonth"
    :on-next="nextMonth"
    :on-date-click="onMainDateClick"
    :modal-open="modalOpen"
    :show-report="true"
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
        current-label="Este mes"
        previous-label="Mes pasado"
      />
    </template>

    <template #analysis>
      <ion-grid>
        <ion-row>
          <ion-col class="ion-padding">
            <div ref="pdfReport">
              <ion-card-title>Análisis del mes {{ monthLabel }}</ion-card-title>

              <!-- 1) Income -->
              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Ingresos (mes)</ion-label>

                  <ion-button id="dowButMonth" @click="downloadPdf">
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
                        formatCurrency(Math.ceil(costs.grossProfit))
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
                    <ion-label>Fijos por día (sumados para el mes)</ion-label>
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

              <!-- 4) Net profit (highlighted) + monthly delta -->
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
                      >Δ vs mes anterior:
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

              <!-- 5) Indicadores / Extras -->
              <ion-list class="transparent">
                <div class="list-content">
                  <ion-item
                    lines="full"
                    @mouseenter="setHover('monthlyBreakEvenPoint', true)"
                    @mouseleave="setHover('monthlyBreakEvenPoint', false)"
                  >
                    <ion-label>Punto de equilibrio mensual</ion-label>
                    <ion-label slot="end">{{
                      formatCurrency(Math.ceil(extras.monthlyBreakEvenPoint))
                    }}</ion-label>

                    <ion-button
                      v-if="hovered.monthlyBreakEvenPoint"
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
                    @mouseenter="setHover('netMarginMonth', true)"
                    @mouseleave="setHover('netMarginMonth', false)"
                  >
                    <ion-label>Margen neto mensual</ion-label>

                    <ion-label slot="end"
                      >{{ extras.netMarginMonth }}%</ion-label
                    >

                    <ion-button
                      v-if="hovered.netMarginMonth"
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
        <ion-label>Días del mes</ion-label>
      </ion-list-header>

      <div
        class="list-content"
        style="height: calc(100% - 58px); overflow-y: auto"
      >
        <ion-item
          v-for="d in monthDays"
          :key="d.date"
          class="transparent"
          lines="full"
        >
          <ion-label>
            <div style="font-weight: 600">{{ d.label }} — {{ d.date }}</div>
            <small style="display: block; color: var(--ion-color-medium, #666)"
              >Ventas: {{ formatCurrency(d.totalSales) }} • Proveedores:
              {{ formatCurrency(d.proveedores) }} • Neto:
              {{ formatCurrency(d.netProfit) }}</small
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
        presentation="month"
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
          Este mes
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
import {
  addMonths,
  startOfMonth,
  endOfMonth,
  differenceInCalendarMonths,
  format,
  lastDayOfMonth,
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
  void loadMonthData();
});
// end life

// vars
const { snapshots, modalOpen, setSnapshots } = usePeriodView(false);
// month navigation state: offset (number of months from current month)
const monthOffset = ref<number>(0);

// selected date for the popover datetime (YYYY-MM)
const selectedDate = ref<string>(format(new Date(), 'yyyy-MM'));

// Chart (Ingresos vs Egresos) for the month
const chartData = reactive<ChartData<'bar'>>({
  labels: ['Ingresos', 'Egresos'],
  datasets: [
    {
      label: 'Valores (mes)',
      data: [],
    },
  ],
});

const chartOptions = reactive<ChartOptions<'bar'>>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' },
    title: { display: true, text: 'Ingresos y Egresos (mes)' },
  },
});

const monthlyProfit = ref<number>(0);
const previousMonthlyProfit = ref<number>(0);
const providersSumMonth = ref<number>(0);
const previousProvidersSum = ref<number>(0);
const monthDays = ref<any[]>([]);
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
  fixedPricesDay: 0, // per-day fixed sum, multiplied by daysInMonth when showing monthly totals
  variables: 0,
  totalExpenses: 0,
  netProfit: 0,
});
const extras = reactive({
  monthlyBreakEvenPoint: 0,
  salesOverBreakEven: 0,
  netMarginMonth: 0,
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
const setHover = sharedSetHover;
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
      Number(monthlyProfit.value || 0) -
      Number(previousMonthlyProfit.value || 0)
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

const netProfitClass = computed(() => {
  return Number(expenses.netProfit ?? 0) < 0
    ? 'negative-profit'
    : 'positive-profit';
});

const monthLabel = computed(() => {
  const target = addMonths(new Date(), monthOffset.value);
  return format(target, 'MMMM yyyy');
});

const daysInMonth = computed(() => {
  try {
    const target = addMonths(new Date(), monthOffset.value);
    const last = lastDayOfMonth(target);
    return last.getDate();
  } catch (_e) {
    return 30;
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
// Use shared helpers
const formatCurrency = sharedFormatCurrency;
const formatPercent = sharedFormatPercent;
const providerValue = sharedProviderValue;
const isoDate = sharedIsoDate;

// navigation
function onMainDateClick(e: Event | null) {
  // Open the main date popover from the PerformanceCard
  try {
    popovers.mainDate.event = e as Event | null;
    popovers.mainDate.open = true;
  } catch (_e) {
    // noop
  }
}

function prevMonth() {
  monthOffset.value -= 1;
  void loadMonthData();
}
function nextMonth() {
  monthOffset.value += 1;
  void loadMonthData();
}

function onPopoverDateChange(e: any) {
  try {
    const val = e?.detail?.value || selectedDate.value;
    // value format for month presentation might be "YYYY-MM"
    const monthStr = String(val).slice(0, 7);
    // parse as first day of month using parseISO
    const parsed = parseLocalDate(monthStr + '-01');
    selectedDate.value = format(parsed, 'yyyy-MM');
    const today = new Date();
    monthOffset.value = differenceInCalendarMonths(parsed, today);
  } catch (_err) {
    monthOffset.value = 0;
  }
  popovers.mainDate.open = false;
  void loadMonthData();
}

// Load data for the month defined by monthOffset (0 = current month)
async function loadMonthData() {
  try {
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
        // For monthly view, totalExpenses should consider fixed daily prices multiplied by daysInMonth
        expenses.totalExpenses =
          Number(expenses.fixedPricesDay ?? 0) *
            Number(daysInMonth.value ?? 30) +
          Number(expenses.variables ?? 0);
      } catch (_e) {
        expenses.totalExpenses =
          Number(expenses.fixedPricesDay ?? 0) *
          Number(daysInMonth.value ?? 30);
      }
      try {
        extras.monthlyBreakEvenPoint = 0;
      } catch (_e) {
        extras.monthlyBreakEvenPoint = 0;
      }
    } catch (_e) {
      // noop
    }

    const target = addMonths(new Date(), monthOffset.value);
    const start = startOfMonth(target);
    const end = endOfMonth(target);
    const targetStart = isoDate(start);
    const targetEnd = isoDate(end);

    // find backups (BudgetView / Budget) whose selectedDate lies within the month interval
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

    // Also find finish-day entries that belong to any day in the month
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

    // If any finish-day explicit totals exist, prefer them (sum across the month)
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

    // persist provider sums for snapshots/modal
    try {
      providersSumMonth.value = Number(proveedoresSum || 0);
    } catch (_e) {
      providersSumMonth.value = 0;
    }

    chartData.datasets[0].data = [
      Number(ingresosSum || 0),
      Number(proveedoresSum || 0),
    ];

    try {
      monthlyProfit.value =
        Number(ingresosSum || 0) - Number(proveedoresSum || 0);
    } catch (_err) {
      monthlyProfit.value = 0;
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
        Number(expenses.fixedPricesDay ?? 0) * Number(daysInMonth.value ?? 30);
    } catch (_err) {
      extras.salesOverBreakEven = 0;
    }

    try {
      const totalSalesForMargin = Number(income.totalSales ?? ingresosSum ?? 0);
      const netProfitForMargin = Number(expenses.netProfit ?? 0);
      if (Number.isFinite(totalSalesForMargin) && totalSalesForMargin !== 0) {
        extras.netMarginMonth = Number(
          ((netProfitForMargin / totalSalesForMargin) * 100).toFixed(2)
        );
      } else {
        extras.netMarginMonth = 0;
      }
    } catch (_e) {
      extras.netMarginMonth = 0;
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
            extras.monthlyBreakEvenPoint = Number(
              (
                (Number(expenses.fixedPricesDay ?? 0) *
                  Number(daysInMonth.value ?? 30)) /
                (gpPercent / 100)
              ).toFixed(2)
            );
          } else {
            extras.monthlyBreakEvenPoint = 0;
          }
        } catch (_e) {
          extras.monthlyBreakEvenPoint = 0;
        }
      } else {
        costs.grossProfitPercent = 0;
        costs.costSalesPercent = 0;
        extras.monthlyBreakEvenPoint = 0;
      }
    } catch (_err) {
      costs.grossProfitPercent = 0;
      costs.costSalesPercent = 0;
      extras.monthlyBreakEvenPoint = 0;
    }

    try {
      extras.salesOverBreakEven =
        Number(income.totalSales ?? ingresosSum ?? 0) -
        Number(extras.monthlyBreakEvenPoint ?? 0);
    } catch (_err) {
      extras.salesOverBreakEven = 0;
    }

    // previous month
    try {
      const prevMonthDate = addMonths(target, -1);
      const prevStart = isoDate(startOfMonth(prevMonthDate));
      const prevEnd = isoDate(endOfMonth(prevMonthDate));

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

      // try to get previous month's netProfit from finish entries if available
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

      previousMonthlyProfit.value = Number(
        prevNetProfit || prevIngresosSum - prevProveedoresSum
      );
      try {
        previousProvidersSum.value = Number(prevProveedoresSum || 0);
      } catch (_e) {
        previousProvidersSum.value = 0;
      }

      // build monthDays list (one entry per day in the target month)
      try {
        const days: any[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const iso = isoDate(d);
          // find matches and finish entries for this iso date
          let dayIngresos = 0;
          let dayProveedores = 0;
          let dayNet = 0;

          const dayMatches = (matches || []).filter(
            m =>
              String((m && m.data && m.data.selectedDate) || '').slice(
                0,
                10
              ) === iso
          );
          const dayFinish = (finishMatches || []).filter(
            f =>
              String((f && f.data && f.data.selectedDate) || '').slice(
                0,
                10
              ) === iso
          );

          for (const mm of dayMatches) {
            try {
              const dd = mm.data;
              if (Array.isArray(dd.ingresos || dd.entries))
                dayIngresos += (dd.ingresos || dd.entries).reduce(
                  (s: number, i: any) => s + (Number(i.amount || 0) || 0),
                  0
                );
              if (Array.isArray(dd.proveedores))
                dayProveedores += dd.proveedores.reduce(
                  (s: number, p: any) =>
                    s + (Number(providerValue(p) || 0) || 0),
                  0
                );
            } catch (_e) {
              void _e;
            }
          }

          for (const ff of dayFinish) {
            try {
              const ddata = ff.data;
              dayIngresos += Number(ddata.totalSales ?? 0);
              if (typeof ddata.netProfit !== 'undefined')
                dayNet += Number(ddata.netProfit || 0);
            } catch (_e) {
              void _e;
            }
          }

          // if no explicit net recorded, approximate by ingresos - proveedores
          if (!dayNet) dayNet = Number(dayIngresos - dayProveedores || 0);

          days.push({
            date: iso,
            label: format(parseLocalDate(iso), 'dd MMM yyyy'),
            totalSales: dayIngresos,
            proveedores: dayProveedores,
            netProfit: dayNet,
          });
        }
        monthDays.value = days;

        // Set chart to show each day of the month (labels: dd)
        try {
          chartData.labels = monthDays.value.map((x: any) => x.label);
          chartData.datasets = [
            {
              label: 'Ventas (día)',
              data: monthDays.value.map((x: any) => Number(x.totalSales || 0)),
            },
          ];
        } catch (_e) {
          // noop
        }
      } catch (_e) {
        monthDays.value = [];
      }
    } catch (_err) {
      previousMonthlyProfit.value = 0;
    }

    // update shared snapshots
    try {
      setSnapshots({
        current: {
          totalSales: Number(income.totalSales ?? 0),
          netProfit: Number(expenses.netProfit ?? 0),
        },
        previous: {
          totalSales: Number(previousMonthlyProfit.value ?? 0),
          netProfit: Number(previousMonthlyProfit.value ?? 0),
        },
      });
    } catch (_e) {
      void _e;
    }
  } catch (e) {
    console.error('loadMonthData error', e);
  }
}

function onReport() {
  try {
    // Placeholder report action for monthly view
    // Implement export/report generation here if needed

    console.debug('[MonthPerformance] report requested for', monthLabel.value);
  } catch (_e) {
    // noop
  }
}

function resetToToday() {
  try {
    selectedDate.value = format(new Date(), 'yyyy-MM');
    monthOffset.value = 0;
    popovers.mainDate.open = false;
    void loadMonthData();
  } catch (_e) {
    /* noop */
  }
}

// PDF report ref + download handler
const pdfReport = ref<HTMLElement | null>(null);
const { downloadPdf: generatePdf, isGeneratingPdf } = usePdfReport();

/**
 * Generate a PDF from the pdfReport element using html2canvas + jsPDF.
 * Delegates to the usePdfReport composable.
 */
async function downloadPdf() {
  if (!pdfReport.value) {
    console.warn('[MonthPerformance] pdfReport element not available');
    return;
  }
  if (isGeneratingPdf.value) return; // avoid concurrent runs

  await generatePdf({
    containerRef: pdfReport,
    buttonSelector: '#dowButMonth',
    filenameFactory: () =>
      `reporte_mes_${String(monthLabel.value || '').replace(/\s+/g, '_')}.pdf`,
  });
}

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
