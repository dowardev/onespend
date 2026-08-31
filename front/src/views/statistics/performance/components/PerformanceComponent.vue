<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <!-- Skeleton loading -->
  <template v-if="isLoading">
    <ion-list>
      <ion-item lines="none" class="ion-padding-horizontal">
        <ion-skeleton-text animated style="width: 30px; margin-right: auto"></ion-skeleton-text>
        <ion-skeleton-text animated style="width: 80px"></ion-skeleton-text>
        <ion-skeleton-text animated style="width: 30px; margin-left: auto"></ion-skeleton-text>
      </ion-item>
    </ion-list>
    <ion-list class="ion-padding-horizontal">
      <ion-item-divider class="transparent">
        <ion-skeleton-text animated style="width: 30%"></ion-skeleton-text>
        <ion-skeleton-text slot="end" animated style="width: 20%"></ion-skeleton-text>
      </ion-item-divider>
      <ion-item lines="full" class="ion-no-padding">
        <ion-skeleton-text animated style="width: 80%"></ion-skeleton-text>
        <ion-skeleton-text slot="end" animated style="width: 15%"></ion-skeleton-text>
      </ion-item>
      <ion-item lines="full" class="ion-no-padding">
        <ion-skeleton-text animated style="width: 60%"></ion-skeleton-text>
        <ion-skeleton-text slot="end" animated style="width: 20%"></ion-skeleton-text>
      </ion-item>
      <ion-item lines="full" class="ion-no-padding">
        <ion-skeleton-text animated style="width: 70%"></ion-skeleton-text>
        <ion-skeleton-text slot="end" animated style="width: 15%"></ion-skeleton-text>
      </ion-item>
      <ion-card class="shadow1">
        <ion-card-content class="ion-padding">
          <ion-item lines="none" class="ion-no-padding">
            <ion-skeleton-text animated style="width: 40%"></ion-skeleton-text>
          </ion-item>
          <ion-row
            class="ion-justify-content-between ion-padding-top ion-padding-start ion-padding-end"
          >
            <ion-skeleton-text animated style="width: 30%"></ion-skeleton-text>
            <ion-skeleton-text animated style="width: 25%"></ion-skeleton-text>
          </ion-row>
        </ion-card-content>
      </ion-card>
    </ion-list>
    <ion-list class="ion-padding-horizontal">
      <ion-item-divider class="transparent">
        <ion-skeleton-text animated style="width: 35%"></ion-skeleton-text>
        <ion-skeleton-text slot="end" animated style="width: 20%"></ion-skeleton-text>
      </ion-item-divider>
      <ion-item lines="full" class="ion-no-padding">
        <ion-skeleton-text animated style="width: 50%"></ion-skeleton-text>
        <ion-skeleton-text slot="end" animated style="width: 20%"></ion-skeleton-text>
      </ion-item>
      <ion-card class="shadow1">
        <ion-card-content class="ion-padding">
          <ion-item lines="none" class="ion-no-padding">
            <ion-skeleton-text animated style="width: 35%"></ion-skeleton-text>
          </ion-item>
          <ion-row
            class="ion-justify-content-between ion-padding-top ion-padding-start ion-padding-end"
          >
            <ion-skeleton-text animated style="width: 30%"></ion-skeleton-text>
            <ion-skeleton-text animated style="width: 25%"></ion-skeleton-text>
          </ion-row>
        </ion-card-content>
      </ion-card>
    </ion-list>
  </template>

  <!-- Period navigation -->
  <ion-list v-if="!isLoading" class="ion-padding-horizontal">
    <ion-item lines="none" class="ion-no-padding">
      <ion-button slot="start" fill="clear" aria-label="Período anterior" @click="handlePrevPeriod">
        <ion-icon :icon="chevronBackOutline" />
      </ion-button>
      <ion-button
        fill="clear"
        aria-label="Seleccionar fecha"
        style="font-weight: 600; font-size: 0.95rem"
        @click="onMainDateClick($event)"
      >
        {{ dateLabel }}
      </ion-button>
      <ion-button slot="end" fill="clear" aria-label="Período siguiente" @click="handleNextPeriod">
        <ion-icon :icon="chevronForwardOutline" />
      </ion-button>
    </ion-item>
  </ion-list>

  <!-- Income Statement -->
  <ion-grid v-if="!isLoading" class="ion-no-padding">
    <template v-for="(section, idx) in sections" :key="section.title">
      <ion-row>
        <ion-col size="12">
          <ion-item-divider v-if="idx > 0" class="transparent" />

          <ion-list class="transparent section-list">
            <ion-list-header class="section-header">
              <ion-label class="section-title">
                <FinancialInfoPopover :term="section.title" inline>
                  <template #trigger>
                    <strong style="cursor: pointer">{{ section.title }}</strong>
                  </template>
                </FinancialInfoPopover>
              </ion-label>
              <ion-label slot="end" class="section-total-label">
                <strong>{{ fmt(section.total) }}</strong>
              </ion-label>
            </ion-list-header>

            <template v-if="section.items.length > 0">
              <IncomeStatementRow v-for="item in section.items" :key="item.name" :item="item" />
              <ion-item lines="full" class="section-separator">
                <ion-label class="separator-label">Total {{ section.title }}</ion-label>
                <ion-label slot="end" class="separator-amount">{{ fmt(section.total) }}</ion-label>
              </ion-item>
            </template>
            <ion-item v-else lines="full" class="empty-section">
              <ion-icon slot="start" :icon="fileTrayOutline" color="medium" />
              <ion-label color="medium">
                <p>Sin {{ section.title.toLowerCase() }} en este periodo</p>
              </ion-label>
              <ion-button
                slot="end"
                fill="clear"
                size="small"
                color="primary"
                @click="handleEmptyAction(section)"
              >
                Agregar
              </ion-button>
              <FinancialInfoPopover :term="section.title">
                <template #trigger>
                  <ion-button
                    slot="end"
                    fill="clear"
                    size="small"
                    color="medium"
                    :aria-label="'Información sobre ' + section.title"
                  >
                    <ion-icon :icon="helpCircleOutline" />
                  </ion-button>
                </template>
              </FinancialInfoPopover>
            </ion-item>
          </ion-list>

          <template v-if="cards[idx]">
            <ion-item-divider class="transparent" />
            <ion-card class="shadow1">
              <ion-card-content
                class="ion-padding-start ion-padding-end ion-padding-top ion-padding-bottom"
              >
                <ion-item lines="none" class="transparent ion-no-padding summary-label-item">
                  <ion-label class="summary-label">
                    <FinancialInfoPopover :term="cards[idx].label" inline>
                      <template #trigger>
                        <strong style="cursor: pointer">{{ cards[idx].label }}</strong>
                      </template>
                    </FinancialInfoPopover>
                  </ion-label>
                </ion-item>
                <ion-row
                  class="ion-justify-content-between ion-align-items-center ion-padding-start ion-padding-end"
                >
                  <ion-col size="auto">
                    <ion-label
                      class="summary-percent"
                      :color="cards[idx].amount >= 0 ? 'success' : 'danger'"
                      :aria-label="`${cards[idx].amount >= 0 ? 'Positivo' : 'Negativo'}: ${cards[idx].percent}%`"
                    >
                      {{ cards[idx].percent }}%
                    </ion-label>
                  </ion-col>
                  <ion-col size="auto">
                    <ion-label
                      class="summary-amount"
                      :color="cards[idx].amount >= 0 ? 'success' : 'danger'"
                      :aria-label="`${cards[idx].amount >= 0 ? 'Positivo' : 'Negativo'}: ${fmt(cards[idx].amount)}`"
                    >
                      {{ fmt(cards[idx].amount) }}
                    </ion-label>
                  </ion-col>
                </ion-row>
                <ion-item
                  v-if="cards[idx].diff !== null"
                  lines="none"
                  class="transparent ion-no-padding"
                >
                  <ion-label class="comparison-label">vs periodo anterior</ion-label>
                  <ion-label
                    slot="end"
                    class="comparison-value"
                    :color="(cards[idx].diff ?? 0) >= 0 ? 'success' : 'danger'"
                    :aria-label="`${(cards[idx].diff ?? 0) >= 0 ? 'Incremento' : 'Disminución'} de ${fmt(cards[idx].diff ?? 0)}`"
                  >
                    <ion-icon
                      :icon="(cards[idx].diff ?? 0) >= 0 ? trendingUpOutline : trendingDownOutline"
                      size="small"
                    />
                    {{ fmt(cards[idx].diff ?? 0) }}
                  </ion-label>
                </ion-item>
              </ion-card-content>
            </ion-card>
          </template>
        </ion-col>
      </ion-row>
    </template>
  </ion-grid>

  <!-- Period Comparison -->
  <ion-list v-if="!isLoading && comparison && comparisonRows.length > 0" class="comparison-section">
    <ion-list-header>
      <ion-label>Comparativa vs periodo anterior</ion-label>
    </ion-list-header>

    <ion-item v-for="row in comparisonRows" :key="row.key" lines="full">
      <ion-label class="cmp-name">
        <FinancialInfoPopover :term="row.label" inline>
          <template #trigger>
            <strong style="cursor: pointer">{{ row.label }}</strong>
          </template>
        </FinancialInfoPopover>
      </ion-label>

      <ion-note slot="end" class="cmp-old">{{ fmt(row.previous) }}</ion-note>

      <ion-label slot="end" class="cmp-current">{{ fmt(row.current) }}</ion-label>

      <ion-label
        slot="end"
        class="cmp-diff"
        :color="row.diff >= 0 ? 'success' : 'danger'"
        :aria-label="`${row.diff >= 0 ? 'Incremento' : 'Disminución'}: ${row.diffPercent}%`"
      >
        <ion-icon :icon="row.diff >= 0 ? trendingUpOutline : trendingDownOutline" size="small" />
        {{ row.diff >= 0 ? '+' : '' }}{{ row.diffPercent }}%
      </ion-label>
    </ion-item>
  </ion-list>

  <!-- Date popover -->
  <ion-popover
    :is-open="datePopover.open"
    :event="datePopover.event"
    keep-contents-mounted
    @did-dismiss="closeDatePopover()"
  >
    <ion-content>
      <ion-datetime
        :value="format(referenceDate, 'yyyy-MM-dd')"
        style="background: transparent"
        presentation="date"
        @ion-change="onPopoverDateChange"
      />
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

