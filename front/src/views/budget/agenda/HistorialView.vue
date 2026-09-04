<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>
        <ion-title>Historial</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Buscar" :color="showSearch ? 'primary' : undefined" @click="toggleSearch">
            <ion-icon :icon="searchOutline"></ion-icon>
          </ion-button>
          <ion-button
            aria-label="Filtrar por fecha"
            :color="dateFilter ? 'primary' : undefined"
            @click="openDatePicker($event)"
          >
            <ion-icon :icon="calendarOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- search show/hide animation (replica patrón de SuppliersPage) -->
      <ion-toolbar class="search-toolbar">
        <div class="search-row" :class="{ 'search-row--open': showSearch }">
          <div class="search-row__inner">
            <ion-searchbar
              v-model="searchTerm"
              mode="ios"
              placeholder="Buscar por nombre, cuenta o proveedor"
              show-clear-button="focus"
            ></ion-searchbar>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <section>
        <ion-grid>
          <ion-row class="ion-justify-content-center">
            <ion-col size="12" size-sm="10" size-md="8" size-lg="6">
              <section class="ion-padding-top">
                <div v-if="dateFilter" class="ion-padding">
                  <ion-chip color="primary" @click="clearDateFilter">
                    <ion-icon :icon="calendarOutline"></ion-icon>
                    <ion-label>{{ formatDateFilter }}</ion-label>
                    <ion-icon :icon="closeOutline"></ion-icon>
                  </ion-chip>
                </div>

                <template v-if="dayBlocks.length > 0">
                  <template v-for="block in dayBlocks" :key="block.dateKey">
                    <ion-item-divider
                      :sticky="true"
                      class="day-divider"
                      role="button"
                      tabindex="0"
                      :aria-label="`Ir al día ${block.label}`"
                      @click="handleDayClick(block.dateKey)"
                    >
                      <ion-label>
                        {{ block.label }}
                        <ion-badge
                          v-if="block.dateKey === todayDate"
                          color="tertiary"
                          class="today-badge"
                          >Hoy</ion-badge
                        >
                      </ion-label>

                      <ion-label
                        slot="end"
                        class="ion-text-end"
                        :style="{
                          color:
                            block.dayTotal >= 0
                              ? 'var(--ion-color-success)'
                              : 'var(--ion-color-danger)',
                        }"
                      >
                        {{ formatCurrency({ value: block.dayTotal }) }}
                      </ion-label>
                    </ion-item-divider>

                    <ion-card class="shadow1">
                      <ion-item
                        v-for="(item, iIdx) in block.items"
                        :key="`${item.id}-${iIdx}`"
                        :lines="iIdx === block.items.length - 1 ? 'none' : 'full'"
                        class="transparent agenda-item"
                        button
                        @click="handleItemClick(item)"
                      >
                        <div
                          slot="start"
                          class="item-indicator"
                          :style="{ backgroundColor: item.color }"
                        ></div>

                        <ion-label>
                          {{ item.name }}
                          <p>
                            {{
                              item.entryType === 'ingreso'
                                ? 'Ingreso'
                                : item.type === 'provider'
                                  ? 'Proveedor'
                                  : 'Egreso'
                            }}
                          </p>
                        </ion-label>

                        <ion-label slot="end" class="ion-text-end" :style="{ color: item.color }">
                          {{ formatCurrency({ value: item.amount }) }}
                          <p v-if="item.accountName">
                            {{ item.accountName }} |
                            {{ formatCurrency({ value: item.runningBalance }) }}
                          </p>
                          <p v-else>Sin cuenta</p>
                        </ion-label>
                      </ion-item>
                    </ion-card>
                  </template>
                </template>

                <template v-else>
                  <section class="ion-padding ion-text-center">
                    <ion-icon :icon="calendarOutline" color="medium" size="large"></ion-icon>
                    <p v-if="hasActiveFilters">
                      <ion-label color="medium"> Sin resultados para la búsqueda o el filtro </ion-label>
                    </p>
                    <p v-else>
                      <ion-label color="medium"> No hay registros en el historial </ion-label>
                    </p>
                    <ion-button v-if="hasActiveFilters" fill="outline" @click="clearAllFilters">
                      Limpiar filtros
                    </ion-button>
                    <ion-button v-else fill="outline" @click="router.push('/budget')">
                      Ir a Presupuesto
                    </ion-button>
                  </section>
                </template>
              </section>
            </ion-col>
          </ion-row>
        </ion-grid>
      </section>
    </ion-content>

    <DatePickerPopover
      :popover-state="picker.popoverState"
      :temp-picker-date-iso="picker.tempPickerDateISO.value"
      :can-apply="picker.canApply.value"
      @did-dismiss="picker.closePopover()"
      @cancel="picker.closePopover()"
      @apply="onApplyDateFilter"
      @update:temp-picker-date-iso="picker.tempPickerDateISO.value = $event"
    />
  </ion-page>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonItemDivider,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  IonChip,
  IonSearchbar,
} from '@ionic/vue';
import { computed, ref, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// 2. Controllers / Composables
import accountsController from '@/controllers/accountsController';
import systemController from '@/controllers/systemConfigController';
import { dataMediator } from '@/services/dataMediator';
import { mapEntryRow, type Income } from '@/stores/budgetEntriesStore';
import { formatCurrency, calcProviderProductsTotal } from '@/utils/currency';
import { calendarOutline, searchOutline, closeOutline } from 'ionicons/icons';
import { useBudgetDay } from '@/composables/useBudgetDay';
import { useDatePicker } from '@/composables/useDatePicker';

// 3. Components
import DatePickerPopover from '@/views/budget/components/DatePickerPopover.vue';

// 4. Interface and types imports

// 5. Main
const router = useRouter();
const budgetDay = useBudgetDay();

// 6. Vars and const
const todayDate = new Date().toISOString().slice(0, 10);
const showSearch = ref(false);
const searchTerm = ref('');
const dateFilter = ref<string | null>(null);
const picker = useDatePicker();
const debouncedTerm = ref('');
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  searchTerm,
  (val) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedTerm.value = val;
    }, 300);
  },
  { immediate: true },
);

