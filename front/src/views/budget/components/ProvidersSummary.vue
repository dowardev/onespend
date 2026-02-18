<template>
  <ion-list class="transparent">
    <ion-list-header>
      <ion-label>Resumen por cuenta</ion-label>
    </ion-list-header>

<div class="list-content">
      <template v-if="accountsSummary.length > 0">
        <ion-item
          v-for="(acc, index) in accountsSummary"
          :key="acc.name"
          class="transparent"
          :lines="index === accountsSummary.length - 1 ? 'none' : 'full'"
        >
          <ion-label>
            <h2>{{ acc.name }}</h2>
            <p>Estimado: {{ formatCurrency(acc.total) }}</p>
          </ion-label>

          <ion-label slot="end" class="ion-text-end">
            <h2
              :style="{
                color:
                  acc.diff >= 0
                    ? 'var(--ion-color-success)'
                    : 'var(--ion-color-danger)',
              }"
            >
              {{ acc.diffLabel }}
            </h2>

            <p v-if="acc.ingreso > 0 || acc.total > 0">
              <span style="color: var(--ion-color-success)"
                >+{{ formatCurrency(acc.ingreso) }}</span
              >
              /
              <span style="color: var(--ion-color-danger)"
                >-{{ formatCurrency(acc.total) }}</span
              >
            </p>
          </ion-label>

          <div slot="end" class="chart-wrapper">
            <AccountBarChart
              v-if="acc.ingreso > 0 || acc.total > 0"
              :ingresos="acc.ingreso"
              :egresos="acc.total"
            />
          </div>
        </ion-item>
      </template>

      <template v-else>
        <ion-item lines="none">
          <ion-label>No hay datos de cuentas</ion-label>
        </ion-item>
      </template>
    </div>
  </ion-list>

  <!-- Resultado Total Card -->
  <ion-card class="shadow1">
    <ion-card-header>
      <ion-card-title :color="differenceColor">{{
        differenceLabel
      }}</ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <ion-item class="transparent">
        <ion-label>Ingresos</ion-label>

        <ion-label slot="end" color="success">{{
          formatCurrency(totalIngresos)
        }}</ion-label>
      </ion-item>

      <ion-item class="transparent">
        <ion-label>Egresos</ion-label>

        <ion-label slot="end" color="danget">{{
          formatCurrency(totalProvidersRequired)
        }}</ion-label>
      </ion-item>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
// Imports
import {
  IonList,
  IonListHeader,
  IonLabel,
  IonItem,
  IonCard,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
} from '@ionic/vue';
import { informationCircleOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { useBudgetStore } from '@/stores/budgetStore';
import { useAccountsStore } from '@/stores/accountsStore';
// End Imports

// Components
import AccountBarChart from './AccountBarChart.vue';
// End Components

// Vars
const budgetStore = useBudgetStore();
const accountsStore = useAccountsStore();
// End Vars

// Functions
function getAccountNameById(
  accountId: string | number | null | undefined
): string {
  if (!accountId) return '';
  const account = accountsStore.accounts.find(
    a => String(a.id) === String(accountId)
  );
  return account?.name || '';
}

function formatCurrency(v: number | string) {
  try {
    const n = Number(v || 0) || 0;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(n);
  } catch (_e) {
    return String(v || '0');
  }
}
// End Functions

// Life cycle

// End Life cycle

// Computed
const accountsSummary = computed(() => {
  const accountMap = new Map<string, { total: number; ingreso: number }>();

  // First, add all existing accounts with zero values
  for (const account of accountsStore.accounts) {
    if (account.name && !accountMap.has(account.name)) {
      accountMap.set(account.name, { total: 0, ingreso: 0 });
    }
  }

  // Sum providers totals by account using 'estimated' and 'accountId'
  for (const provider of budgetStore.providers) {
    const accountName = getAccountNameById(provider.accountId);
    if (!accountName) continue; // Skip if no valid account
    const providerTotal = Number(provider.estimated || 0);

    if (!accountMap.has(accountName)) {
      accountMap.set(accountName, { total: 0, ingreso: 0 });
    }
    accountMap.get(accountName)!.total += providerTotal;
  }

  // Process entries (ingresos and egresos)
  for (const entry of budgetStore.entries) {
    // If entry has groups, use them
    if (entry.groups && entry.groups.length > 0) {
      for (const group of entry.groups) {
        const accountName = getAccountNameById(group.accountId);
        if (!accountName) continue; // Skip if no valid account
        if (!accountMap.has(accountName)) {
          accountMap.set(accountName, { total: 0, ingreso: 0 });
        }
        const data = accountMap.get(accountName)!;
        if (entry.entryType === 'ingreso') {
          data.ingreso += Number(group.amount || 0);
        } else if (entry.entryType === 'egreso') {
          data.total += Number(group.amount || 0);
        }
      }
    } else {
      // Use entry.accountId directly
      const accountName = getAccountNameById(entry.accountId);
      if (!accountName) continue; // Skip if no valid account
      if (!accountMap.has(accountName)) {
        accountMap.set(accountName, { total: 0, ingreso: 0 });
      }
      const data = accountMap.get(accountName)!;
      if (entry.entryType === 'ingreso') {
        data.ingreso += Number(entry.amount || 0);
      } else if (entry.entryType === 'egreso') {
        data.total += Number(entry.amount || 0);
      }
    }
  }

  return Array.from(accountMap.entries())
    .filter(([name]) => name && name.trim() !== '') // Filter out empty names
    .map(([name, data]) => {
      const diff = data.ingreso - data.total;
      return {
        name,
        total: data.total,
        ingreso: data.ingreso,
        diff,
        diffLabel:
          diff === 0 ? '$0' : `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`,
        diffColor: diff === 0 ? undefined : diff > 0 ? 'success' : 'danger',
      };
    });
});

// total required by providers
const totalProvidersRequired = computed(() => {
  return accountsSummary.value.reduce((sum, acc) => sum + acc.total, 0);
});

// total ingresos (available)
const totalIngresos = computed(() => {
  return accountsSummary.value.reduce((sum, acc) => sum + acc.ingreso, 0);
});

// difference: ingresos - required (positive => sobrante, negative => faltante)
const difference = computed(
  () =>
    Number(totalIngresos.value || 0) - Number(totalProvidersRequired.value || 0)
);

const differenceLabel = computed(() => {
  const d = Number(difference.value || 0) || 0;
  if (d === 0) return '$0';
  return `${d > 0 ? '+' : ''}${formatCurrency(d)}`;
});

const differenceColor = computed(() => {
  const d = Number(difference.value || 0) || 0;
  if (d === 0) return undefined;
  return d > 0 ? 'success' : 'danger';
});
// End Computed

// Watch
// End Watch</script>

<style scoped>
ion-card {
  margin-bottom: 12px;
}

.list-content {
  max-height: calc(100dvh - 210px);
  overflow-y: auto;
}

.chart-wrapper {
  width: 80px;
  height: 40px;
  margin-left: 8px;
}
</style>
