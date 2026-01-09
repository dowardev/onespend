<template>
  <ion-grid>
    <ion-row>
      <ion-col>
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Resumen de gastos</ion-label>
          </ion-list-header>

          <div class="list-content">
            <ion-item
              v-for="account in accountsSummary"
              :key="account.name"
              lines="full"
            >
              <ion-label>{{ account.name }}</ion-label>
              <ion-label slot="end">{{
                formatCurrency(account.total)
              }}</ion-label>
            </ion-item>
          </div>
        </ion-list>
      </ion-col>
    </ion-row>
  </ion-grid>

  <ion-grid>
    <ion-row>
      <ion-col>
        <ion-card class="shadow1">
          <div
            class="ion-padding-start ion-padding-top"
            style="display: flex; justify-content: space-between; height: 100%"
          >
            <div style="display: flex; align-items: center">
              <ion-card-title :color="differenceColor">{{
                differenceLabel
              }}</ion-card-title>
            </div>

            <ion-button slot="end" fill="clear">
              <ion-icon :icon="informationCircleOutline"></ion-icon>
            </ion-button>
          </div>

          <ion-list class="transparent">
            <ion-list-header>
              <ion-label>Resultado</ion-label>
            </ion-list-header>

            <div class="list-content" style="border: none">
              <ion-item
                v-for="account in accountsSummary"
                :key="account.name"
                lines="full"
              >
                <ion-label>{{ account.name }}</ion-label>
                <ion-label slot="end" :color="account.diffColor">{{
                  account.diffLabel
                }}</ion-label>
              </ion-item>
            </div>
          </ion-list>
        </ion-card>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script setup lang="ts">
import { IonRow, IonCol, IonCard, IonItem, IonLabel } from '@ionic/vue';
import { informationCircleOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { useBudgetStore } from '@/stores/budgetStore';
import { useAccountsStore } from '@/stores/accountsStore';

const budgetStore = useBudgetStore();
const accountsStore = useAccountsStore();

// Get account name by id from accounts store
function getAccountNameById(accountId: string | number | null | undefined): string {
  if (!accountId) return 'Sin cuenta';
  const account = accountsStore.accounts.find(
    (a) => String(a.id) === String(accountId)
  );
  return account?.name || 'Sin cuenta';
}

// Group by account and sum totals (providers + egresos) and ingresos
const accountsSummary = computed(() => {
  const accountMap = new Map<string, { total: number; ingreso: number }>();

  // Sum providers totals by account using 'estimated' and 'accountId'
  for (const provider of budgetStore.providers) {
    const accountName = getAccountNameById(provider.accountId);
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

  return Array.from(accountMap.entries()).map(([name, data]) => {
    const diff = data.ingreso - data.total;
    return {
      name,
      total: data.total,
      ingreso: data.ingreso,
      diff,
      diffLabel: diff === 0 ? '0' : `${diff > 0 ? '+' : '-'}${Math.round(Math.abs(diff))}`,
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
  () => Number(totalIngresos.value || 0) - Number(totalProvidersRequired.value || 0)
);

const differenceLabel = computed(() => {
  const d = Number(difference.value || 0) || 0;
  if (d === 0) return '0';
  const sign = d > 0 ? '+' : '-';
  const abs = Math.abs(d);
  return `${sign}${Math.round(abs)}`;
});

const differenceColor = computed(() => {
  const d = Number(difference.value || 0) || 0;
  if (d === 0) return undefined;
  return d > 0 ? 'success' : 'danger';
});

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
</script>

<style scoped>
ion-card {
  margin-bottom: 12px;
}
</style>
