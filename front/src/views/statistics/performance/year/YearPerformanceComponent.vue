<template>
  <PeriodLayout
    title="Anual"
    :date-label="yearLabel"
    :on-prev="prevYear"
    :on-next="nextYear"
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
        current-label="Este año"
        previous-label="Año pasado"
      />
    </template>

    <template #analysis>
      <ion-row>
        <ion-col class="ion-padding">
          <div ref="pdfReport">
            <ion-card-title>Análisis del año {{ yearLabel }}</ion-card-title>

            <!-- 1) Income -->
            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>Ingresos (año)</ion-label>

                <ion-button id="dowButYear" @click="downloadPdf">
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
                    @click="openItemPopover(descriptions.costSales, $event)"
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
                    @click="openItemPopover(descriptions.grossProfit, $event)"
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
                  <ion-label>Fijos del dia (sumados para el año)</ion-label>

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

            <!-- 4) Utilidad neta (destacada) + delta anual -->
            <div class="ion-padding">
              <ion-item
                :class="netProfitClass"
                lines="full"
                @mouseenter="setHover('netProfit', true)"
                @mouseleave="setHover('netProfit', false)"
              >
                <ion-label>
                  <div>Utilidad neta (año)</div>

                  <small
                    style="display: block; color: var(--ion-color-medium, #666)"
                    >Δ vs año anterior:
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
                  @click="openItemPopover(descriptions.netProfit, $event)"
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
                  @mouseenter="setHover('yearlyBreakEvenPoint', true)"
                  @mouseleave="setHover('yearlyBreakEvenPoint', false)"
                >
                  <ion-label>Punto de equilibrio anual</ion-label>

                  <ion-label slot="end">{{
                    formatCurrency(Math.ceil(extras.yearlyBreakEvenPoint))
                  }}</ion-label>

                  <ion-button
                    v-if="hovered.yearlyBreakEvenPoint"
                    slot="end"
                    fill="clear"
                    @click="
                      openItemPopover(descriptions.dailyBreakEvenPoint, $event)
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
                  @mouseenter="setHover('netMarginYear', true)"
                  @mouseleave="setHover('netMarginYear', false)"
                >
                  <ion-label>Margen neto anual</ion-label>
                  <ion-label slot="end">{{ extras.netMarginYear }}%</ion-label>

                  <ion-button
                    v-if="hovered.netMarginYear"
                    slot="end"
                    fill="clear"
                    @click="openItemPopover(descriptions.netMarginDay, $event)"
                  >
                    <ion-icon :icon="informationCircleOutline"></ion-icon>
                  </ion-button>
                </ion-item>
              </div>
            </ion-list>
          </div>
        </ion-col>
      </ion-row>
    </template>

    <template #modal-content>
      <ion-list-header>
        <ion-label>Meses del año</ion-label>
      </ion-list-header>

      <div
        class="list-content"
        style="height: calc(100% - 58px); overflow-y: auto"
      >
        <ion-item
          v-for="m in yearMonths"
          :key="m.date"
          class="transparent"
          lines="full"
        >
          <ion-label>
            <div style="font-weight: 600">{{ m.label }} — {{ m.date }}</div>

            <small style="display: block; color: var(--ion-color-medium, #666)"
              >Ventas: {{ formatCurrency(m.totalSales) }} • Proveedores:
              {{ formatCurrency(m.proveedores) }} • Neto:
              {{ formatCurrency(m.netProfit) }}</small
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
        presentation="year"
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
          Este año
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
// Imports
import { ref, reactive, computed, onMounted } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  startOfYear,
  addMonths,
  differenceInCalendarYears,
  format,
} from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import { downloadOutline, informationCircleOutline } from 'ionicons/icons';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Components
import PeriodLayout from '../components/PeriodLayout.vue';
import PeriodChartWrapper from '../components/PeriodChartWrapper.vue';
import PeriodSnapshots from '../components/PeriodSnapshots.vue';
// end components

// Controllers
import { DixieController } from '@/controllers/dixie';
import { StatisticsController } from '@/controllers/statisticsController';

const statisticsController = new StatisticsController();

// Get state from StatisticsController
const snapshots = statisticsController.getSnapshots();
const modalOpen = statisticsController.getModalOpen();
const setSnapshots = (val: any) => statisticsController.setSnapshots(val);

