<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-grid>
    <ion-row>
      <!-- Summary column (mobile: first, desktop: second) -->
      <ion-col size="12" size-lg="6" class="summary-col">
        <!-- Date navigation -->
        <ion-item lines="none" class="transparent">
          <ion-buttons slot="end">
            <ion-button title="Retroceder" @click="goBack">
              <ion-icon :icon="chevronBackOutline"></ion-icon>
            </ion-button>

            <ion-button
              title="Seleccionar fecha"
              @click="openDatePicker({ event: $event })"
            >
              {{ formattedSelectedDate }}
            </ion-button>

            <ion-button title="Avanzar" @click="goForward">
              <ion-icon :icon="chevronForwardOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-item>

        <!-- Accounts (mobile: accordion with summary inside; desktop: list + summary card) -->
        <div class="accounts-block">
          <AccountCards
            :accounts="accountsWithBalance"
            :accordion="isMobile"
            :summary="{
              label: totalDifferenceLabel,
              color: totalDifferenceColor,
              ingresos: totalIngresos,
              egresos: totalEgresos,
            }"
          />
        </div>
      </ion-col>

      <!-- Registro column (mobile: last, desktop: first) -->
      <ion-col size="12" size-lg="6" class="registro-col">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Registro</ion-label>

            <ion-button id="add-btn">
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>
          </ion-list-header>

          <div class="list-content" style="flex: 1 1 auto; min-height: 0">
            <div
              class="color-legend"
              style="border-bottom: 1px solid var(--ion-background-color-step-200)"
            >
              <span class="legend-item">
                <span class="legend-color success"></span>
                Ingreso
              </span>

              <span class="legend-item">
                <span class="legend-color danger"></span>
                Egreso
              </span>
            </div>

            <div class="scroll-content">
              <template v-if="unifiedItems.length > 0">
                <template v-for="(block, bIdx) in renderedEntries" :key="blockKey(block, bIdx)">
                  <ion-item
                    v-if="block.type === 'unified'"
                    :lines="bIdx === renderedEntries.length - 1 ? 'none' : 'full'"
                    class="transparent"
                    button
                    data-cy="budget-entry-row"
                    @click="handleUnifiedItemClick(block.item)"
                  >
                    <ion-label>
                      {{ block.item.name }}
                      <p>{{ formatTimeLocal(block.item.createdAt) }}</p>
                    </ion-label>

                    <ion-label
                      slot="end"
                      class="ion-text-end"
                      :style="`color: ${getItemColor(block.item)}`"
                    >
                      {{ formatCurrency({ value: block.item.amount || 0 }) }}

                      <p v-if="block.item.type === 'entry'">
                        {{ getUnifiedEntryInfo(block.item).name }}:
                        {{ formatCurrency({ value: getUnifiedAccountRemaining(block.item) }) }}
                      </p>
                      <p v-else>Egreso</p>
                    </ion-label>
                  </ion-item>
                </template>
              </template>

              <template v-else>
                <div class="ion-padding">
                  <ion-label>Pulsa el botón "+" para agregar un nuevo ingreso</ion-label>
                </div>
              </template>
            </div>
          </div>
        </ion-list>
      </ion-col>
    </ion-row>
  </ion-grid>

  <!-- Popover para Add -->
  <ion-popover
    trigger="add-btn"
    trigger-action="click"
    side="bottom"
    alignment="end"
    dismiss-on-select
  >
    <ion-content>
      <ion-list lines="none">
        <ion-item button @click="handleRegistroClick">
          <ion-icon slot="start" :icon="documentTextOutline"></ion-icon>
          <ion-label>Registro</ion-label>
        </ion-item>
        <ion-item button @click="handleProveedoresClick">
          <ion-icon slot="start" :icon="peopleOutline"></ion-icon>
          <ion-label>Proveedores</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-popover>
</template>

<script setup lang="ts">
// Imports
import {
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonListHeader,
  IonLabel,
  IonButton,
  IonIcon,
  IonItem,
  IonPopover,
  IonContent,
} from '@ionic/vue';
import {
  addOutline,
  chevronBackOutline,
  chevronForwardOutline,
  documentTextOutline,
  peopleOutline,
} from 'ionicons/icons';
import { computed } from 'vue';
import { format } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { useRouter } from 'vue-router';
import AccountCards from '../components/AccountCards.vue';
import { useMediaQuery } from '@/composables/useMediaQuery';
import { parseLocalDate, formatLocalDate } from '@/utils/date';
import budgetEntriesController from '@/controllers/budgetEntriesController';
import budgetProvidersController from '@/controllers/budgetProvidersController';
import accountsController from '@/controllers/accountsController';
import type { Account } from '@/stores/accountsStore';
import type { Income } from '@/stores/budgetEntriesStore';
import type { Provider } from '@/stores/budgetProvidersStore';
import { useBudgetDay } from '@/composables/useBudgetDay';
import type { AccountWithBalance, EntryGroup } from '@/utils/budgetTypes';
import { formatCurrency, calcProviderProductsTotal } from '@/utils/currency';

