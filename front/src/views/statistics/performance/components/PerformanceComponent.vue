<template>
  <PeriodLayout
    :title="periodLabels[period]"
    :date-label="dateLabel"
    :on-prev="prevPeriod"
    :on-next="nextPeriod"
    :on-date-click="onMainDateClick"
    :modal-open="modalOpen"
    @update:modal-from-layout="setModalFromLayout"
  >
    <template #analysis>
      <ion-grid>
        <ion-row>
          <ion-col class="ion-padding">
            <div ref="pdfReport">
              <ion-card-title
                >Resumen del {{ periodLabels[period] }}
                {{ dateLabel }}</ion-card-title
              >

              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Ingresos</ion-label>

                  <ion-button @click="openIncomesChart">
                    <ion-icon :icon="statsChartOutline"></ion-icon>
                  </ion-button>
                </ion-list-header>

                <div class="list-content">
                  <ion-item
                    v-for="(item, index) in incomesList"
                    :key="index"
                    lines="full"
                  >
                    <ion-label>{{ item.name }}</ion-label>
                    <ion-label slot="end">{{
                      formatCurrency(item.amount)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Total ingresos</ion-label>
                    <ion-label slot="end"
                      ><span style="font-weight: bold">{{
                        formatCurrency(incomesTotal)
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
                  <ion-item
                    v-for="(item, index) in expensesList"
                    :key="index"
                    lines="full"
                  >
                    <ion-label>{{ item.name }}</ion-label>
                    <ion-label slot="end">{{ formatCurrency(item.amount) }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Total gastos</ion-label>
                    <ion-label slot="end"
                      ><span style="font-weight: bold">{{
                        formatCurrency(
                          config.categories.length > 0
                            ? categoriesTotal
                            : expenses.total
                        )
                      }}</span></ion-label
                    >
                  </ion-item>
                </div>
              </ion-list>

              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Ingresos (Budget)</ion-label>

                  <ion-button @click="openBudgetIncomesChart">
                    <ion-icon :icon="statsChartOutline"></ion-icon>
                  </ion-button>
                </ion-list-header>

                <div class="list-content">
                  <ion-item lines="full">
                    <ion-label>Total real</ion-label>
                    <ion-label slot="end"
                      ><span style="font-weight: bold; color: var(--ion-color-success, #2dd36f)">{{
                        formatCurrency(budgetIncomesTotal)
                      }}</span></ion-label
                    >
                  </ion-item>
                </div>
              </ion-list>

              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Gastos (Budget)</ion-label>

                  <ion-button @click="openBudgetExpensesChart">
                    <ion-icon :icon="statsChartOutline"></ion-icon>
                  </ion-button>
                </ion-list-header>

                <div class="list-content">
                  <ion-item lines="full">
                    <ion-label>Total real</ion-label>
                    <ion-label slot="end"
                      ><span style="font-weight: bold; color: var(--ion-color-danger, #eb445a)">{{
                        formatCurrency(budgetExpensesTotal)
                      }}</span></ion-label
                    >
                  </ion-item>
                </div>
              </ion-list>

              <div class="ion-padding">
                <ion-item :class="realBalanceClass" lines="full">
                  <ion-label>
                    <div>Balance real</div>
                    <small style="color: var(--ion-color-medium, #666)">
                      Budget (ingresos - gastos)
                    </small>
                  </ion-label>
                  <ion-label slot="end"
                    ><span style="font-weight: bold">{{
                      formatCurrency(realBalance)
                    }}</span></ion-label
                  >
                </ion-item>
              </div>

              <div class="ion-padding">
                <ion-item :class="projectedBalanceClass" lines="full">
                  <ion-label>
                    <div>Balance proyectado</div>
                    <small style="color: var(--ion-color-medium, #666)">
                      Real + Fijo (ingresos - egresos)
                    </small>
                  </ion-label>
                  <ion-label slot="end"
                    ><span style="font-weight: bold">{{
                      formatCurrency(projectedBalance)
                    }}</span></ion-label
                  >
                </ion-item>
              </div>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </template>

    <template #modal-content>
      <ion-list-header>
        <ion-label>{{ periodLabels[period] }}</ion-label>
      </ion-list-header>

      <div
        class="list-content"
        style="height: calc(100% - 58px); overflow-y: auto"
      >
        <ion-item class="transparent" lines="full">
          <ion-label>
            <div style="font-weight: 600">Actual — {{ currentDate }}</div>

            <small style="display: block; color: var(--ion-color-medium, #666)"
              >Ingresos: {{ formatCurrency(income.total) }} • Gastos:
              {{ formatCurrency(expenses.total) }} • Balance:
              {{ formatCurrency(summary.balance) }}</small
            >
          </ion-label>
        </ion-item>

        <ion-item class="transparent" lines="full">
          <ion-label>
            <div style="font-weight: 600">Anterior — {{ previousDate }}</div>

            <small style="display: block; color: var(--ion-color-medium, #666)"
              >Ingresos: {{ formatCurrency(previousIncome) }} • Gastos:
              {{ formatCurrency(previousExpenses) }} • Balance:
              {{ formatCurrency(previousBalance) }}</small
            >
          </ion-label>
        </ion-item>
      </div>
    </template>
  </PeriodLayout>

  <ion-modal
    :is-open="showIncomesModal"
    @did-dismiss="showIncomesModal = false"
  >
    <IncomesChartModal
      :sources="incomesList"
      @close="showIncomesModal = false"
    />
  </ion-modal>

  <ion-modal
    :is-open="showExpensesModal"
    @did-dismiss="showExpensesModal = false"
  >
    <ExpensesChartModal
      :categories="expensesList"
      @close="showExpensesModal = false"
    />
  </ion-modal>

  <ion-modal
    :is-open="showBudgetIncomesModal"
    @did-dismiss="showBudgetIncomesModal = false"
  >
    <BudgetIncomesChartModal
      :entries="budgetIncomesEntries"
      @close="showBudgetIncomesModal = false"
    />
  </ion-modal>

  <ion-modal
    :is-open="showBudgetExpensesModal"
    @did-dismiss="showBudgetExpensesModal = false"
  >
    <BudgetExpensesChartModal
      :entries="budgetExpensesEntries"
      @close="showBudgetExpensesModal = false"
    />
  </ion-modal>

  <ion-popover
    :is-open="popovers.mainDate.open"
    :event="popovers.mainDate.event"
    @did-dismiss="popovers.mainDate.open = false"
  >
    <ion-content>
      <ion-datetime
        :value="format(referenceDate, 'yyyy-MM-dd')"
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
import IncomesChartModal from '@/views/statistics/performance/components/IncomesChartModal.vue';
import ExpensesChartModal from '@/views/statistics/performance/components/ExpensesChartModal.vue';
import BudgetIncomesChartModal from '@/views/statistics/performance/components/BudgetIncomesChartModal.vue';
import BudgetExpensesChartModal from '@/views/statistics/performance/components/BudgetExpensesChartModal.vue';
import {
  downloadOutline,
  informationCircleOutline,
  statsChartOutline,
} from 'ionicons/icons';
import { computed, reactive, onMounted, ref, watch } from 'vue';
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInCalendarDays,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
} from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import { useChart } from '@/composables/useChart';

const { loadChartDependencies } = useChart();
onMounted(() => {
  loadChartDependencies();
  void loadConfig();
  void loadData();

  watch(() => props.period, () => {
    void loadData();
  });
});

const categoriesLoaded = ref(false);

async function loadConfig() {
  try {
    const configDixie = new DixieController({ storeName: 'config' });
    const savedConfig = ((await configDixie.listBackups()) as any[]) || [];
    if (savedConfig.length > 0) {
      const latest = savedConfig.sort(
        (a, b) => (b as any).createdAt - (a as any).createdAt
      )[0];

      if (latest.data) {
        if (Array.isArray(latest.data.categories)) {
          config.categories = [...latest.data.categories];
        }

        if (Array.isArray(latest.data.incomes)) {
          config.incomes = [...latest.data.incomes];
        }

        if (latest.data.savingsPercent) {
          config.savingsPercent = latest.data.savingsPercent;
        }

        categoriesLoaded.value = true;
      }
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
}

import { DixieController } from '@/controllers/dixie';
import dixieController from '@/controllers/dixie';
import budgetController from '@/controllers/budgetController';
import { StatisticsController } from '@/controllers/statisticsController';

const statisticsController = new StatisticsController();

const popovers = statisticsController.getPopovers();

const { snapshots, modalOpen, setSnapshots } = {
  snapshots: statisticsController.getSnapshots(),
  modalOpen: statisticsController.getModalOpen(),
  setSnapshots: (val: Snapshots) => statisticsController.setSnapshots(val),
};

const props = defineProps<{
  period: 'day' | 'week' | 'month' | 'year';
}>();

const periodLabels: Record<string, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

const periodLabel = computed(() => {
  return props.period === 'day'
    ? 'mensual'
    : props.period === 'week'
      ? 'semanal'
      : props.period === 'month'
        ? 'mensual'
        : 'anual';
});

const currentLabel = computed(() => {
  return props.period === 'day'
    ? 'Hoy'
    : props.period === 'week'
      ? 'Esta semana'
      : props.period === 'month'
        ? 'Este mes'
        : 'Este año';
});

const previousLabel = computed(() => {
  return props.period === 'day'
    ? 'Ayer'
    : props.period === 'week'
      ? 'Semana pasada'
      : props.period === 'month'
        ? 'Mes pasado'
        : 'Año pasado';
});

const showIncomesModal = ref(false);
const showExpensesModal = ref(false);
const showBudgetIncomesModal = ref(false);
const showBudgetExpensesModal = ref(false);

const referenceDate = ref(new Date());

interface BudgetCategory {
  key: string;
  name: string;
  amount: number;
  interval: number;
  period: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  placeholder?: string;
}

interface FixedIncome {
  key: string;
  name: string;
  amount: number;
  interval: number;
  period: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
}

const config = reactive({
  savingsPercent: 20,
  categories: [] as BudgetCategory[],
  incomes: [] as FixedIncome[],
});

const income = reactive({
  salary: 500,
  investments: 50,
  other: 100,
  total: 650,
});

const expenses = reactive({
  housing: 300,
  food: 80,
  transport: 50,
  entertainment: 30,
  health: 25,
  other: 0,
  total: 485,
});

const summary = reactive({
  balance: 165,
  savings: 165,
  savingsPercentage: 25.4,
});

const previousIncome = ref(0);
const previousExpenses = ref(0);
const previousBalance = ref(0);

// Variables para datos de Budget del período
const periodEntries = ref<any[]>([]);
const budgetIncomesTotal = ref(0);
const budgetExpensesTotal = ref(0);
const realBalance = computed(() => budgetIncomesTotal.value - budgetExpensesTotal.value);
const realBalanceClass = computed(() => Number(realBalance.value) < 0 ? 'negative-profit' : 'positive-profit');

const categoriesTotal = computed(() => {
  const divider = getPeriodDivider();
  return config.categories.reduce((sum, cat) => {
    const factor = periodFactors[cat.period] || 1;
    const interval = cat.interval || 1;
    const adjustedAmount = ((cat.amount || 0) / interval) * factor / divider;
    return sum + adjustedAmount;
  }, 0);
});

const fixedBalance = computed(() => {
  const incomes = config.incomes.length > 0 ? incomesTotal.value : income.total;
  const expensesTotal = config.categories.length > 0 ? categoriesTotal.value : expenses.total;
  return incomes - expensesTotal;
});
const projectedBalance = computed(() => realBalance.value + fixedBalance.value);
const budgetIncomesEntries = computed(() => {
  return periodEntries.value.filter(entry => entry.entryType === 'ingreso');
});

const budgetExpensesEntries = computed(() => {
  return periodEntries.value.filter(entry => entry.entryType === 'gasto');
});

const incomesTotal = computed(() => {
  const divider = getPeriodDivider();
  if (config.incomes.length > 0) {
    return config.incomes.reduce((sum, inc) => {
      const factor = periodFactors[inc.period] || 1;
      const interval = inc.interval || 1;
      const adjustedAmount = ((inc.amount || 0) / interval) * factor / divider;
      return sum + adjustedAmount;
    }, 0);
  }
  return income.total;
});
const setHover = (key: string, value: boolean) =>
  statisticsController.setHover(key, value);
const isoDate = (d: Date) => statisticsController.isoDate({ d });
const formatCurrency = (val: number | null | undefined) =>
  statisticsController.formatCurrency(val);

const incomesList = computed(() => {
  const divider = getPeriodDivider();
  
  if (config.incomes.length > 0) {
    return config.incomes.map(inc => {
      const factor = periodFactors[inc.period] || 1;
      const interval = inc.interval || 1;
      const adjustedAmount = ((inc.amount || 0) / interval) * factor / divider;
      return {
        name: inc.name || 'Sin nombre',
        amount: Number(adjustedAmount.toFixed(2)),
      };
    });
  }
  
  return [
    { name: 'Salario', amount: income.salary },
    { name: 'Inversiones', amount: income.investments },
    { name: 'Otros', amount: income.other },
  ];
});

const balanceDelta = computed(() => {
  return Number(summary.balance || 0) - Number(previousBalance.value || 0);
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
  return Number(summary.balance ?? 0) < 0
    ? 'negative-profit'
    : 'positive-profit';
});

const savingsPercentageClass = computed(() => {
  if (Number(summary.savingsPercentage ?? 0) >= config.savingsPercent) return 'positive-profit';
  if (Number(summary.savingsPercentage ?? 0) < config.savingsPercent / 2) return 'negative-profit';
  return '';
});

const targetClass = computed(() => {
  return Number(summary.savingsPercentage ?? 0) >= config.savingsPercent
    ? 'positive-profit'
    : 'negative-profit';
});

const periodFactors: Record<string, number> = {
  daily: 30,
  weekly: 4,
  biweekly: 2,
  monthly: 1,
  yearly: 0.083,
};

const getPeriodDivider = (): number => {
  switch (props.period) {
    case 'day':
      return 30;
    case 'week':
      return 4;
    case 'month':
      return 1;
    case 'year':
      return 0.083;
    default:
      return 1;
  }
};

const getPeriodLabel = (period: string): string => {
  const labels: Record<string, string> = {
    daily: '/día',
    weekly: '/semana',
    biweekly: '/quincena',
    monthly: '/mes',
    yearly: '/año',
  };
  return labels[period] || '';
};

const expensesList = computed(() => {
  const divider = getPeriodDivider();
  if (categoriesLoaded.value && config.categories.length > 0) {
    return config.categories.map(cat => {
      const factor = periodFactors[cat.period] || 1;
      const interval = cat.interval || 1;
      const adjustedAmount = ((cat.amount || 0) / interval) * factor / divider;
      return {
        name: cat.name,
        amount: Number(adjustedAmount.toFixed(2)),
      };
    });
  }
  return [
    { name: 'Vivienda', amount: expenses.housing },
    { name: 'Alimentación', amount: expenses.food },
    { name: 'Transporte', amount: expenses.transport },
    { name: 'Entretenimiento', amount: expenses.entertainment },
    { name: 'Salud', amount: expenses.health },
    { name: 'Otros gastos', amount: expenses.other },
  ];
});

const dateLabel = computed(() => {
  const baseDate = getBaseDate();
  switch (props.period) {
    case 'day':
      return format(baseDate, 'dd MMM yyyy');
    case 'week':
      return `${format(startOfWeek(baseDate), 'dd')} - ${format(endOfWeek(baseDate), 'dd MMM yyyy')}`;
    case 'month':
      return `${format(startOfMonth(baseDate), 'dd')} - ${format(endOfMonth(baseDate), 'dd MMM yyyy')}`;
    case 'year':
      return format(baseDate, 'yyyy');
    default:
      return '';
  }
});

const currentDate = computed(() => {
  const baseDate = getBaseDate();
  switch (props.period) {
    case 'day':
      return format(baseDate, 'yyyy-MM-dd');
    case 'week':
      return `${format(startOfWeek(baseDate), 'dd MMM')} - ${format(endOfWeek(baseDate), 'dd MMM')}`;
    case 'month':
      return format(baseDate, 'MMMM yyyy');
    case 'year':
      return format(baseDate, 'yyyy');
    default:
      return '';
  }
});

const previousDate = computed(() => {
  const prevDate = getPreviousPeriodDate();
  switch (props.period) {
    case 'day':
      return format(prevDate, 'yyyy-MM-dd');
    case 'week':
      return `${format(startOfWeek(prevDate), 'dd MMM')} - ${format(endOfWeek(prevDate), 'dd MMM')}`;
    case 'month':
      return format(prevDate, 'MMMM yyyy');
    case 'year':
      return format(prevDate, 'yyyy');
    default:
      return '';
  }
});

function getBaseDate(): Date {
  const refDate = new Date(referenceDate.value);
  switch (props.period) {
    case 'day':
      return refDate;
    case 'week':
      return startOfWeek(refDate);
    case 'month':
      return startOfMonth(refDate);
    case 'year':
      return startOfYear(refDate);
    default:
      return refDate;
  }
}

function getPreviousPeriodDate(): Date {
  const baseDate = getBaseDate();
  switch (props.period) {
    case 'day':
      return addDays(baseDate, -1);
    case 'week':
      return addWeeks(baseDate, -1);
    case 'month':
      return addMonths(baseDate, -1);
    case 'year':
      return addYears(baseDate, -1);
    default:
      return baseDate;
  }
}

function getBudgetDateRange(): { start: Date; end: Date } {
  const baseDate = getBaseDate();
  let start: Date;
  let end: Date;

  switch (props.period) {
    case 'day':
      start = new Date(baseDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(baseDate);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start = startOfWeek(baseDate);
      end = endOfWeek(baseDate);
      break;
    case 'month':
      start = startOfMonth(baseDate);
      end = endOfMonth(baseDate);
      break;
    case 'year':
      start = startOfYear(baseDate);
      end = endOfYear(baseDate);
      break;
    default:
      start = new Date(baseDate);
      end = new Date(baseDate);
  }

  return { start, end };
}

function getPreviousPeriodDateRange(): { start: Date; end: Date } {
  const baseDate = getBaseDate();
  let start: Date;
  let end: Date;

  switch (props.period) {
    case 'day': {
      const prevDay = addDays(baseDate, -1);
      start = new Date(prevDay);
      start.setHours(0, 0, 0, 0);
      end = new Date(prevDay);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'week': {
      const prevWeekStart = addWeeks(startOfWeek(baseDate), -1);
      start = prevWeekStart;
      end = endOfWeek(prevWeekStart);
      break;
    }
    case 'month': {
      const prevMonthStart = addMonths(startOfMonth(baseDate), -1);
      start = prevMonthStart;
      end = endOfMonth(prevMonthStart);
      break;
    }
    case 'year': {
      const prevYearStart = addYears(startOfYear(baseDate), -1);
      start = prevYearStart;
      end = endOfYear(prevYearStart);
      break;
    }
    default:
      start = new Date(baseDate);
      end = new Date(baseDate);
  }

  return { start, end };
}

function prevPeriod() {
  const refDate = new Date(referenceDate.value);
  switch (props.period) {
    case 'day':
      referenceDate.value = addDays(refDate, -1);
      break;
    case 'week':
      referenceDate.value = startOfWeek(addWeeks(refDate, -1));
      break;
    case 'month':
      referenceDate.value = startOfMonth(addMonths(refDate, -1));
      break;
    case 'year':
      referenceDate.value = startOfYear(addYears(refDate, -1));
      break;
  }
  void loadData();
}

function nextPeriod() {
  const refDate = new Date(referenceDate.value);
  switch (props.period) {
    case 'day':
      referenceDate.value = addDays(refDate, 1);
      break;
    case 'week':
      referenceDate.value = startOfWeek(addWeeks(refDate, 1));
      break;
    case 'month':
      referenceDate.value = startOfMonth(addMonths(refDate, 1));
      break;
    case 'year':
      referenceDate.value = startOfYear(addYears(refDate, 1));
      break;
  }
  void loadData();
}

function onPopoverDateChange(e: CustomEvent) {
  try {
    const val = e?.detail?.value || format(new Date(referenceDate.value), 'yyyy-MM-dd');
    const parsed = parseLocalDate({ d: String(val).slice(0, 10) });
    referenceDate.value = parsed;
  } catch (_err) {}
  popovers.mainDate.open = false;
  void loadData();
}

async function loadData() {
  try {
    const { start, end } = getBudgetDateRange();
    const allEntries: any[] = [];
    let periodIncome = 0;
    let periodExpenses = 0;

    const { start: prevStart, end: prevEnd } = getPreviousPeriodDateRange();
    let prevIncome = 0;
    let prevExpenses = 0;

    let currentDateIter = new Date(start);
    while (currentDateIter <= end) {
      const dateStr = format(currentDateIter, 'yyyy-MM-dd');
      await budgetController.loadDataForDate({ date: dateStr });

      const entries = budgetController.getEntries();
      const providers = budgetController.getProviders();

      for (const entry of entries) {
        allEntries.push(entry);
        const amount = Number(entry.amount || 0);
        if (entry.entryType === 'ingreso') {
          periodIncome += amount;
        } else {
          periodExpenses += amount;
        }
      }

      currentDateIter = addDays(currentDateIter, 1);
    }

    currentDateIter = new Date(prevStart);
    while (currentDateIter <= prevEnd) {
      const dateStr = format(currentDateIter, 'yyyy-MM-dd');
      await budgetController.loadDataForDate({ date: dateStr });

      const entries = budgetController.getEntries();
      for (const entry of entries) {
        const amount = Number(entry.amount || 0);
        if (entry.entryType === 'ingreso') {
          prevIncome += amount;
        } else {
          prevExpenses += amount;
        }
      }

      currentDateIter = addDays(currentDateIter, 1);
    }

    periodEntries.value = allEntries;
    budgetIncomesTotal.value = periodIncome;
    budgetExpensesTotal.value = periodExpenses;

    const today = format(new Date(), 'yyyy-MM-dd');
    await budgetController.loadDataForDate({ date: today });

    income.total = periodIncome;
    income.salary = Math.floor(periodIncome * 0.7);
    income.investments = Math.floor(periodIncome * 0.1);
    income.other = Math.floor(periodIncome * 0.2);

    expenses.total = periodExpenses;
    expenses.housing = Math.floor(periodExpenses * 0.5);
    expenses.food = Math.floor(periodExpenses * 0.2);
    expenses.transport = Math.floor(periodExpenses * 0.1);
    expenses.entertainment = Math.floor(periodExpenses * 0.1);
    expenses.health = Math.floor(periodExpenses * 0.05);
    expenses.other = Math.floor(periodExpenses * 0.05);

    summary.balance = income.total - expenses.total;
    summary.savings = summary.balance;
    summary.savingsPercentage =
      income.total > 0
        ? Number(((summary.savings / income.total) * 100).toFixed(1))
        : 0;

    previousIncome.value = prevIncome;
    previousExpenses.value = prevExpenses;
    previousBalance.value = prevIncome - prevExpenses;

    setSnapshots({
      current: {
        totalSales: Number(income.total ?? 0),
        netProfit: Number(summary.balance ?? 0),
      },
      previous: {
        totalSales: Number(previousIncome.value ?? 0),
        netProfit: Number(previousBalance.value ?? 0),
      },
    });
  } catch (e) {
    console.error('loadData error', e);
  }
}

function onMainDateClick(e: Event | null) {
  try {
    popovers.mainDate.event = e || null;
    popovers.mainDate.open = true;
  } catch (_e) {}
}

function resetToToday() {
  referenceDate.value = new Date();
  popovers.mainDate.open = false;
  void loadData();
}

const pdfReport = ref<HTMLElement | null>(null);

function setModalFromLayout(val: boolean) {
  try {
    modalOpen.value = !!val;
  } catch (_e) {}
}

function openIncomesChart() {
  showIncomesModal.value = true;
}

function openExpensesChart() {
  showExpensesModal.value = true;
}

function openBudgetIncomesChart() {
  showBudgetIncomesModal.value = true;
}

function openBudgetExpensesChart() {
  showBudgetExpensesModal.value = true;
}

defineExpose({
  pdfRef: pdfReport,
  income,
  expenses,
  summary,
  config,
  dateLabel,
  budgetIncomesTotal,
  budgetExpensesTotal,
  realBalance,
  projectedBalance,
  loadConfig,
});
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
