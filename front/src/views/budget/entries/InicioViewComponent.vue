<template>
  <ion-grid>
    <ion-row>
      <ion-col size="6">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Registro</ion-label>

            <ion-button :disabled="isDayClosed" @click="navigateToNewEntry">
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>
          </ion-list-header>

          <div class="list-content" style="flex: 1 1 auto; min-height: 0">
            <div
              class="color-legend"
              style="
                border-bottom: 1px solid var(--ion-background-color-step-200);
              "
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
              <template v-if="budgetController.getEntries().length > 0">
                <template
                  v-for="(block, bIdx) in renderedEntries"
                  :key="blockKey(block, bIdx)"
                >
                  <ion-item
                    v-if="block.type === 'item'"
                    :lines="
                      bIdx === renderedEntries.length - 1 ? 'none' : 'full'
                    "
                    class="transparent"
                    button
                    :disabled="isDayClosed"
                    @click="navigateToEditEntry(block.item)"
                  >
                    <ion-label>
                      {{ block.item._providerName || block.item.name || '-' }}
                      <p>{{ formatTimeLocal(block.item.createdAt) }}</p>
                    </ion-label>

                    <ion-label
                      slot="end"
                      class="ion-text-end"
                      :style="`color: ${block.item.entryType === 'egreso' ? 'var(--ion-color-danger)' : 'var(--ion-color-success)'}`"
                    >
                      {{ formatCurrencyLocal({ v: block.item.amount || 0 }) }}

                      <p>
                        {{ getEntryAccountInfo(block.item).name }}:
                        {{
                          formatCurrencyLocal({
                            v: getAccountRemaining(
                              getEntryAccountInfo(block.item).accountId,
                              block.item.id
                            ),
                          })
                        }}
                      </p>
                    </ion-label>
                  </ion-item>
                </template>
              </template>

              <template v-else>
                <div class="ion-padding">
                  <ion-label
                    >Pulsa el botón "+" para agregar un nuevo ingreso</ion-label
                  >
                </div>
              </template>
            </div>
          </div>
        </ion-list>
      </ion-col>

      <ion-col size="6" >
        <AccountCards :accounts="accountsWithBalance" />

        <!-- Resultado Total Card -->
        <ion-card class="shadow1">
          <div
            class="ion-padding-start ion-padding-top"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
            "
          >
            <div style="display: flex; align-items: center">
              <ion-card-title :color="totalDifferenceColor">{{
                totalDifferenceLabel
              }}</ion-card-title>
            </div>

            <ion-button fill="clear">
              <ion-icon :icon="informationCircleOutline"></ion-icon>
            </ion-button>
          </div>

          <ion-card-content>
            <p>
              <span style="color: var(--ion-color-success)"
                >Ingresos: {{ formatCurrencyLocal({ v: totalIngresos }) }}</span
              >
              <br />
              <span style="color: var(--ion-color-danger)"
                >Gastos: {{ formatCurrencyLocal({ v: totalEgresos }) }}</span
              >
            </p>
          </ion-card-content>
        </ion-card>
      </ion-col>
    </ion-row>
  </ion-grid>
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
  IonCard,
  IonCardTitle,
  IonCardContent,
} from '@ionic/vue';
import {
  addOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import AccountCards from '../components/AccountCards.vue';
import budgetController from '@/controllers/budgetController';
import accountsController from '@/controllers/accountsController';
import type { Account } from '@/stores/accountsStore';
import type {
  Income,
  Provider,
} from '@/stores/budgetStore';
import type { AccountWithBalance, EntryGroup } from '../components/EditEntryModal.vue';
// End Imports

// router
const router = useRouter();
// end router

// Components

// Vars
// End Vars

// Computed
// Day-close concept removed; always treat as open
const isDayClosed = computed(() => false);
const frozenSnapshot = computed(() => budgetController.getFrozenSnapshot());

const accountsList = computed(() => {
  const list = accountsController.getAccounts();
  if (!list || !Array.isArray(list)) return [];
  return list.filter((acc: Account) => acc != null && acc.id != null);
});

function calculateAccountBalance(acc: Account, accountId: string | number) {
  const initialBalance = Number(acc.initialBalance) || 0;

  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();

  const entriesForAccount = entries.filter((e: Income) => {
    if (String(e.accountId) === String(accountId)) return true;
    if (e.groups && Array.isArray(e.groups)) {
      return e.groups.some(
        (g: EntryGroup) => String(g.accountId) === String(accountId)
      );
    }
    return false;
  });

  const ingresos = entriesForAccount
    .filter((e: Income) => e.entryType === 'ingreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);

  const egresos = entriesForAccount
    .filter((e: Income) => e.entryType === 'egreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);

  return {
    ...acc,
    initialBalance,
    ingresos,
    egresos,
    balance: initialBalance + ingresos - egresos,
    hasTransactions: ingresos > 0 || egresos > 0,
  };
}

const accountsWithBalance = computed(() => {
  const result = accountsList.value.map((acc: Account) =>
    calculateAccountBalance(acc, acc.id)
  );

  const withTransactions = result
    .filter((acc: AccountWithBalance) => acc.hasTransactions)
    .sort(
      (a: AccountWithBalance, b: AccountWithBalance) => b.balance - a.balance
    );

  const withoutTransactions = result
    .filter((acc: AccountWithBalance) => !acc.hasTransactions)
    .sort((a: AccountWithBalance, b: AccountWithBalance) =>
      a.name.localeCompare(b.name)
    );

  return [...withTransactions, ...withoutTransactions];
});

const totalIngresos = computed(() => {
  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();
  return entries
    .filter((e: Income) => e.entryType === 'ingreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);
});

const totalEgresos = computed(() => {
  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();
  return entries
    .filter((e: Income) => e.entryType === 'egreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);
});

const totalDifference = computed(() => {
  return totalIngresos.value - totalEgresos.value;
});

const totalDifferenceLabel = computed(() => {
  const d = totalDifference.value;
  if (d === 0) return '$0';
  const formatted = formatCurrencyLocal({ v: Math.abs(d) });
  return d > 0 ? `+${formatted}` : `-${formatted}`;
});

const totalDifferenceColor = computed(() => {
  const d = totalDifference.value;
  if (d === 0) return undefined;
  return d > 0 ? 'success' : 'danger';
});

const providersToday = computed(() => {
  const sel = String(budgetController.getSelectedDate() || '').slice(0, 10);
  if (!sel) return [];
  return budgetController
    .getProviders()
    .filter((p: Provider) => String(p.date || '').slice(0, 10) === sel);
});

const renderedEntries = computed(() => {
  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();
  return entries.map((item: Income) => ({ type: 'item', item }));
});

// End Computed

// Functions
function getDefaultAccountId() {
  const accounts = accountsList.value;
  return accounts.length > 0 ? accounts[0].id : null;
}

function formatCurrencyLocal(params: { v: number }) {
  const { v } = params || { v: 0 };
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(v || 0);
}

function formatTimeLocal(ms?: number) {
  if (!ms) return '';
  return new Date(Number(ms)).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function navigateToNewEntry() {
  router.push('/budget/entry/new');
}

function navigateToEditEntry(item: Income) {
  router.push(`/budget/entry/edit?entryId=${item.id}`);
}

function formatProviderAmount(provider: Provider) {
  return formatCurrencyLocal({ v: Number(provider?.estimated) || 0 });
}

function blockKey(block: { type: string; item: Income }, idx: number) {
  if (!block) return `b-${idx}`;
  return `i-${String((block.item && block.item.id) || idx)}`;
}

function getAccountName(accountId: string | number | null | undefined) {
  if (!accountId) return '';
  const account = accountsList.value.find(
    (a: Account) => String(a.id) === String(accountId)
  );
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
    const accountId =
      (uniqueAccountIds[0] as string | number | undefined) ?? null;
    return { name: getAccountName(accountId), accountId };
  }
  return {
    name: getAccountName(item.accountId),
    accountId: item.accountId ?? null,
  };
}

function getAccountRemaining(
  accountId: string | number | null | undefined,
  entryId?: string | number | null
) {
  if (!accountId) return 0;
  const account = accountsList.value.find(
    (a: Account) => String(a.id) === String(accountId)
  );
  if (!account) return 0;

  const initialBalance = Number(account.initialBalance) || 0;

  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();

  const entriesForAccount = entries.filter((e: Income) => {
    if (String(e.accountId) === String(accountId)) return true;
    if (e.groups && Array.isArray(e.groups)) {
      return e.groups.some(
        (g: EntryGroup) => String(g.accountId) === String(accountId)
      );
    }
    return false;
  });

  let cutoffTime = Infinity;
  if (entryId) {
    const currentEntry = entriesForAccount.find(
      (e: Income) => e.id === entryId
    );
    if (currentEntry) {
      cutoffTime = Number(currentEntry.createdAt) || Infinity;
    }
  }

  const filteredEntries =
    cutoffTime === Infinity
      ? entriesForAccount
      : entriesForAccount.filter(
          (e: Income) => Number(e.createdAt) <= cutoffTime
        );

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
  max-height: calc(100vh - 210px);
}

.scroll-content {
  overflow-y: auto;
  max-height: calc(100vh - 245px);
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
</style>