onUnmounted(() => {
  clearTimeout(debounceTimer);
});
const formatDateFilter = computed(() => {
  const value = dateFilter.value;
  if (!value) return '';
  try {
    const d = new Date(value + 'T00:00:00');
    if (isNaN(d.getTime())) return value;
    return format(d, 'EEE, d MMM yyyy', { locale: es });
  } catch {
    return value;
  }
});

interface AgendaUnifiedItem {
  id: string | number;
  name: string;
  providerName?: string;
  amount: number;
  date: string;
  type: 'entry' | 'provider';
  entryType?: 'ingreso' | 'egreso';
  accountId?: string | number | null;
  createdAt: number;
}

interface AgendaItemDisplay extends AgendaUnifiedItem {
  runningBalance: number;
  accountName: string;
  color: string;
}

interface DayBlock {
  dateKey: string;
  label: string;
  dayTotal: number;
  items: AgendaItemDisplay[];
}

// 7. Watch

// 8. Computed
const designMode = computed(() => systemController.getDesignMode());

const accountsList = computed(() => {
  const list = accountsController.getAccounts();
  if (!list || !Array.isArray(list)) return [];
  return list.filter((acc) => acc != null && acc.id != null);
});

const allEntries = computed<Income[]>(() => {
  return dataMediator.refs.entries.value.map(mapEntryRow);
});