const {
  popovers,
  hovered,
  setHover,
  formatCurrency,
  formatPercent,
  providerValue,
  isoDate,
} = {
  popovers: statisticsController.getHovered(),
  hovered: statisticsController.getHovered(),
  setHover: (key: string, value: boolean) => statisticsController.setHover(key, value),
  formatCurrency: (val: any) => statisticsController.formatCurrency(val),
  formatPercent: (val: any) => statisticsController.formatPercent(val),
  providerValue: (p: any) => statisticsController.providerValue(p),
  isoDate: (d: Date) => statisticsController.isoDate({ d }),
};

const pdfReport = ref<HTMLElement | null>(null);
const isGeneratingPdf = computed(() => statisticsController.getIsGeneratingPdf());

const yearOffset = ref<number>(0);
const yearsToCompare = ref<number>(5);
const selectedDate = ref<string>(format(new Date(), 'yyyy'));

const chartData = reactive({ labels: [], datasets: [] } as any);
const chartOptions = reactive({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' },
    title: {
      display: true,
      text: `Comparativa anual (últimos ${yearsToCompare.value} años)`,
    },
  },
} as any);

const yearlyProfit = ref<number>(0);
const previousYearlyProfit = ref<number>(0);
const providersSumYear = ref<number>(0);
const previousProvidersSum = ref<number>(0);

const income = reactive({
  salesCash: 0,
  salesCard: 0,
  creditSales: 0,
  totalSales: 0,
});
const costs = reactive({
  costSales: 0,
  grossProfit: 0,
  grossProfitPercent: 0,
  costSalesPercent: 0,
});
const expenses = reactive({
  fixedPricesDay: 0,
  variables: 0,
  totalExpenses: 0,
  netProfit: 0,
});
const extras = reactive({
  yearlyBreakEvenPoint: 0,
  salesOverBreakEven: 0,
  netMarginYear: 0,
});

const descriptions = reactive({
  costSales: 'Costo de ventas',
  grossProfit: 'Utilidad bruta',
  netProfit: 'Utilidad neta',
  dailyBreakEvenPoint: 'Punto de equilibrio diario',
  netMarginDay: 'Margen neto',
} as Record<string, string>);
// end vars

// Computed
const profitDelta = computed(
  () => yearlyProfit.value - previousYearlyProfit.value
);
const formattedProfitDelta = computed(() => formatCurrency(profitDelta.value));
const profitDeltaClass = computed(() =>
  profitDelta.value >= 0 ? 'positive-profit' : 'negative-profit'
);
const netProfitClass = computed(() =>
  expenses.netProfit >= 0 ? 'positive-profit' : 'negative-profit'
);

const yearLabel = computed(() =>
  String(new Date().getFullYear() + yearOffset.value)
);

