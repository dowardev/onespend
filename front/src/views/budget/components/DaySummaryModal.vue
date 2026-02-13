<template>
  <ion-page>
    <ion-header mode="ios" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="$emit('close')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>Resumen del Día</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <template v-if="summary.incomeCount + summary.expenseCount === 0">
        <ion-card class="shadow1">
          <ion-card-content>
            <p class="ion-padding">
              No hay registros para la fecha seleccionada.
            </p>
          </ion-card-content>
        </ion-card>
      </template>

      <template v-else>
        <ion-list>
          <ion-list-header>
            <ion-label>
              Totales
              <p>{{ formattedDate }}</p>
            </ion-label>
          </ion-list-header>

          <div class="list-content">
            <ion-item class="transparent">
              <ion-label>
                <h3>Entradas</h3>

                <p>{{ summary.incomeCount }} registros</p>
              </ion-label>

              <ion-note slot="end" color="success">{{
                formatCurrency({ value: summary.totalIncome })
              }}</ion-note>
            </ion-item>

            <ion-item class="transparent">
              <ion-label>
                <h3>Salidas</h3>

                <p>{{ summary.expenseCount }} registros</p>
              </ion-label>

              <ion-note slot="end" color="danger">{{
                formatCurrency({ value: summary.totalExpense })
              }}</ion-note>
            </ion-item>

            <ion-item class="transparent">
              <ion-label>
                <h3>Balance</h3>

                <p>Total del día</p>
              </ion-label>

              <ion-note
                slot="end"
                :color="summary.balance >= 0 ? 'success' : 'danger'"
                >{{ formatCurrency({ value: summary.balance }) }}</ion-note
              >
            </ion-item>
          </div>
        </ion-list>

        <ion-list>
          <ion-list-header>
            <ion-label>Top Proveedores</ion-label>
          </ion-list-header>

          <div class="list-content">
            <template v-if="topExpenseProviders.length">
              <ion-item
                v-for="p in topExpenseProviders"
                :key="p.id"
                class="transparent"
              >
                <ion-label>
                  <h3>{{ resolveProviderName(p.id) }}</h3>
                  <p>{{ p.count }} registros</p>
                </ion-label>
                <ion-note slot="end" color="danger">{{
                  formatCurrency({ value: p.total })
                }}</ion-note>
              </ion-item>
            </template>
            <template v-else>
              <ion-item>
                <ion-label>No hay proveedores con gastos</ion-label>
              </ion-item>
            </template>
          </div>
        </ion-list>

        <ion-list>
          <ion-list-header>
            <ion-label>Top Cuentas</ion-label>
          </ion-list-header>

          <div class="list-content">
            <template v-if="topAccounts.length">
              <ion-item
                v-for="a in topAccounts"
                :key="a.id"
                class="transparent"
              >
                <ion-label>
                  <h3>{{ resolveAccountName(a.id) }}</h3>
                </ion-label>

                <ion-note slot="end">{{
                  formatCurrency({ value: a.total })
                }}</ion-note>
              </ion-item>
            </template>

            <template v-else>
              <ion-item class="transparent">
                <ion-label>No hay movimientos en cuentas</ion-label>
              </ion-item>
            </template>
          </div>
        </ion-list>

        <ion-list>
          <ion-list-header>
            <ion-label>Detalles</ion-label>
          </ion-list-header>

          <div class="list-content">
            <ion-item class="transparent">
              <ion-label>
                <h3>Mayor Ingreso</h3>

                <p v-if="largestIncome">
                  {{ largestIncome.name || 'Ingreso' }}
                </p>
              </ion-label>

              <ion-note slot="end" color="success">{{
                formatCurrency({
                  value: largestIncome ? largestIncome.amount : 0,
                })
              }}</ion-note>
            </ion-item>

            <ion-item class="transparent">
              <ion-label>
                <h3>Mayor Gasto</h3>

                <p v-if="largestExpense">
                  {{ largestExpense.name || 'Gasto' }}
                </p>
              </ion-label>

              <ion-note slot="end" color="danger">{{
                formatCurrency({
                  value: largestExpense ? largestExpense.amount : 0,
                })
              }}</ion-note>
            </ion-item>

            <ion-item class="transparent">
              <ion-label>
                <h3>Promedios</h3>

                <p>
                  Ingreso:
                  {{ formatCurrency({ value: summary.avgIncome }) }} · Gasto:
                  {{ formatCurrency({ value: summary.avgExpense }) }}
                </p>
              </ion-label>
            </ion-item>

            <ion-item class="transparent">
              <ion-label>
                <h3>Por tipo de pago</h3>

                <p v-for="(v, k) in paymentTypeBreakdown" :key="k">
                  {{ k }}: {{ formatCurrency({ value: v }) }}
                </p>
              </ion-label>
            </ion-item>

            <ion-item class="transparent">
              <ion-label>
                <h3>Tiempos</h3>

                <p>
                  Inicio: {{ summary.startTime }} · Final:
                  {{ summary.endTime }}
                </p>
              </ion-label>
            </ion-item>
          </div>
        </ion-list>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { format } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonPage,
} from '@ionic/vue';
import budgetController from '@/controllers/budgetController';
import accountsController from '@/controllers/accountsController';
import { closeOutline, codeSlashOutline } from 'ionicons/icons';

