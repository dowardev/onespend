<template>
  <PeriodLayout
    :title="periodLabels[period]"
    :date-label="dateLabel"
    :on-prev="prevPeriod"
    :on-next="nextPeriod"
    :on-date-click="onMainDateClick"
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
                  <ion-button @click="showIncomesModal = true">
                    <ion-icon :icon="pieChartOutline" />
                  </ion-button>
                </ion-list-header>

                <div class="list-content">
                  <ion-item
                    v-for="(item, index) in incomesList"
                    :key="index"
                    lines="full"
                    button
                    @click="openEditEntryModal(item)"
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
                  <ion-button @click="showExpensesModal = true">
                    <ion-icon :icon="pieChartOutline" />
                  </ion-button>
                </ion-list-header>

                <div class="list-content">
                  <ion-item
                    v-for="(item, index) in expensesList"
                    :key="index"
                    lines="full"
                    button
                    @click="openEditEntryModal(item)"
                  >
                    <ion-label>{{ item.name }}</ion-label>
                    <ion-label slot="end">{{
                      formatCurrency(item.amount)
                    }}</ion-label>
                  </ion-item>

                  <ion-item lines="full">
                    <ion-label>Total gastos</ion-label>
                    <ion-label slot="end"
                      ><span style="font-weight: bold">{{
                        formatCurrency(expensesTotal)
                      }}</span></ion-label
                    >
                  </ion-item>
                </div>
              </ion-list>

              <div class="ion-padding">
                <ion-item :class="realBalanceClass" lines="full">
                  <ion-label>
                    <div>Balance</div>
                  </ion-label>
                  <ion-label slot="end"
                    ><span style="font-weight: bold">{{
                      formatCurrency(realBalance)
                    }}</span></ion-label
                  >
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
          @click="resetToToday()"
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
  IonAlert,
} from '@ionic/vue';
import PeriodLayout from '../components/PeriodLayout.vue';
import EditEntryModal from '@/views/budget/components/EditEntryModal.vue';
import IncomesChartModal from './IncomesChartModal.vue';
import ExpensesChartModal from './ExpensesChartModal.vue';
import accountsController from '@/controllers/accountsController';
import { computed, reactive, onMounted, ref, watch } from 'vue';
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
} from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import budgetController from '@/controllers/budgetController';
import { reassignEntry } from '@/composables/useReassignEntry';
import systemController from '@/controllers/systemConfigController';
import {
  StatisticsController,
  type Snapshots,
} from '@/controllers/statisticsController';
import { pieChartOutline } from 'ionicons/icons';
import type { Income, EntryType, EntryGroup } from '@/stores/budgetStore';

const statisticsController = new StatisticsController();
const popovers = statisticsController.getPopovers();
const setSnapshots = (val: Snapshots) => statisticsController.setSnapshots(val);

const weekStartDay = ref(1);

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

const props = defineProps<{
  period: 'day' | 'week' | 'month' | 'year';
}>();

const periodLabels: Record<string, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

const showIncomesModal = ref(false);
const showExpensesModal = ref(false);
const isGeneratingPdf = ref(false);
const referenceDate = ref(new Date());
const categoriesLoaded = ref(false);

const editEntryModalOpen = ref(false);
const editEntryModalData = ref({
  id: null as string | number | null,
  entryType: 'ingreso' as 'ingreso' | 'egreso',
  name: '',
  date: null as string | null,
});
const editEntryDate = ref<string | null>(null);
const showDeleteAlert = ref(false);
const entryItems = ref<
  Array<{ amount: number; accountId: string | number | null }>
>([{ amount: 0, accountId: null }]);

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

const periodEntries = ref<any[]>([]);
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

const accountsList = computed(() => {
  const list = accountsController.getAccounts();
  if (!list || !Array.isArray(list)) return [];
  return list.filter((acc: any) => acc != null && acc.id != null);
});

function getDefaultAccountId() {
  const accounts = accountsList.value;
  return accounts.length > 0 ? accounts[0].id : null;
}