const daysInYear = computed(() => {
  try {
    const base = startOfYear(new Date());
    const d = new Date(base);
    d.setFullYear(d.getFullYear() + 1);
    const diff = Math.round(
      (d.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  } catch (_e) {
    return 365;
  }
});

const yearMonths = computed(() => {
  try {
    const yearStart = startOfYear(new Date());
    const baseYearStart = new Date(yearStart);
    baseYearStart.setFullYear(baseYearStart.getFullYear() + yearOffset.value);
    const months: Array<any> = [];
    for (let m = 0; m < 12; m++) {
      const d = addMonths(baseYearStart, m);
      const label = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
        d
      );
      months.push({
        label: `${label}`,
        date: format(d, 'yyyy-MM'),
        totalSales: 0,
        proveedores: 0,
        netProfit: 0,
      });
    }
    return months;
  } catch (_e) {
    return [];
  }
});
// end computed

// Functions - Data loading
async function loadYearData() {
  try {
    const all = ((await dixieController.listBackups()) as any[]) || [];

    const yearStart = startOfYear(new Date());
    const baseYearStart = new Date(yearStart);
    baseYearStart.setFullYear(baseYearStart.getFullYear() + yearOffset.value);
    const selectedYear = baseYearStart.getFullYear();

    const N = Math.max(1, Number(yearsToCompare.value || 5));
    const yearsArr: number[] = [];
    const startYear = selectedYear - (N - 1);
    for (let y = startYear; y <= selectedYear; y++) yearsArr.push(y);

    const labels: string[] = yearsArr.map(y => String(y));
    const yearTotals: number[] = [];

    for (let yi = 0; yi < yearsArr.length; yi++) {
      const y = yearsArr[yi];
      let yearTotal = 0;

      const yBase = new Date(yearStart);
      yBase.setFullYear(y);

      for (let m = 0; m < 12; m++) {
        const monthDate = addMonths(yBase, m);
        const target = format(monthDate, 'yyyy-MM');

        const matches = (Array.isArray(all) ? all : []).filter(
          b =>
            b &&
            (b.component === 'BudgetView' ||
              String((b && b.component) || '').includes('Budget')) &&
            b.data &&
            String(b.data.selectedDate || '').startsWith(target)
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

          if (y === selectedYear) {
            const idx = monthDate.getMonth();
            const mItem = (yearMonths.value && yearMonths.value[idx]) || null;
            if (mItem) {
              mItem.totalSales = ingresosSum;
              mItem.proveedores = proveedoresSum;
              mItem.netProfit = ingresosSum - proveedoresSum;
            }
          }
        }
      }

      yearTotals.push(yearTotal);
    }

    chartData.labels = labels as any;
    chartData.datasets = [{ label: `Ganancia`, data: yearTotals }] as any;

    const selectedIndex = yearsArr.indexOf(selectedYear);
    yearlyProfit.value =
      selectedIndex >= 0 ? Number(yearTotals[selectedIndex] || 0) : 0;
    previousYearlyProfit.value =
      selectedIndex > 0 ? Number(yearTotals[selectedIndex - 1] || 0) : 0;

    try {
      providersSumYear.value = yearMonths.value.reduce(
        (s: number, m: any) => s + Number(m.proveedores || 0),
        0
      );
      previousProvidersSum.value = 0;
    } catch (_e) {
      providersSumYear.value = 0;
    }

    income.salesCash = 0;
    income.salesCard = 0;
    income.creditSales = 0;
    income.totalSales = yearlyProfit.value;

    costs.costSales = 0;
    costs.grossProfit = Math.ceil(
      yearlyProfit.value - (expenses.totalExpenses || 0)
    );
    costs.grossProfitPercent = 0;
    costs.costSalesPercent = 0;

    expenses.fixedPricesDay = 0;
    expenses.variables = 0;
    expenses.totalExpenses = 0;
    expenses.netProfit = yearlyProfit.value;

    extras.yearlyBreakEvenPoint = 0;
    extras.salesOverBreakEven = 0;
    extras.netMarginYear = 0;

    setSnapshots({
      current: { totalSales: income.totalSales, netProfit: expenses.netProfit },
      previous: { totalSales: 0, netProfit: 0 },
    });
  } catch (e) {
    console.error('loadYearData error', e);
  }
}

// Navigation
function prevYear() {
  yearOffset.value -= 1;
  void loadYearData();
}

function nextYear() {
  yearOffset.value += 1;
  void loadYearData();
}

// Popover / Date handlers
function onPopoverDateChange(e: any) {
  try {
    const val = e?.detail?.value || selectedDate.value;
    // ion-datetime with presentation="year" may return 'YYYY' or a full date
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

function onMainDateClick(e: any) {
  popovers.mainDate.event = e;
  popovers.mainDate.open = true;
}

function resetToToday() {
  try {
    const today = new Date();
    selectedDate.value = format(today, 'yyyy');
    const currentYear = new Date().getFullYear();
    const selectedYear = parseInt(selectedDate.value, 10) || currentYear;
    yearOffset.value = selectedYear - currentYear;
    popovers.mainDate.open = false;
    void loadYearData();
  } catch (_e) {
    /* noop */
  }
}

function setModalFromLayout(val: boolean) {
  modalOpen.value = val;
}

// PDF helpers
async function downloadPdf() {
  return await statisticsController.downloadPdf({
    containerRef: pdfReport,
    buttonSelector: '#dowButYear',
    filenameFactory: () => `report_${yearLabel.value}.pdf`,
  });
}

// Life
onMounted(() => {
  void loadYearData();
});

// UI helpers
function openItemPopover(message: any, event: any) {
  try {
    popovers.itemMessageHeleper.message = message;
    popovers.itemMessageHeleper.event = event;
    popovers.itemMessageHeleper.open = true;
  } catch (_e) {
    /* noop */
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
