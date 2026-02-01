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
    <template #analysis>
      <ion-grid>
        <ion-row>
          <ion-col class="ion-padding">
            <div ref="pdfReport">
              <ion-card-title>Resumen del día {{ dayLabel }}</ion-card-title>

              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Ingresos</ion-label>

                  <ion-button @click="openIncomesChart">
                    <ion-icon :icon="statsChartOutline"></ion-icon>
                  </ion-button>

                  <ion-button id="downloadButton" @click="downloadPdf">
                    <ion-icon :icon="downloadOutline"></ion-icon>
                  </ion-button>
                </ion-list-header>

                <div class="list-content">
                  <ion-item lines="full">
                    <ion-label>Salario</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(income.salary)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Inversiones</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(income.investments)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Otros</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(income.other)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Total ingresos</ion-label>

                    <ion-label slot="end"
                      ><span style="font-weight: bold">{{
                        formatCurrency(income.totalIncome)
                      }}</span></ion-label
                    >
                  </ion-item>
                </div>
              </ion-list>

              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Gastos</ion-label>

                  <ion-button @click="openExpensesChart">
                    <ion-icon :icon="statsChartOutline"></ion-icon>
                  </ion-button>
                </ion-list-header>

                <div class="list-content">
                  <ion-item lines="full">
                    <ion-label>Vivienda</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(expenses.housing)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Alimentación</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(expenses.food)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Transporte</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(expenses.transport)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Entretenimiento</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(expenses.entertainment)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Salud</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(expenses.health)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Otros gastos</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(expenses.other)
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

              <div class="ion-padding">
                <ion-item :class="balanceClass" lines="full">
                  <ion-label>
                    <div>Balance del día</div>

                    <small
                      style="
                        display: block;
                        color: var(--ion-color-medium, #666);
                      "
                    >
                      Δ vs ayer:
                      <span :class="balanceDeltaClass">{{
                        formattedBalanceDelta
                      }}</span></small
                    >
                  </ion-label>

                  <ion-label slot="end"
                    ><span style="font-weight: bold">{{
                      formatCurrency(summary.dailyBalance)
                    }}</span></ion-label
                  >
                </ion-item>
              </div>

              <ion-list class="transparent">
                <div class="list-content">
                  <ion-item lines="full">
                    <ion-label>Ahorro del día</ion-label>

                    <ion-label slot="end"
                      ><span
                        style="
                          font-weight: bold;
                          color: var(--ion-color-success, #2dd36f);
                        "
                        >{{ formatCurrency(summary.dailySavings) }}</span
                      ></ion-label
                    >
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>% de ahorro</ion-label>

                    <ion-label slot="end"
                      ><span :class="savingsPercentageClass"
                        >{{ summary.savingsPercentage }}%</span
                      ></ion-label
                    >
                  </ion-item>
                </div>
              </ion-list>

              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Metas</ion-label>

                  <ion-button @click="openGoalsChart">
                    <ion-icon :icon="statsChartOutline"></ion-icon>
                  </ion-button>
                </ion-list-header>

                <div class="list-content">
                  <ion-item lines="full">
                    <ion-label>Meta ahorro mensual</ion-label>

                    <ion-label slot="end">{{
                      formatCurrency(goals.monthlySavingsGoal)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Progreso del mes</ion-label>

                    <ion-label slot="end"
                      >{{ formatCurrency(goals.monthlyProgress) }} /
                      {{ formatCurrency(goals.monthlySavingsGoal) }}</ion-label
                    >
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>% Completado</ion-label>

                    <ion-label slot="end"
                      ><span :class="progressClass"
                        >{{ goals.progressPercentage }}%</span
                      ></ion-label
                    >
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
              >Ingresos: {{ formatCurrency(income.totalIncome) }} • Gastos:
              {{ formatCurrency(expenses.totalExpenses) }} • Balance:
              {{ formatCurrency(summary.dailyBalance) }}</small
            >
          </ion-label>
        </ion-item>

        <ion-item class="transparent" lines="full">
          <ion-label>
            <div style="font-weight: 600">Ayer — {{ prevDayIso }}</div>

            <small style="display: block; color: var(--ion-color-medium, #666)"
              >Ingresos: {{ formatCurrency(previousTotalIncome) }} • Gastos:
              {{ formatCurrency(previousTotalExpenses) }} • Balance:
              {{ formatCurrency(previousDailyBalance) }}</small
            >
          </ion-label>
        </ion-item>
      </div>
    </template>
  </PeriodLayout>

  <ion-modal
    :is-open="showExpensesModal"
    @did-dismiss="showExpensesModal = false"
  >
    <ExpensesChartModal
      :categories="expensesCategories"
      @close="showExpensesModal = false"
    />
  </ion-modal>

  <ion-modal
    :is-open="showIncomesModal"
    @did-dismiss="showIncomesModal = false"
  >
    <IncomesChartModal
      :sources="incomesSources"
      @close="showIncomesModal = false"
    />
  </ion-modal>

  <ion-modal :is-open="showGoalsModal" @did-dismiss="showGoalsModal = false">
    <GoalsChartModal
      :goal-amount="goals.monthlySavingsGoal"
      :current-progress="goals.monthlyProgress"
      @close="showGoalsModal = false"
    />
  </ion-modal>

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

  <ion-popover
    :is-open="popovers.itemMessageHeleper.open"
    :event="popovers.itemMessageHeleper.event"
    @did-dismiss="popovers.itemMessageHeleper.open = false"
  >
    <ion-content class="ion-padding">{{
      popovers.itemMessageHeleper.message
    }}</ion-content>
  </ion-popover>

  <ion-loading :is-open="isGeneratingPdf" message="Generando PDF..." />
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
  IonModal,
} from '@ionic/vue';
import PeriodLayout from '../components/PeriodLayout.vue';
import PeriodSnapshots from '@/views/statistics/performance/components/PeriodSnapshots.vue';
import {
  downloadOutline,
  informationCircleOutline,
  statsChartOutline,
} from 'ionicons/icons';
import ExpensesChartModal from '@/views/statistics/performance/components/ExpensesChartModal.vue';
import IncomesChartModal from '@/views/statistics/performance/components/IncomesChartModal.vue';
import GoalsChartModal from '@/views/statistics/performance/components/GoalsChartModal.vue';
import { computed, reactive, onMounted, ref } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import { useChart } from '@/composables/useChart';

const { loadChartDependencies } = useChart();
onMounted(() => {
  loadChartDependencies();
  void loadConfig();
  void loadDayData();
});

import { DixieController } from '@/controllers/dixie';
import dixieController from '@/controllers/dixie';
import { StatisticsController } from '@/controllers/statisticsController';

const statisticsController = new StatisticsController();

// Access popovers directly from controller to avoid reactivity issues
const popovers = statisticsController.getPopovers();

const { snapshots, modalOpen, setSnapshots } = {
  snapshots: statisticsController.getSnapshots(),
  modalOpen: statisticsController.getModalOpen(),
  setSnapshots: (val: Snapshots) => statisticsController.setSnapshots(val),
};

const dayOffset = ref<number>(0);
const previousDailyBalance = ref<number>(0);
const previousTotalIncome = ref<number>(0);
const previousTotalExpenses = ref<number>(0);

const showExpensesModal = ref(false);
const showIncomesModal = ref(false);
const showGoalsModal = ref(false);

const income = reactive({
  salary: 500,
  investments: 50,
  other: 100,
  totalIncome: 650,
});

const expenses = reactive({
  housing: 300,
  food: 80,
  transport: 50,
  entertainment: 30,
  health: 25,
  other: 0,
  totalExpenses: 485,
});

const summary = reactive({
  dailyBalance: 165,
  dailySavings: 165,
  savingsPercentage: 25.4,
});

const goals = reactive({
  monthlySavingsGoal: 5000,
  monthlyProgress: 165,
  progressPercentage: 3.3,
});

const descriptions = reactive({
  dailyBalance:
    'Es la diferencia entre tus ingresos y gastos del día. Un balance positivo significa que ahorraste, negativo significa que gastaste más de lo que ganaste.',
  dailySavings:
    'Es el dinero que te quedó después de restar tus gastos a tus ingresos. Este es tu ahorro real del día.',
  savingsPercentage:
    'Porcentaje de tus ingresos que lograste ahorrar hoy. Se calcula como: (Ahorro / Ingresos) * 100',
  monthlyGoalProgress:
    'Progreso acumulado hacia tu meta de ahorro mensual. Muestra cuánto has ahorrado vs cuánto necesitas ahorrar.',
});

interface PersonalFinanceConfig {
  monthlySavingsGoal: number;
  budgetHousing: number;
  budgetFood: number;
  budgetTransport: number;
  budgetEntertainment: number;
  budgetHealth: number;
  budgetOther: number;
  minSavingsPercent: number;
}

async function loadConfig() {
  try {
    const configDixie = new DixieController({
      storeName: 'personalFinanceConfig',
    });
    const savedConfig =
      ((await configDixie.listBackups()) as PersonalFinanceConfig[]) || [];
    if (savedConfig.length > 0) {
      const latest = savedConfig.sort(
        (a, b) => (b as any).createdAt - (a as any).createdAt
      )[0] as PersonalFinanceConfig;
      goals.monthlySavingsGoal = latest.monthlySavingsGoal || 5000;
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
}

const selectedDate = ref<string>(format(new Date(), 'yyyy-MM-dd'));

const chartData = reactive<ChartData<'bar'>>({
  labels: ['Ingresos', 'Gastos'],
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
    title: { display: true, text: 'Ingresos y Gastos (día)' },
  },
  scales: {
    x: { type: 'category' },
    y: { type: 'linear' },
  },
});

const hovered = statisticsController.getHovered();
const setHover = (key: string, value: boolean) =>
  statisticsController.setHover(key, value);
const isoDate = (d: Date) => statisticsController.isoDate({ d });
const formatCurrency = (val: number | null | undefined) =>
  statisticsController.formatCurrency(val);

const balanceDelta = computed(() => {
  try {
    return (
      Number(summary.dailyBalance || 0) -
      Number(previousDailyBalance.value || 0)
    );
  } catch (_e) {
    return 0;
  }
});

const formattedBalanceDelta = computed(() => {
  const val = balanceDelta.value;
  const sign = val > 0 ? '+' : val < 0 ? '-' : '';
  return `${sign}${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Math.abs(Number(val || 0)))}`;
});

const balanceDeltaClass = computed(() => {
  if (balanceDelta.value > 0) return 'positive-profit';
  if (balanceDelta.value < 0) return 'negative-profit';
  return '';
});

const balanceClass = computed(() => {
  return Number(summary.dailyBalance ?? 0) < 0
    ? 'negative-profit'
    : 'positive-profit';
});

const savingsPercentageClass = computed(() => {
  return Number(summary.savingsPercentage ?? 0) >= 20
    ? 'positive-profit'
    : Number(summary.savingsPercentage ?? 0) < 10
      ? 'negative-profit'
      : '';
});

const progressClass = computed(() => {
  return Number(goals.progressPercentage ?? 0) >= 50
    ? 'positive-profit'
    : Number(goals.progressPercentage ?? 0) < 25
      ? 'negative-profit'
      : '';
});

const dayLabel = computed(() => {
  const day = addDays(new Date(), dayOffset.value);
  return format(day, 'dd MMM yyyy');
});

const prevDayIso = computed(() => {
  try {
    const d = addDays(new Date(), dayOffset.value - 1);
    return isoDate({ d });
  } catch (_e) {
    return isoDate({ d: addDays(new Date(), -1) });
  }
});

const expensesCategories = computed(() => {
  return [
    { name: 'Vivienda', amount: expenses.housing },
    { name: 'Alimentación', amount: expenses.food },
    { name: 'Transporte', amount: expenses.transport },
    { name: 'Entretenimiento', amount: expenses.entertainment },
    { name: 'Salud', amount: expenses.health },
    { name: 'Otros gastos', amount: expenses.other },
  ];
});

const incomesSources = computed(() => {
  return [
    { name: 'Salario', amount: income.salary },
    { name: 'Inversiones', amount: income.investments },
    { name: 'Otros', amount: income.other },
  ];
});

function openExpensesChart() {
  showExpensesModal.value = true;
}

function openIncomesChart() {
  showIncomesModal.value = true;
}

function openGoalsChart() {
  showGoalsModal.value = true;
}

function prevDay() {
  dayOffset.value -= 1;
  void loadDayData();
}

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
  void loadDayData(selectedDate.value);
}

function nextDay() {
  dayOffset.value += 1;
  void loadDayData();
}

async function loadDayData(dateParam?: string | Date) {
  try {
    console.log('[DayPerformance] loadDayData iniciada');

    if (typeof dateParam !== 'undefined' && dateParam !== null) {
      try {
        let parsed: Date;
        if (typeof dateParam === 'string') {
          parsed = parseLocalDate({ d: String(dateParam).slice(0, 10) });
        } else if (dateParam instanceof Date) {
          parsed = dateParam as Date;
        } else {
          parsed = new Date(dateParam as string);
        }
        const today = new Date();
        dayOffset.value = differenceInCalendarDays(parsed, today);
        selectedDate.value = format(parsed, 'yyyy-MM-dd');
      } catch (_e) {}
    }

    console.log('[DayPerformance] dayOffset:', dayOffset.value);
    const all = ((await dixieController.listBackups()) as Backup[]) || [];
    console.log('[DayPerformance] total backups:', all.length);

    const targetDay = addDays(new Date(), dayOffset.value);
    const target = isoDate({ d: targetDay });
    console.log('[DayPerformance] target date:', target);

    const matches = (Array.isArray(all) ? all : []).filter(b => {
      if (!b) return false;
      if (
        b.component === 'BudgetView' ||
        String(b.component || '').includes('Budget')
      ) {
        return (
          b.data && String(b.data.selectedDate || '').slice(0, 10) === target
        );
      }
      if (b.id && String(b.id).startsWith('budget:')) {
        const idDate = String(b.id).replace('budget:', '').slice(0, 10);
        return idDate === target;
      }
      return false;
    });

    const latest = (matches || []).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    )[0];
    console.log(
      '[DayPerformance] latest backup:',
      latest
        ? {
            component: latest.component,
            selectedDate: latest.data?.selectedDate,
            createdAt: latest.createdAt,
          }
        : null
    );

    let ingresosSum = 0;
    let proveedoresSum = 0;

    if (!(latest && latest.data)) {
      try {
        income.salary = 0;
        income.investments = 0;
        income.other = 0;
        income.totalIncome = 0;

        expenses.housing = 0;
        expenses.food = 0;
        expenses.transport = 0;
        expenses.entertainment = 0;
        expenses.health = 0;
        expenses.other = 0;
        expenses.totalExpenses = 0;

        summary.dailyBalance = 0;
        summary.dailySavings = 0;
        summary.savingsPercentage = 0;

        goals.monthlyProgress = 0;

        previousDailyBalance.value = 0;
        previousTotalIncome.value = 0;
        previousTotalExpenses.value = 0;

        chartData.datasets = [
          {
            ...(chartData.datasets && chartData.datasets[0]
              ? chartData.datasets[0]
              : { label: 'Valores' }),
            data: [0, 0],
          },
        ];
      } catch (_e) {}
    }

    if (latest && latest.data) {
      const d = latest.data;
      if (Array.isArray(d.ingresos || d.entries)) {
        ingresosSum = (d.ingresos || d.entries).reduce(
          (s: number, i: Income) => s + (Number(i.amount || 0) || 0),
          0
        );
        console.log(
          '[DayPerformance] ingresosSum:',
          ingresosSum,
          'entries count:',
          (d.ingresos || d.entries).length
        );
      }
      if (Array.isArray(d.proveedores)) {
        proveedoresSum = d.proveedores.reduce(
          (s: number, p: Provider) => s + (Number(p.amount || 0) || 0),
          0
        );
        console.log('[DayPerformance] proveedoresSum:', proveedoresSum);
      }

      income.totalIncome = Number(ingresosSum || 0);
      expenses.totalExpenses = Number(proveedoresSum || 0);
      summary.dailyBalance = income.totalIncome - expenses.totalExpenses;
      summary.dailySavings = summary.dailyBalance;

      if (income.totalIncome > 0) {
        summary.savingsPercentage = Number(
          ((summary.dailySavings / income.totalIncome) * 100).toFixed(1)
        );
      }

      goals.monthlyProgress += summary.dailySavings;
      if (goals.monthlySavingsGoal > 0) {
        goals.progressPercentage = Number(
          ((goals.monthlyProgress / goals.monthlySavingsGoal) * 100).toFixed(1)
        );
      }
    }

    try {
      const newData = [
        Number(income.totalIncome || 0),
        Number(expenses.totalExpenses || 0),
      ];
      chartData.datasets = [
        {
          ...(chartData.datasets && chartData.datasets[0]
            ? chartData.datasets[0]
            : { label: 'Valores' }),
          data: newData,
        },
      ];
    } catch (_e) {
      try {
        chartData.datasets[0].data = [
          Number(income.totalIncome || 0),
          Number(expenses.totalExpenses || 0),
        ];
      } catch (_err) {}
    }

    const prevDay = addDays(targetDay, -1);
    const prevTarget = isoDate({ d: prevDay });

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
      if (Array.isArray(d.ingresos || d.entries)) {
        prevIngresosSum = d.ingresos.reduce(
          (s: number, i: Income) => s + (Number(i.amount || 0) || 0),
          0
        );
      }
      if (Array.isArray(d.proveedores)) {
        prevProveedoresSum = d.proveedores.reduce(
          (s: number, p: Provider) => s + (Number(p.amount || 0) || 0),
          0
        );
      }
    }

    previousTotalIncome.value = Number(prevIngresosSum || 0);
    previousTotalExpenses.value = Number(prevProveedoresSum || 0);
    previousDailyBalance.value =
      previousTotalIncome.value - previousTotalExpenses.value;

    try {
      setSnapshots({
        current: {
          totalSales: Number(income.totalIncome ?? 0),
          netProfit: Number(summary.dailyBalance ?? 0),
        },
        previous: {
          totalSales: Number(previousTotalIncome.value ?? 0),
          netProfit: Number(previousDailyBalance.value ?? 0),
        },
      });
    } catch (_e) {}
  } catch (e) {
    console.error('loadDayData error', e);
  }
}

function onMainDateClick(e: Event | null) {
  try {
    popovers.mainDate.event = e || null;
    popovers.mainDate.open = true;
  } catch (_e) {}
}

function resetToToday() {
  try {
    selectedDate.value = format(new Date(), 'yyyy-MM-dd');
    dayOffset.value = 0;
    popovers.mainDate.open = false;
    void loadDayData(selectedDate.value);
  } catch (_e) {}
}

const pdfReport = ref<HTMLElement | null>(null);
const isGeneratingPdf = computed(() =>
  statisticsController.getIsGeneratingPdf()
);

async function downloadPdf() {
  if (!pdfReport.value) {
    console.warn('[DayPerformance] pdfReport element not available');
    return;
  }
  if (isGeneratingPdf.value) return;

  await statisticsController.downloadPdf({
    containerRef: pdfReport,
    buttonSelector: '#downloadButton',
    filenameFactory: () =>
      `reporte_dia_${selectedDate.value || isoDate({ d: new Date() })}.pdf`,
  });
}

function setModalFromLayout(val: boolean) {
  try {
    modalOpen.value = !!val;
  } catch (_e) {}
}
</script>

<style scoped>
.positive-profit {
  color: #155724;
  background: rgba(21, 87, 36, 0.06);
  border-radius: 4px;
}

.negative-profit {
  color: #721c24;
  background: rgba(114, 28, 36, 0.06);
  border-radius: 4px;
}
</style>
