<template>
  <PeriodLayout
    :title="periodLabels[period]"
    :date-label="dateLabel"
    :on-prev="handlePrevPeriod"
    :on-next="handleNextPeriod"
    :on-date-click="onMainDateClick"
  >
    <template #analysis>
      <ion-grid>
        <ion-row>
          <ion-col class="ion-padding">
            <div ref="pdfReport">
              <ion-card-title>
                Resumen del {{ periodLabels[period] }} {{ dateLabel }}
              </ion-card-title>

              <EntriesList
                title="Ingresos"
                :items="incomesList"
                :total="incomesTotal"
                footer-label="Total ingresos"
                @edit="openEditEntryModal"
                @open-chart="showIncomesModal = true"
              />

              <EntriesList
                title="Gastos"
                :items="expensesList"
                :total="expensesTotal"
                footer-label="Total gastos"
                @edit="openEditEntryModal"
                @open-chart="showExpensesModal = true"
              />

              <div class="ion-padding">
                <ion-item :class="realBalanceClass" lines="full">
                  <ion-label>
                    <div>Balance</div>
                  </ion-label>
                  <ion-label slot="end" class="total-amount">
                    {{ formatCurrency(realBalance) }}
                  </ion-label>
                </ion-item>
              </div>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </template>
  </PeriodLayout>

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
          @click="handleResetToToday()"
        >
          Hoy
        </ion-button>
      </ion-item>
    </ion-content>
  </ion-popover>

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

  <ion-loading :is-open="isGeneratingPdf" message="Generando PDF..." />

  <EditEntryModal
    :is-open="editEntryModalOpen"
    :entry-data="editEntryModalData"
    :accounts-list="accountsList"
    :is-day-closed="isDayClosed"
    :providers-today-with-data="[]"
    @dismiss="editEntryModalOpen = false"
    @save="saveEntryChanges"
    @delete="deleteEntry"
    @reassign-date="reassignEntryFromModal"
    @reassigned="onEntryReassigned"
  />

  <ion-alert
    :is-open="showDeleteAlert"
    header="Confirmar eliminación"
    message="¿Estás seguro de que deseas eliminar esta entrada?"
    :buttons="[
      {
        text: 'Cancelar',
        role: 'cancel',
        handler: () => {
          showDeleteAlert = false;
        },
      },
      { text: 'Eliminar', role: 'confirm', handler: confirmDelete },
    ]"
    @did-dismiss="showDeleteAlert = false"
  ></ion-alert>
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
  IonModal,
  IonAlert,
  IonGrid,
  IonCardTitle,
} from '@ionic/vue';
import PeriodLayout from '../components/PeriodLayout.vue';
import EntriesList from './EntriesList.vue';
import EditEntryModal from '@/views/budget/components/EditEntryModal.vue';
import IncomesChartModal from './IncomesChartModal.vue';
import ExpensesChartModal from './ExpensesChartModal.vue';
import accountsController from '@/controllers/accountsController';
import { computed, reactive, onMounted, ref, watch, toRef } from 'vue';
import { format, addDays } from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import budgetController from '@/controllers/budgetController';
import { reassignEntry } from '@/composables/useReassignEntry';
import systemController from '@/controllers/systemConfigController';
import {
  StatisticsController,
  type Snapshots,
} from '@/controllers/statisticsController';
import { usePeriodRange, type PeriodType } from '@/composables/usePeriodRange';
import type { Income, EntryType } from '@/stores/budgetStore';

// EntryGroup type (matches budgetStore definition)
type EntryGroup = { amount: number; accountId: string | number | null };

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

const showIncomesModal = ref(false);
const showExpensesModal = ref(false);
const isGeneratingPdf = ref(false);

const editEntryModalOpen = ref(false);
const editEntryModalData = ref<{
  id: string | number | null;
  entryType: EntryType;
  name: string;
  date?: string | null;
  amount?: number;
  groups?: EntryGroup[];
}>({
  id: null,
  entryType: 'ingreso',
  name: '',
  date: null,
});
const editEntryDate = ref<string | null>(null);
const showDeleteAlert = ref(false);
const entryItems = ref<Array<{ amount: number; accountId: string | number | null }>>([
  { amount: 0, accountId: null },
]);

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
    .filter(entry => entry.entryType !== 'ingreso')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
});

const incomesTotal = computed(() => {
  return periodEntries.value
    .filter(entry => entry.entryType === 'ingreso')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
});

const realBalance = computed(() => incomesTotal.value - expensesTotal.value);