function formatCurrency(params: { value: number }) {
  const { value } = params;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value || 0);
}

function formatTime(params: { timestamp: number }) {
  const { timestamp } = params;
  if (!timestamp) return '--:--';
  return new Date(timestamp).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const summary = computed(() => {
  const entries = budgetController.getEntries();
  const providers = budgetController.getProviders();

  const ingresos = entries.filter(e => e.entryType === 'ingreso');
  const egresos = entries.filter(e => e.entryType === 'egreso');

  const totalIncome = ingresos.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalExpense = egresos.reduce((s, e) => s + Number(e.amount || 0), 0);

  const allTimestamps = entries
    .map(e => Number(e.createdAt))
    .filter(t => t > 0)
    .sort((a, b) => a - b);

  return {
    incomeCount: ingresos.length,
    expenseCount: egresos.length,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    incomes: ingresos,
    expenses: egresos,
    providers,
    startTime: allTimestamps.length
      ? formatTime({ timestamp: allTimestamps[0] })
      : '--:--',
    endTime: allTimestamps.length
      ? formatTime({ timestamp: allTimestamps[allTimestamps.length - 1] })
      : '--:--',
    avgIncome: ingresos.length ? totalIncome / ingresos.length : 0,
    avgExpense: egresos.length ? totalExpense / egresos.length : 0,
  } as any;
});

const showRaw = ref(false);
function toggleRaw() {
  showRaw.value = !showRaw.value;
  if (showRaw.value) {
    // help debugging: print entries to console
    try {
      console.log('[DaySummaryModal] entries:', budgetController.getEntries());
    } catch (e) {}
  }
}

const rawJson = computed(() => {
  try {
    return JSON.stringify(
      {
        selectedDate: budgetController.getSelectedDate(),
        entries: budgetController.getEntries(),
        providers: budgetController.getProviders(),
      },
      null,
      2
    );
  } catch (e) {
    return '{}';
  }
});

const paymentTypeBreakdown = computed(() => {
  const out: Record<string, number> = {};
  for (const e of budgetController.getEntries()) {
    const t = e.paymentType || 'unknown';
    out[t] = (out[t] || 0) + Number(e.amount || 0);
  }
  return out;
});

function groupBySum(items: any[], key: string) {
  return items.reduce(
    (acc: Record<string, any>, it: any) => {
      const k = it[key] ?? 'unknown';
      acc[k] = acc[k] || { total: 0, count: 0 };
      acc[k].total += Number(it.amount || 0);
      acc[k].count += 1;
      return acc;
    },
    {} as Record<string, any>
  );
}

const topExpenseProviders = computed(() => {
  const expenses = summary.value.expenses || [];
  if (expenses.length === 0) return [];
  const sample = expenses.find(e => e != null) || {};
  const key = sample._providerName
    ? '_providerName'
    : sample.name
      ? 'name'
      : 'providerName';
  const map = groupBySum(expenses, key);
  return Object.entries(map)
    .map(([id, v]) => ({ id, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
});

const topAccounts = computed(() => {
  const map = groupBySum(budgetController.getEntries(), 'accountId');
  return Object.entries(map)
    .map(([id, v]) => ({ id, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
});

const largestIncome = computed(() => {
  const ins = summary.value.incomes;
  if (!ins || ins.length === 0) return null;
  return ins.reduce(
    (p: any, c: any) => (Number(c.amount || 0) > Number(p.amount || 0) ? c : p),
    ins[0]
  );
});

const largestExpense = computed(() => {
  const eg = summary.value.expenses;
  if (!eg || eg.length === 0) return null;
  return eg.reduce(
    (p: any, c: any) => (Number(c.amount || 0) > Number(p.amount || 0) ? c : p),
    eg[0]
  );
});

function resolveProviderName(id: string) {
  // id comes from _providerName or name key
  return String(id);
}

function resolveAccountName(id: string) {
  if (id === 'unknown' || id === 'null' || id == null) return 'Sin cuenta';
  const accounts = accountsController.getAccounts();
  const acc = accounts.find(a => String(a.id) === String(id));
  return acc ? acc.name : String(id);
}

const formattedDate = computed(() => {
  try {
    const d = new Date(budgetController.getSelectedDate());
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: esLocale });
  } catch {
    return budgetController.getSelectedDate();
  }
});
</script>

<style scoped>
.shadow1 {
  margin: 12px;
}
</style>