interface UnifiedItem {
  id: string | number;
  name: string;
  amount: number;
  date: string;
  type: 'entry' | 'provider';
  entryType?: 'ingreso' | 'egreso';
  accountId?: string | number | null;
  createdAt: number;
  _providerName?: string;
}
// End Imports

// router
const router = useRouter();
// end router

// emits
const emit = defineEmits<{
  'open-date-picker': [event: Event];
}>();
// end emits

// Components

// Vars
const isMobile = useMediaQuery('(max-width: 767px)');
// End Vars

// Computed
const budgetDayStore = useBudgetDay();

const formattedSelectedDate = computed(() => {
  try {
    const d = parseLocalDate({ d: budgetDayStore.selectedDate });
    if (isNaN(d.getTime())) return budgetDayStore.selectedDate;
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: esLocale });
  } catch {
    return budgetDayStore.selectedDate;
  }
});

const accountsList = computed(() => {
  const list = accountsController.getAccounts();
  if (!list || !Array.isArray(list)) return [];
  return list.filter((acc: Account) => acc != null && acc.id != null);
});

function buildAccountsWithBalance(accounts: Account[]): AccountWithBalance[] {
  // Single pass over the day's entries: bucket each entry's amount under every account it
  // applies to (the direct accountId, plus each distinct group accountId). Replaces the old
  // per-account `getEntries().filter(...)` scan, which was O(accounts × entries).
  const totalsByAccount = new Map<string, { ingresos: number; egresos: number }>();
  const add = (key: string, amount: number, entryType: string) => {
    const t = totalsByAccount.get(key) || { ingresos: 0, egresos: 0 };
    if (entryType === 'ingreso') t.ingresos += amount;
    else t.egresos += amount;
    totalsByAccount.set(key, t);
  };

  for (const e of budgetEntriesController.getEntries()) {
    const amount = Number(e.amount || 0);
    if (e.accountId != null) {
      add(String(e.accountId), amount, e.entryType);
    }
    if (e.groups && Array.isArray(e.groups)) {
      const seen = new Set<string>();
      for (const g of e.groups) {
        if (g.accountId == null) continue;
        const key = String(g.accountId);
        if (key === String(e.accountId)) continue; // direct account already counted above
        if (seen.has(key)) continue;
        seen.add(key);
        add(key, amount, e.entryType);
      }
    }
  }

  return accounts.map((acc: Account) => {
    const t = totalsByAccount.get(String(acc.id)) || { ingresos: 0, egresos: 0 };
    const initialBalance = Number(acc.initialBalance) || 0;
    return {
      ...acc,
      id: acc.id,
      initialBalance,
      ingresos: t.ingresos,
      egresos: t.egresos,
      balance: initialBalance + t.ingresos - t.egresos,
      hasTransactions: t.ingresos > 0 || t.egresos > 0,
    } as AccountWithBalance;
  });
}

const accountsWithBalance = computed(() => {
  const result = buildAccountsWithBalance(accountsList.value);

  const withTransactions = result
    .filter((acc: AccountWithBalance) => acc.hasTransactions)
    .sort((a: AccountWithBalance, b: AccountWithBalance) => b.balance - a.balance);

  const withoutTransactions = result
    .filter((acc: AccountWithBalance) => !acc.hasTransactions)
    .sort((a: AccountWithBalance, b: AccountWithBalance) => a.name.localeCompare(b.name));

  return [...withTransactions, ...withoutTransactions];
});

const financialTotals = computed(() => {
  // Single scan over the day's entries for both totals (one pass instead of two).
  const entries = budgetEntriesController.getEntries();
  let ingresos = 0;
  let egresos = 0;
  for (const e of entries) {
    const amount = Number(e.amount || 0);
    if (e.entryType === 'ingreso') ingresos += amount;
    else egresos += amount;
  }
  return { ingresos, egresos };
});

const totalIngresos = computed(() => financialTotals.value.ingresos);

const totalEgresos = computed(() => {
  const providersTotal = providersToday.value.reduce(
    (sum, p) => sum + calcProviderProductsTotal({ provider: p }),
    0,
  );

  return financialTotals.value.egresos + providersTotal;
});