const realBalanceClass = computed(() =>
  Number(realBalance.value) < 0 ? 'negative-profit' : 'positive-profit'
);

const incomesList = computed(() => {
  return periodEntries.value
    .filter(entry => entry.entryType === 'ingreso')
    .map(entry => ({
      ...entry,
      name: entry.name,
      amount: Number(entry.amount || 0),
    }));
});

const expensesList = computed(() => {
  return periodEntries.value
    .filter(entry => entry.entryType !== 'ingreso')
    .map(entry => ({
      ...entry,
      name: entry.name,
      amount: Number(entry.amount || 0),
    }));
});

const isDayClosed = computed(() => false);

const accountsList = computed<Array<{ id: string | number; name: string }>>(() => {
  const list = accountsController.getAccounts();
  if (!list || !Array.isArray(list)) return [];
  return list
    .filter(acc => acc?.id != null && acc?.name != null)
    .map(acc => ({ id: acc.id as string | number, name: acc.name as string }));
});

function getDefaultAccountId(): string | number | null {
  const accounts = accountsList.value;
  return accounts.length > 0 ? accounts[0].id : null;
}

function openEditEntryModal(item: Income) {
  // Resolve date: prefer item's date, else fall back to referenceDate
  const resolvedDate =
    item.date ||
    periodEntries.value.find(e => String(e.id) === String(item.id))?.date ||
    format(referenceDate.value, 'yyyy-MM-dd');

  editEntryModalData.value = {
    id: item.id,
    entryType: item.entryType || 'ingreso',
    name: item.name || '',
    amount: item.amount,
    groups: item.groups,
    date: resolvedDate,
  };

  if (item.groups && Array.isArray(item.groups) && item.groups.length > 0) {
    entryItems.value = item.groups.map((g: EntryGroup) => ({
      amount: Number(g.amount) || 0,
      accountId: g.accountId ?? getDefaultAccountId(),
    }));
  } else {
    entryItems.value = [
      {
        amount: Number(item.amount) || 0,
        accountId: item.accountId || getDefaultAccountId(),
      },
    ];
  }
  
  editEntryModalOpen.value = true;
  editEntryDate.value = editEntryModalData.value.date
    ? String(editEntryModalData.value.date).slice(0, 10)
    : format(new Date(), 'yyyy-MM-dd');
}

function saveEntryChanges(data: {
  entryType: EntryType;
  name: string;
  amount: number;
  accountId: string | number | null;
  groups: Array<EntryGroup>;
}) {
  const { entryType, name, amount, accountId, groups } = data;

  if (editEntryModalData.value.id) {
    budgetController.updateIngreso({
      id: editEntryModalData.value.id,
      changes: { entryType, name, amount, accountId, groups },
    });
  }
  budgetController.saveData();
  editEntryModalOpen.value = false;
  editEntryModalData.value = { id: null, entryType: 'ingreso', name: '', date: null };
  editEntryDate.value = null;
  entryItems.value = [{ amount: 0, accountId: null }];
  void loadData();
}

function deleteEntry() {
  if (editEntryModalData.value.id) {
    showDeleteAlert.value = true;
  }
}

function confirmDelete() {
  if (editEntryModalData.value.id) {
    budgetController.removeIngreso({ id: editEntryModalData.value.id });
  }
  budgetController.saveData();
  showDeleteAlert.value = false;
  editEntryModalOpen.value = false;
  editEntryModalData.value = { id: null, entryType: 'ingreso', name: '', date: null };
  entryItems.value = [{ amount: 0, accountId: getDefaultAccountId() }];
  editEntryDate.value = null;
  void loadData();
}

async function reassignEntryFromModal(newDate: string | null) {
  if (!newDate || !editEntryModalData.value.id) return;
  try {
    await reassignEntry({
      entryId: editEntryModalData.value.id,
      newDate: String(newDate).slice(0, 10),
      originalDate: editEntryModalData.value.date || undefined,
      restoreSelectedDate: true,
      verbose: false,
    });
  } catch (err) {
    console.error('Error in reassignEntryFromModal', err);
  }

  editEntryModalOpen.value = false;
  editEntryModalData.value = { id: null, entryType: 'ingreso', name: '', date: null };
  editEntryDate.value = null;
  await loadData();
}

function onEntryReassigned() {
  editEntryModalOpen.value = false;
  void loadData();
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
      await budgetController.loadDataForDate({ date: dateStr });

      const entries = budgetController.getEntries();

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
      await budgetController.loadDataForDate({ date: dateStr });

      const entries = budgetController.getEntries();
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
    }
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