const dayBlocks = computed<DayBlock[]>(() => {
  const entryItems: AgendaUnifiedItem[] = allEntries.value
    .filter((e) => e.date)
    .map((e) => ({
      id: e.id,
      name: e._providerName || e.supplierName || e.name || '-',
      providerName: e._providerName || e.supplierName || undefined,
      amount: e.amount || 0,
      date: e.date,
      type: 'entry' as const,
      entryType: e.entryType,
      accountId: e.accountId ?? null,
      createdAt: e.createdAt || 0,
    }));

  const providerItems: AgendaUnifiedItem[] = dataMediator.refs.providers.value
    .filter((r) => r.date)
    .map((r) => ({
      id: r.sync_id,
      name: (r as any)._supplierName || r.name || '-',
      amount: calcProviderProductsTotal({
        provider: {
          products: (r as any).products,
          estimated: r.estimated,
        },
      }),
      date: r.date || '',
      type: 'provider' as const,
      entryType: undefined,
      accountId: r.accountId ?? null,
      createdAt: r.createdAt || 0,
    }));

  const allItems = [...entryItems, ...providerItems];
  const allAccounts = accountsList.value;

  // Precompute running balances per account (cronológico, incluye entries + providers)
  const itemsByAccount = new Map<string, typeof allItems>();
  for (const item of allItems) {
    if (!item.accountId) continue;
    const key = String(item.accountId);
    if (!itemsByAccount.has(key)) itemsByAccount.set(key, []);
    itemsByAccount.get(key)!.push(item);
  }

  const runningBalanceByItemId = new Map<string | number, number>();
  const accountNameByAccountId = new Map<string, string>();
  for (const [accountKey, accItems] of itemsByAccount) {
    const account = allAccounts.find((a) => String(a.id) === accountKey);
    if (!account) continue;
    accountNameByAccountId.set(accountKey, account.name || '');

    const sorted = [...accItems].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    let balance = Number(account.initialBalance) || 0;
    for (const item of sorted) {
      const effect =
        item.type === 'provider'
          ? -item.amount
          : item.entryType === 'ingreso'
            ? item.amount
            : -item.amount;
      balance += effect;
      runningBalanceByItemId.set(item.id, balance);
    }
  }

  // Precompute colors
  const colorByItemId = new Map<string | number, string>();
  for (const item of allItems) {
    const color =
      item.type === 'provider' || item.entryType === 'egreso'
        ? 'var(--ion-color-danger)'
        : 'var(--ion-color-success)';
    colorByItemId.set(item.id, color);
  }

  // Apply search + filters (running balances/colors keep full-history semantics)
  const term = (debouncedTerm.value || '').toString().toLowerCase().trim();
  const filteredItems: AgendaUnifiedItem[] = allItems.filter((item) => {
    if (dateFilter.value && item.date !== dateFilter.value) return false;

    if (term) {
      const name = (item.name || '').toString().toLowerCase();
      const providerName = (item.providerName || '').toString().toLowerCase();
      const accountName = item.accountId
        ? (accountNameByAccountId.get(String(item.accountId)) ?? '').toLowerCase()
        : '';
      const haystack = `${name} ${providerName} ${accountName}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    return true;
  });

  // Group by date
  const groups = new Map<string, AgendaUnifiedItem[]>();
  const sortedItems = [...filteredItems].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  for (const item of sortedItems) {
    const key = item.date;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const blocks: DayBlock[] = [];
  for (const [dateKey, items] of groups) {
    const dayTotal = items.reduce((sum, item) => {
      if (item.type === 'provider') return sum - item.amount;
      return item.entryType === 'ingreso' ? sum + item.amount : sum - item.amount;
    }, 0);

    let label = dateKey;
    try {
      const d = new Date(dateKey + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        label = format(d, 'EEE, d MMM yyyy', { locale: es });
      }
    } catch (e) {
      console.warn('failed to parse date', dateKey, e);
    }

    const itemsWithBalance: AgendaItemDisplay[] = items.map((item) => ({
      ...item,
      runningBalance: runningBalanceByItemId.get(item.id) ?? 0,
      accountName: item.accountId ? (accountNameByAccountId.get(String(item.accountId)) ?? '') : '',
      color: colorByItemId.get(item.id) ?? 'var(--ion-color-medium)',
    }));

    blocks.push({ dateKey, label, dayTotal, items: itemsWithBalance });
  }

  blocks.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  return blocks;
});

// 9. OnMounted

// 10. Functions
function handleDayClick(date: string) {
  budgetDay.setSelectedDate(date);
  router.push('/budget');
}

function toggleSearch() {
  showSearch.value = !showSearch.value;
}

function openDatePicker(e: Event) {
  picker.setDate({
    date: dateFilter.value ? dateFilter.value : format(new Date(), 'yyyy-MM-dd'),
  });
  picker.openPopover({ e });
}

function onApplyDateFilter() {
  const d = picker.applyDate();
  if (d) dateFilter.value = d;
}

function clearDateFilter() {
  dateFilter.value = null;
}

function clearAllFilters() {
  dateFilter.value = null;
  searchTerm.value = '';
  debouncedTerm.value = '';
}

const hasActiveFilters = computed(() => !!dateFilter.value || !!debouncedTerm.value.trim());

function handleItemClick(item: AgendaItemDisplay) {
  if (item.type === 'entry') {
    router.push(`/budget/entry/edit?entryId=${item.id}`);
  } else {
    router.push(`/budget/provider/edit?providerId=${item.id}`);
  }
}
</script>

<style scoped>
.day-divider {
  cursor: pointer;
  transition: filter 0.2s;
}
.day-divider:hover {
  filter: brightness(0.92);
}
.day-divider:active {
  filter: brightness(0.85);
}

.today-badge {
  vertical-align: middle;
  margin-left: 0.4em;
  font-size: 0.65em;
  padding: 2px 6px;
}

.item-indicator {
  width: 4px;
  height: 24px;
  border-radius: 2px;
  flex-shrink: 0;
}

.agenda-item {
  --min-height: 44px;
}

.search-toolbar {
  --padding-top: 0;
  --padding-bottom: 0;
  --min-height: 0;
}

.search-row {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms ease;
}

.search-row--open {
  grid-template-rows: 1fr;
}

.search-row__inner {
  min-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 200ms ease;
}

.search-row--open .search-row__inner {
  opacity: 1;
}

</style>
