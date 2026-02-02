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
                        formatCurrency(income.total)
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
                    <ion-label slot="end"
                      >{{ formatCurrency(item.amount) }}{{ item.periodLabel }}</ion-label
                    >
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

              <div class="ion-padding">
                <ion-item :class="balanceClass" lines="full">
                  <ion-label>
                    <div>Balance del {{ period }}</div>

                    <small
                      style="
                        display: block;
                        color: var(--ion-color-medium, #666);
                      "
                    >
                      Δ vs {{ previousLabel }}:
                      <span :class="balanceDeltaClass">{{
                        formattedBalanceDelta
                      }}</span></small
                    >
                  </ion-label>

                  <ion-label slot="end"
                    ><span style="font-weight: bold">{{
                      formatCurrency(summary.balance)
                    }}</span></ion-label
                  >
                </ion-item>
              </div>

              <ion-list class="transparent">
                <div class="list-content">
                  <ion-item lines="full">
                    <ion-label>Ahorro del {{ period }}</ion-label>

                    <ion-label slot="end"
                      ><span
                        style="
                          font-weight: bold;
                          color: var(--ion-color-success, #2dd36f);
                        "
                        >{{ formatCurrency(summary.savings) }}</span
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

                  <ion-item lines="full">
                    <ion-label>Meta esperada</ion-label>

                    <ion-label slot="end"
                      ><span :class="targetClass"
                        >{{ config.savingsPercent }}%</span
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
});

