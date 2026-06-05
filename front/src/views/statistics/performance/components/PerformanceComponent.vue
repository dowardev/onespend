<template>
  <PeriodLayout
    :title="periodLabels[period]"
    :date-label="dateLabel"
    :on-prev="handlePrevPeriod"
    :on-next="handleNextPeriod"
    :on-date-click="onMainDateClick"
  >
    <template #analysis>
      <ion-item>
        <ion-label>Resumen del {{ periodLabels[period] }} {{ dateLabel }}</ion-label>

        <ion-label slot="end" :color="realBalance >= 0 ? 'success' : 'danger'">{{
          formatCurrency(realBalance)
        }}</ion-label>
      </ion-item>

      <ion-grid>
        <ion-row>
          <ion-col size="6">
            <EntriesList
              title="Ingresos"
              :items="incomesList"
              :total="incomesTotal"
              footer-label="Total ingresos"
              :show-chart="true"
              :chart-colors="incomeChartColors"
              @edit="openEditEntryModal"
            />
          </ion-col>

          <ion-col size="6">
            <EntriesList
              title="Gastos"
              :items="expensesList"
              :total="expensesTotal"
              footer-label="Total gastos"
              :show-chart="true"
              :chart-colors="expenseChartColors"
              @edit="openEditEntryModal"
            />
          </ion-col>
        </ion-row>
      </ion-grid>
    </template>
  </PeriodLayout>

  <ion-popover
    :is-open="popovers.mainDate.open"
    :event="popovers.mainDate.event"
    keep-contents-mounted
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
          @click="handleResetToToday()"
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
  IonCol,
  IonContent,
  IonLoading,
  IonDatetime,
  IonButton,
  IonItem,
  IonLabel,
  IonPopover,
  IonRow,
  IonAlert,
  IonGrid,
} from '@ionic/vue';
import PeriodLayout from '../components/PeriodLayout.vue';
import EntriesList from './EntriesList.vue';
import { computed, reactive, onMounted, ref, watch, toRef } from 'vue';
import { format, addDays } from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import { useBudgetDayStore } from '@/stores/budgetDayStore';
import { useBudgetEntriesStore } from '@/stores/budgetEntriesStore';
import systemController from '@/controllers/systemConfigController';
import { useRouter } from 'vue-router';
import { StatisticsController, type Snapshots } from '@/controllers/statisticsController';
import { usePeriodRange, type PeriodType } from '@/composables/usePeriodRange';
import type { Income } from '@/stores/budgetEntriesStore';

const props = defineProps<{
  period: PeriodType;
}>();

const periodLabels: Record<PeriodType, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

// Period range composable
const weekStartDay = ref(1);
const periodRef = toRef(props, 'period');
const {
  referenceDate,
  dateLabel,
  getBudgetDateRange,
  getPreviousPeriodDateRange,
  prevPeriod,
  nextPeriod,
  resetToToday,
} = usePeriodRange(periodRef, { weekStartDay });

// Statistics controller for popovers and snapshots
const statisticsController = new StatisticsController();
const popovers = statisticsController.getPopovers();
const setSnapshots = (val: Snapshots) => statisticsController.setSnapshots(val);

async function loadWeekStartDayConfig() {
  try {
    const savedWeekStart = await systemController.getWeekStartDay();
    if (savedWeekStart !== undefined && savedWeekStart !== null) {
      weekStartDay.value = savedWeekStart;
    }
  } catch (e) {
    console.error('Error loading week start day config:', e);
  }
}

const isGeneratingPdf = ref(false);

const router = useRouter();

const income = reactive({
  salary: 0,
  investments: 0,
  other: 0,
  total: 0,
});

const expenses = reactive({
  housing: 0,
  food: 0,
  transport: 0,
  entertainment: 0,
  health: 0,
  other: 0,
  total: 0,
});

const summary = reactive({
  balance: 0,
  savings: 0,
  savingsPercentage: 0,
});

const previousIncome = ref(0);
const previousExpenses = ref(0);
const previousBalance = ref(0);

const periodEntries = ref<Income[]>([]);
const expensesTotal = computed(() => {
  return periodEntries.value
    .filter((entry) => entry.entryType !== 'ingreso')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
});

const incomesTotal = computed(() => {
  return periodEntries.value
    .filter((entry) => entry.entryType === 'ingreso')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
});

const realBalance = computed(() => incomesTotal.value - expensesTotal.value);

const realBalanceClass = computed(() =>
  Number(realBalance.value) < 0 ? 'negative-profit' : 'positive-profit',
);

const incomesList = computed(() => {
  return periodEntries.value
    .filter((entry) => entry.entryType === 'ingreso')
    .map((entry) => ({
      ...entry,
      name: entry.name,
      amount: Number(entry.amount || 0),
    }));
});

const expensesList = computed(() => {
  return periodEntries.value
    .filter((entry) => entry.entryType !== 'ingreso')
    .map((entry) => ({
      ...entry,
      name: entry.name,
      amount: Number(entry.amount || 0),
    }));
});

const incomeChartColors = [
  '#4BC0C0',
  '#36A2EB',
  '#FFCE56',
  '#FF6384',
  '#9966FF',
  '#FF9F40',
  '#7BC225',
  '#C9CBCF',
];
const expenseChartColors = [
  '#FF6384',
  '#36A2EB',
  '#FFCE56',
  '#4BC0C0',
  '#9966FF',
  '#FF9F40',
  '#C9CBCF',
  '#7BC225',
];

const isDayClosed = computed(() => false);

function openEditEntryModal(item: Income) {
  router.push(`/budget/entry/edit?entryId=${item.id}`);
}

// Wrappers for period navigation that also reload data
function handlePrevPeriod() {
  prevPeriod();
  void loadData();
}

function handleNextPeriod() {
  nextPeriod();
  void loadData();
}

function handleResetToToday() {
  resetToToday();
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
      await useBudgetDayStore().loadBudgetForDate({ date: dateStr });

      const entriesStore = useBudgetEntriesStore();
      const entries = entriesStore.entries;

      for (const entry of entries) {
        // ensure each entry carries its budget date so modals can show it
        const annotated = { ...entry, date: entry.date || dateStr };
        allEntries.push(annotated);
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
      await useBudgetDayStore().loadBudgetForDate({ date: dateStr });

      const entriesStore = useBudgetEntriesStore();
      const entries = entriesStore.entries;
      for (const entry of entries) {
        // annotate previous period entries with their date as well
        // (not added to allEntries but used for totals)
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
      income.total > 0 ? Number(((summary.savings / income.total) * 100).toFixed(1)) : 0;

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
  popovers.mainDate.event = e || null;
  popovers.mainDate.open = true;
}

function onPopoverDateChange(e: CustomEvent) {
  const val = e?.detail?.value || format(referenceDate.value, 'yyyy-MM-dd');
  const parsed = parseLocalDate({ d: String(val).slice(0, 10) });
  referenceDate.value = parsed;
  popovers.mainDate.open = false;
  void loadData();
}

function formatCurrency(val: number | null | undefined) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(val || 0);
}

onMounted(() => {
  void loadWeekStartDayConfig();
  void loadData();

  watch(
    () => props.period,
    (newPeriod, oldPeriod) => {
      if (oldPeriod !== newPeriod) {
        handleResetToToday();
      }
    },
  );
});

defineExpose({
  income,
  expenses,
  summary,
  dateLabel,
  incomesTotal,
  expensesTotal,
  realBalance,
  loadData,
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

.total-amount {
  font-weight: 700;
}
</style>