const totalDifference = computed(() => {
  return totalIngresos.value - totalEgresos.value;
});

const totalDifferenceLabel = computed(() => {
  const d = totalDifference.value;
  if (d === 0) return '$0';
  const formatted = formatCurrency({ value: Math.abs(d) });
  return d > 0 ? `+${formatted}` : `-${formatted}`;
});

const totalDifferenceColor = computed(() => {
  const d = totalDifference.value;
  if (d === 0) return undefined;
  return d > 0 ? 'success' : 'danger';
});

const providersToday = computed(() => {
  const sel = String(budgetDayStore.selectedDate || '').slice(0, 10);
  if (!sel) return [];
  return budgetProvidersController
    .getProviders()
    .filter((p: Provider) => String(p.date || '').slice(0, 10) === sel);
});

const unifiedItems = computed((): UnifiedItem[] => {
  const entries: Income[] = budgetEntriesController.getEntries() || [];

  // Reuse the day-scoped provider filter computed above instead of re-filtering here.
  const providers: Provider[] = providersToday.value;

  const entryItems: UnifiedItem[] = entries.map((entry: Income) => ({
    id: entry.id,
    name: entry._providerName || entry.name || '-',
    amount: entry.amount || 0,
    date: entry.date,
    type: 'entry',
    entryType: entry.entryType,
    accountId: entry.accountId,
    createdAt: entry.createdAt || 0,
    _providerName: entry._providerName,
  }));

  const providerItems: UnifiedItem[] = providers.map((provider: Provider) => ({
    id: provider.id,
    name: provider._supplierName || provider.name || '-',
    amount: calcProviderProductsTotal({ provider }),
    date: provider.date,
    type: 'provider',
    accountId: provider.accountId,
    createdAt: provider.createdAt || Date.now(),
    _providerName: provider._supplierName,
  }));

  return [...entryItems, ...providerItems].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
});

const renderedEntries = computed(() => {
  return unifiedItems.value.map((item: UnifiedItem) => ({
    type: 'unified',
    item,
  }));
});

// End Computed

// Functions
function getDefaultAccountId() {
  const accounts = accountsList.value;
  return accounts.length > 0 ? accounts[0].id : null;
}

async function goBack() {
  const current = budgetDayStore.selectedDate;
  const d = parseLocalDate({ d: current });
  d.setDate(d.getDate() - 1);
  const dateStr = formatLocalDate({ d });
  budgetDayStore.setSelectedDate(dateStr);
  await budgetDayStore.loadBudgetForDate({ date: dateStr });
}

async function goForward() {
  const current = budgetDayStore.selectedDate;
  const d = parseLocalDate({ d: current });
  d.setDate(d.getDate() + 1);
  const dateStr = formatLocalDate({ d });
  budgetDayStore.setSelectedDate(dateStr);
  await budgetDayStore.loadBudgetForDate({ date: dateStr });
}

function openDatePicker(params: { event: Event }) {
  emit('open-date-picker', params.event);
}