async function loadConfig() {
  try {
    const configDixie = new DixieController({ storeName: 'config' });
    const savedConfig = ((await configDixie.listBackups()) as any[]) || [];
    if (savedConfig.length > 0) {
      const latest = savedConfig.sort(
        (a, b) => (b as any).createdAt - (a as any).createdAt
      )[0];

      if (latest.data) {
        if (Array.isArray(latest.data.categories) && latest.data.categories.length > 0) {
          config.categories = [...latest.data.categories];
        }

        if (latest.data.savingsPercent) {
          config.savingsPercent = latest.data.savingsPercent;
        }
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

const periodOffset = ref(0);
const selectedDate = ref<string>(format(new Date(), 'yyyy-MM-dd'));

interface BudgetCategory {
  key: string;
  name: string;
  amount: number;
  placeholder?: string;
}

const config = reactive({
  savingsPercent: 20,
  categories: [] as BudgetCategory[],
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

const hovered = statisticsController.getHovered();
const setHover = (key: string, value: boolean) =>
  statisticsController.setHover(key, value);
const isoDate = (d: Date) => statisticsController.isoDate({ d });
const formatCurrency = (val: number | null | undefined) =>
  statisticsController.formatCurrency(val);

const incomesList = computed(() => {
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
    daily: '/mes',
    weekly: '/mes',
    biweekly: '/mes',
    monthly: '',
    yearly: '/mes',
  };
  return labels[period] || '';
};

const expensesList = computed(() => {
  const divider = getPeriodDivider();
  if (config.categories.length > 0) {
    return config.categories.map(cat => {
      const factor = periodFactors[cat.period] || 1;
      const interval = cat.interval || 1;
      const adjustedAmount = (cat.amount || 0) / interval / factor / divider;
      return {
        name: cat.name,
        amount: Number(adjustedAmount.toFixed(2)),
        periodLabel: getPeriodLabel(cat.period),
      };
    });
  }
  return [
    { name: 'Vivienda', amount: expenses.housing, periodLabel: '' },
    { name: 'Alimentación', amount: expenses.food, periodLabel: '' },
    { name: 'Transporte', amount: expenses.transport, periodLabel: '' },
    { name: 'Entretenimiento', amount: expenses.entertainment, periodLabel: '' },
    { name: 'Salud', amount: expenses.health, periodLabel: '' },
    { name: 'Otros gastos', amount: expenses.other, periodLabel: '' },
  ];
});

const categoriesTotal = computed(() => {
  const divider = getPeriodDivider();
  return config.categories.reduce((sum, cat) => {
    const factor = periodFactors[cat.period] || 1;
    const interval = cat.interval || 1;
    const adjustedAmount = (cat.amount || 0) / interval / factor / divider;
    return sum + adjustedAmount;
  }, 0);
});

const dateLabel = computed(() => {
  const baseDate = getBaseDate();
  switch (props.period) {
    case 'day':
      return format(baseDate, 'dd MMM yyyy');
    case 'week':
      return format(baseDate, 'dd MMM');
    case 'month':
      return format(baseDate, 'MMMM yyyy');
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
  const today = new Date();
  switch (props.period) {
    case 'day':
      return addDays(today, periodOffset.value);
    case 'week':
      return addWeeks(today, periodOffset.value);
    case 'month':
      return addMonths(today, periodOffset.value);
    case 'year':
      return addYears(today, periodOffset.value);
    default:
      return today;
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

function prevPeriod() {
  periodOffset.value -= 1;
  void loadData();
}

function nextPeriod() {
  periodOffset.value += 1;
  void loadData();
}

function onPopoverDateChange(e: CustomEvent) {
  try {
    const val = e?.detail?.value || selectedDate.value;
    const parsed = parseLocalDate({ d: String(val).slice(0, 10) });
    selectedDate.value = format(parsed, 'yyyy-MM-dd');
    const today = new Date();
    periodOffset.value = differenceInCalendarDays(parsed, today);
  } catch (_err) {
    periodOffset.value = 0;
  }
  popovers.mainDate.open = false;
  void loadData();
}

async function loadData() {
  try {
    const targetDate = getBaseDate();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const target = `${year}-${month}-${day}`;

    budgetController.setDate({ date: target });
    await budgetController.loadDataForCurrentDate();

    const entries = budgetController.getEntries();
    const providers = budgetController.getProviders();

    let currentIncome = 0;
    let currentExpenses = 0;

    for (const entry of entries) {
      const amount = Number(entry.amount || 0);
      if (entry.entryType === 'ingreso') {
        currentIncome += amount;
      } else {
        currentExpenses += amount;
      }
    }

    for (const provider of providers) {
      currentExpenses += Number(provider.estimated || 0);
    }

    income.total = currentIncome;
    income.salary = Math.floor(currentIncome * 0.7);
    income.investments = Math.floor(currentIncome * 0.1);
    income.other = Math.floor(currentIncome * 0.2);

    expenses.total = currentExpenses;
    expenses.housing = Math.floor(currentExpenses * 0.5);
    expenses.food = Math.floor(currentExpenses * 0.2);
    expenses.transport = Math.floor(currentExpenses * 0.1);
    expenses.entertainment = Math.floor(currentExpenses * 0.1);
    expenses.health = Math.floor(currentExpenses * 0.05);
    expenses.other = Math.floor(currentExpenses * 0.05);

    summary.balance = income.total - expenses.total;
    summary.savings = summary.balance;
    summary.savingsPercentage =
      income.total > 0
        ? Number(((summary.savings / income.total) * 100).toFixed(1))
        : 0;

    const prevDate = getPreviousPeriodDate();
    const prevYear = prevDate.getFullYear();
    const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
    const prevDay = String(prevDate.getDate()).padStart(2, '0');
    const prevTarget = `${prevYear}-${prevMonth}-${prevDay}`;

    budgetController.setDate({ date: prevTarget });
    await budgetController.loadDataForCurrentDate();

    const prevEntries = budgetController.getEntries();
    const prevProviders = budgetController.getProviders();

    let prevInc = 0;
    let prevExp = 0;

    for (const entry of prevEntries) {
      const amount = Number(entry.amount || 0);
      if (entry.entryType === 'ingreso') {
        prevInc += amount;
      } else {
        prevExp += amount;
      }
    }

    for (const provider of prevProviders) {
      prevExp += Number(provider.estimated || 0);
    }

    previousIncome.value = prevInc;
    previousExpenses.value = prevExp;
    previousBalance.value = prevInc - prevExp;

    budgetController.setDate({ date: target });
    await budgetController.loadDataForCurrentDate();

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
  selectedDate.value = format(new Date(), 'yyyy-MM-dd');
  periodOffset.value = 0;
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

defineExpose({
  pdfRef: pdfReport,
  income,
  expenses,
  summary,
  config,
  dateLabel,
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