function openEditEntryModal(item: Income) {
  // Debug: log item when opening modal
  try {
    console.log(
      'openEditEntryModal - item:',
      item,
      'type of date:',
      typeof item.date,
      'raw date:',
      item.date
    );
  } catch (e) {}

  // Resolve date: prefer item's date, else try to find in loaded periodEntries, else fall back to referenceDate
  let resolvedDate: string | null = null;
  try {
    resolvedDate =
      (item && (item as any).date) ||
      (
        periodEntries.value.find(
          e => String((e as any).id) === String((item as any).id)
        ) as any
      )?.date ||
      format(referenceDate.value, 'yyyy-MM-dd');
  } catch (e) {
    resolvedDate = format(referenceDate.value, 'yyyy-MM-dd');
  }

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
  // initialize reassignment date when opening the modal for an existing entry
  try {
    editEntryDate.value = editEntryModalData.value.date
      ? String(editEntryModalData.value.date).slice(0, 10)
      : format(new Date(), 'yyyy-MM-dd');

    console.log(
      'openEditEntryModal - init editEntryDate:',
      editEntryDate.value,
      'resolvedDate:',
      editEntryModalData.value.date
    );
  } catch (e) {
    editEntryDate.value = format(new Date(), 'yyyy-MM-dd');

    console.log(
      'openEditEntryModal - init editEntryDate (catch):',
      editEntryDate.value
    );
  }
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
      changes: {
        entryType,
        name,
        amount,
        accountId,
        groups,
      },
    });
  }
  budgetController.saveData();
  editEntryModalOpen.value = false;
  editEntryModalData.value = {
    id: null,
    entryType: 'ingreso',
    name: '',
  };
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
  editEntryModalData.value = {
    id: null,
    entryType: 'ingreso',
    name: '',
  };
  entryItems.value = [{ amount: 0, accountId: getDefaultAccountId() }];
  editEntryDate.value = null;
  void loadData();
}

// Handler for reassign-date emitted by EditEntryModal (delegates to composable)
async function reassignEntryFromModal(newDate: string | null) {
  if (!newDate || !editEntryModalData.value.id) return;
  try {
    const res = await reassignEntry({
      entryId: editEntryModalData.value.id,
      newDate: String(newDate).slice(0, 10),
      originalDate: editEntryModalData.value.date || undefined,
      restoreSelectedDate: true,
      verbose: true,
    });
    try {
      console.log('PerformanceComponent.reassignEntryFromModal - result', res);
    } catch (e) {}
  } catch (err) {
    console.error('Error in reassignEntryFromModal', err);
  }

  editEntryModalOpen.value = false;
  editEntryModalData.value = {
    id: null,
    entryType: 'ingreso',
    name: '',
    date: null,
  };
  editEntryDate.value = null;
  await loadData();
}

function onEntryReassigned() {
  try {
    console.log(
      'PerformanceComponent.onEntryReassigned - reloading data after reassignment'
    );
  } catch (e) {}
  editEntryModalOpen.value = false;
  void loadData();
}

const dateLabel = computed(() => {
  const baseDate = getBaseDate();
  switch (props.period) {
    case 'day':
      return format(baseDate, 'dd MMM yyyy');
    case 'week':
      return `${format(startOfWeekWithConfig(baseDate), 'dd')} - ${format(endOfWeekWithConfig(baseDate), 'dd MMM yyyy')}`;
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

function startOfWeekWithConfig(date: Date): Date {
  const currentDay = date.getDay();
  const weekStart = weekStartDay.value;
  let diff = currentDay - weekStart;
  if (diff < 0) {
    diff += 7;
  }
  const result = new Date(date);
  result.setDate(date.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeekWithConfig(date: Date): Date {
  const start = startOfWeekWithConfig(date);
  const result = new Date(start);
  result.setDate(start.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function getBaseDate(): Date {
  const refDate = new Date(referenceDate.value);
  switch (props.period) {
    case 'day':
      return refDate;
    case 'week':
      return startOfWeekWithConfig(refDate);
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
      start = startOfWeekWithConfig(baseDate);
      end = endOfWeekWithConfig(baseDate);
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
      const prevWeekStart = addWeeks(startOfWeekWithConfig(baseDate), -1);
      start = prevWeekStart;
      end = endOfWeekWithConfig(prevWeekStart);
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
      referenceDate.value = addWeeks(refDate, -1);
      break;
    case 'month':
      referenceDate.value = addMonths(refDate, -1);
      break;
    case 'year':
      referenceDate.value = addYears(refDate, -1);
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
      referenceDate.value = addWeeks(refDate, 1);
      break;
    case 'month':
      referenceDate.value = addMonths(refDate, 1);
      break;
    case 'year':
      referenceDate.value = addYears(refDate, 1);
      break;
  }
  void loadData();
}

function onPopoverDateChange(e: CustomEvent) {
  try {
    const val =
      e?.detail?.value || format(new Date(referenceDate.value), 'yyyy-MM-dd');
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

// setModalFromLayout removed: modal control handled locally in PeriodLayout (not used here)

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
        resetToToday();
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
</style>