function formatTimeLocal(ms?: number) {
  if (!ms) return '';
  return new Date(Number(ms)).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function handleRegistroClick() {
  router.push('/budget/entry/new');
}

function handleProveedoresClick() {
  router.push('/budget/provider/new');
}

function handleUnifiedItemClick(item: UnifiedItem) {
  if (item.type === 'entry') {
    router.push(`/budget/entry/edit?entryId=${item.id}`);
  } else {
    router.push(`/budget/provider/edit?providerId=${item.id}`);
  }
}

function getItemColor(item: UnifiedItem): string {
  if (item.type === 'provider') {
    return 'var(--ion-color-danger)';
  }
  return item.entryType === 'egreso' ? 'var(--ion-color-danger)' : 'var(--ion-color-success)';
}

function navigateToEditEntry(item: Income) {
  router.push(`/budget/entry/edit?entryId=${item.id}`);
}

function formatProviderAmount(provider: Provider) {
  return formatCurrency({ value: calcProviderProductsTotal({ provider }) });
}

function blockKey(block: { type: string; item: UnifiedItem }, idx: number) {
  if (!block) return `b-${idx}`;
  return `i-${String((block.item && block.item.id) || idx)}`;
}

function getAccountName(accountId: string | number | null | undefined) {
  if (!accountId) return '';
  const account = accountsList.value.find((a: Account) => String(a.id) === String(accountId));
  return account?.name || '';
}

function getEntryAccountInfo(item: Income) {
  if (item.groups && Array.isArray(item.groups) && item.groups.length > 0) {
    const accountIds = item.groups
      .map((g: EntryGroup) => g.accountId)
      .filter((id: unknown) => id != null);
    const uniqueAccountIds = [...new Set(accountIds.map(String))];

    if (uniqueAccountIds.length > 1) {
      return { name: 'Varios', accountId: null };
    }
    const accountId = (uniqueAccountIds[0] as string | number | undefined) ?? null;
    return { name: getAccountName(accountId), accountId };
  }
  return {
    name: getAccountName(item.accountId),
    accountId: item.accountId ?? null,
  };
}

function getUnifiedEntryInfo(item: UnifiedItem) {
  if (item.type !== 'entry') {
    return { name: '', accountId: null };
  }
  return {
    name: getAccountName(item.accountId),
    accountId: item.accountId ?? null,
  };
}

function getUnifiedAccountRemaining(item: UnifiedItem): number {
  if (item.type !== 'entry') {
    return 0;
  }
  return getAccountRemaining(item.accountId, item.id);
}

function getAccountRemaining(
  accountId: string | number | null | undefined,
  entryId?: string | number | null,
) {
  if (!accountId) return 0;
  const account = accountsList.value.find((a: Account) => String(a.id) === String(accountId));
  if (!account) return 0;

  const initialBalance = Number(account.initialBalance) || 0;

  const entries = budgetEntriesController.getEntries();

  const entriesForAccount = entries.filter((e: Income) => {
    if (String(e.accountId) === String(accountId)) return true;
    if (e.groups && Array.isArray(e.groups)) {
      return e.groups.some((g: EntryGroup) => String(g.accountId) === String(accountId));
    }
    return false;
  });

  let cutoffTime = Infinity;
  if (entryId) {
    const currentEntry = entriesForAccount.find((e: Income) => e.id === entryId);
    if (currentEntry) {
      cutoffTime = Number(currentEntry.createdAt) || Infinity;
    }
  }

  const filteredEntries =
    cutoffTime === Infinity
      ? entriesForAccount
      : entriesForAccount.filter((e: Income) => Number(e.createdAt) <= cutoffTime);

  const ingresos = filteredEntries
    .filter((e: Income) => e.entryType === 'ingreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);

  const egresos = filteredEntries
    .filter((e: Income) => e.entryType === 'egreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);

  return initialBalance + ingresos - egresos;
}
// End Functions
</script>

<style scoped>
.compact-icon {
  min-height: 16px;
  height: 16px;
  align-self: center;
}

.income-item {
  flex: 1;
  --min-height: 40px;
  position: relative;
  border-left: none !important;
}

.income-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background-color: var(--indicator-color);
  border-radius: 1px;
  z-index: 10;
}

.color-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 8px;
  font-size: 12px;
}

.list-content {
  max-height: calc(100dvh - 210px);
}

.scroll-content {
  overflow-y: auto;
  max-height: calc(100dvh - 245px);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-color {
  width: 4px;
  height: 12px;
  border-radius: 1px;
}

.legend-color.success {
  background-color: var(--ion-color-success);
}

.legend-color.danger {
  background-color: var(--ion-color-danger);
}

/* Summary col is flex column so CSS order can swap its children. */
.summary-col {
  display: flex;
  flex-direction: column;
}

/* Mobile/tablet-first: summary on top, registro below (hasta 991px). */
@media (max-width: 991px) {
  /* Único grid de la página — conserva su padding por defecto (16px)
     para dar spacing consistente al contenido, igual que SuppliersPage. */
  ion-grid {
    height: 100%;
  }

  ion-row {
    height: 100%;
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .summary-col {
    order: 1;
    flex: 0 0 auto !important;
    width: 100%;
    max-width: 100%;
  }

  .registro-col {
    order: 2;
    flex: 1 1 auto !important;
    min-height: 0;
    width: 100%;
    max-width: 100%;
  }

  /* Inside summary: el card de resumen se inyecta via slot (total-summary)
     y las cuentas van después — el orden lo controla AccountCards. */
  .accounts-block {
    order: 1;
  }

  /* Registro: el list ocupa todo el alto disponible y scrollea internamente */
  .registro-col ion-list.transparent {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .registro-col .list-content {
    flex: 1;
    min-height: 0;
    max-height: none;
    display: flex;
    flex-direction: column;
  }

  .registro-col .scroll-content {
    flex: 1;
    min-height: 0;
    max-height: none;
  }
}

/* Desktop: registro on the left, summary on the right.
   Inside summary, the summary card slot renders first (before the accounts list). */
@media (min-width: 992px) {
  .registro-col {
    order: -1;
  }

  .accounts-block {
    order: 1;
  }
}
</style>