</template>

<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonDatetime,
  IonGrid,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPopover,
  IonRow,
  IonSkeletonText,
} from '@ionic/vue';
import {
  chevronBackOutline,
  chevronForwardOutline,
  trendingUpOutline,
  trendingDownOutline,
  fileTrayOutline,
  helpCircleOutline,
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { computed, onMounted, watch, toRef } from 'vue';
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import { usePeriodRange, type PeriodType } from '@/composables/usePeriodRange';
import { usePeriodConfig } from '@/composables/usePeriodConfig';
import { useDatePopover } from '@/composables/useDatePopover';
import { useBudgetEntries } from '@/composables/useBudgetEntries';
import { useIncomeStatement, type StatementSection } from '@/composables/useIncomeStatement';
import IncomeStatementRow from './IncomeStatementRow.vue';
import FinancialInfoPopover from './FinancialInfoPopover.vue';

const props = defineProps<{
  period: PeriodType;
}>();

const periodRef = toRef(props, 'period');

const router = useRouter();
const { weekStartDay, load: loadConfig } = usePeriodConfig();
const {
  referenceDate,
  dateLabel,
  getBudgetDateRange,
  getPreviousPeriodDateRange,
  prevPeriod,
  nextPeriod,
  resetToToday,
} = usePeriodRange(periodRef, { weekStartDay });

const { currentEntries, previousEntries, isLoading, fetchPeriod } = useBudgetEntries();
const { statement, comparison } = useIncomeStatement({
  entries: currentEntries,
  previousEntries,
});

const { popover: datePopover, open: openDatePopover, close: closeDatePopover } = useDatePopover();

const sections = computed(() => [
  statement.value.incomes,
  statement.value.costOfLife,
  statement.value.discretionaryExpenses,
  statement.value.financialExpenses,
]);

interface CardData {
  label: string;
  amount: number;
  percent: number;
  diff: number | null;
}

const cards = computed<Record<number, CardData>>(() => {
  const s = statement.value;
  const c = comparison.value;
  return {
    1: {
      label: 'Utilidad Bruta',
      amount: s.grossProfit,
      percent: s.grossProfitPercent,
      diff: c ? s.grossProfit - c.grossProfit : null,
    },
    2: {
      label: 'Ahorro Operativo',
      amount: s.operatingSavings,
      percent: s.operatingSavingsPercent,
      diff: c ? s.operatingSavings - c.operatingSavings : null,
    },
    3: {
      label: 'Resultado Neto',
      amount: s.netResult,
      percent: s.netResultPercent,
      diff: c ? s.netResult - c.netResult : null,
    },
  };
});

interface ComparisonRow {
  key: string;
  label: string;
  current: number;
  previous: number;
  diff: number;
  diffPercent: number;
}

function computePercentDiff(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

const comparisonRows = computed<ComparisonRow[]>(() => {
  if (!comparison.value) return [];
  const s = statement.value;
  const p = comparison.value;
  return [
    {
      key: 'incomes',
      label: 'Ingresos',
      current: s.incomes.total,
      previous: p.incomesTotal,
      diff: s.incomes.total - p.incomesTotal,
      diffPercent: computePercentDiff(s.incomes.total, p.incomesTotal),
    },
    {
      key: 'costOfLife',
      label: 'Costo de Vida',
      current: s.costOfLife.total,
      previous: p.costOfLifeTotal,
      diff: s.costOfLife.total - p.costOfLifeTotal,
      diffPercent: computePercentDiff(s.costOfLife.total, p.costOfLifeTotal),
    },
    {
      key: 'grossProfit',
      label: 'Utilidad Bruta',
      current: s.grossProfit,
      previous: p.grossProfit,
      diff: s.grossProfit - p.grossProfit,
      diffPercent: computePercentDiff(s.grossProfit, p.grossProfit),
    },
    {
      key: 'netResult',
      label: 'Resultado Neto',
      current: s.netResult,
      previous: p.netResult,
      diff: s.netResult - p.netResult,
      diffPercent: computePercentDiff(s.netResult, p.netResult),
    },
  ];
});

function fmt(val: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

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
  closeDatePopover();
  void loadData();
}

function handleEmptyAction(section: StatementSection) {
  // Navigate to the budget entry form to add a new income/expense for this section.
  void router.push('/budget/entry/new');
}

async function loadData() {
  const { start, end } = getBudgetDateRange();
  const { start: prevStart, end: prevEnd } = getPreviousPeriodDateRange();
  await fetchPeriod({ start, end, previousStart: prevStart, previousEnd: prevEnd });
}

async function refresh() {
  await loadConfig();
  await loadData();
}

function onMainDateClick(e: Event | null) {
  openDatePopover(e);
}

function onPopoverDateChange(e: CustomEvent) {
  const val = e?.detail?.value || format(referenceDate.value, 'yyyy-MM-dd');
  const parsed = parseLocalDate({ d: String(val).slice(0, 10) });
  referenceDate.value = parsed;
  closeDatePopover();
  void loadData();
}

onMounted(() => {
  void loadConfig();
  void loadData();
  watch(
    () => props.period,
    (np, op) => {
      if (op !== np) handleResetToToday();
    },
  );
});

defineExpose({ statement, dateLabel, loadData, refresh });
</script>

<style scoped>
/* Sections */
.section-list {
  margin-bottom: 0;
}
.section-header {
  --background: transparent;
  padding-top: 8px;
  padding-inline-start: 8px;
  padding-inline-end: 8px;
}
.section-title {
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  font-size: clamp(0.85rem, 2.5vw, 1rem);
}
.section-total-label {
  font-size: clamp(0.85rem, 2.5vw, 0.95rem);
  flex-shrink: 0;
}
.section-separator {
  --background: transparent;
  --border-style: dashed;
  --border-color: var(--ion-color-step-300, #ccc);
  font-weight: 600;
}
.separator-label {
  font-size: 0.85rem;
  color: var(--ion-color-medium, #666);
}
.separator-amount {
  font-size: 0.9rem;
  font-weight: 700;
}
.empty-section {
  --background: transparent;
  --min-height: 44px;
}
.empty-section ion-label {
  flex: 1;
}
.empty-section ion-label p {
  margin: 0;
  white-space: normal;
}

/* Summary cards */
.summary-label-item {
  --min-height: 24px;
  margin-bottom: 4px;
}
.summary-label {
  font-weight: 700;
  font-size: clamp(0.8rem, 2.5vw, 0.95rem);
}
.summary-percent {
  font-weight: 600;
  font-size: clamp(0.75rem, 2vw, 0.85rem);
  text-align: right;
}
.summary-amount {
  font-weight: 700;
  font-size: clamp(0.85rem, 2.5vw, 1rem);
  text-align: right;
}
@media (min-width: 768px) {
  .summary-amount {
    min-width: 90px;
  }
}
.comparison-label {
  font-size: 0.75rem;
  color: var(--ion-color-medium, #666);
  flex: 1 1 auto;
}
.comparison-value {
  font-size: 0.85rem;
  font-weight: 600;
}
.comparison-section {
  margin-top: 8px;
}
.cmp-name {
  font-size: 0.85rem;
  flex: 1;
}
.cmp-old {
  font-size: 0.75rem;
  text-align: right;
  margin-right: 8px;
}
@media (min-width: 768px) {
  .cmp-old {
    min-width: 90px;
  }
}
.cmp-current {
  font-size: 0.85rem;
  font-weight: 600;
  text-align: right;
}
@media (min-width: 768px) {
  .cmp-current {
    min-width: 100px;
  }
}
.cmp-diff {
  font-size: 0.8rem;
  font-weight: 700;
  text-align: right;
}
@media (min-width: 768px) {
  .cmp-diff {
    min-width: 55px;
  }
}
</style>
