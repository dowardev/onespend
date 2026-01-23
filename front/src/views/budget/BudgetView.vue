<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>

        <ion-title>Presupuesto </ion-title>

        <ion-buttons slot="end">
          <ion-button @click="openMoreOptions({ event: $event })">
            <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <section class="ion-padding-top">
        <ion-item lines="none" class="transparent">
          <ion-buttons>
            <ion-segment v-model="activeView" scrollable>
              <ion-segment-button value="inicio">Inicio</ion-segment-button>

              <ion-segment-button value="proveedores"
                >Proveedores</ion-segment-button
              >
              <!-- Resumen ahora solo se muestra en el modal -->
            </ion-segment>
          </ion-buttons>

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
      </section>

      <section>
        <ion-grid v-if="activeView === 'inicio'">
          <ion-row>
            <ion-col size="12">
              <InicioViewComponent />
            </ion-col>
          </ion-row>
        </ion-grid>

        <ion-grid v-if="activeView === 'proveedores'">
          <ion-row>
            <ion-col size="12">
              <ProvidersComponent />
            </ion-col>
          </ion-row>
        </ion-grid>

        <ion-grid v-if="activeView === 'form'">
          <ion-row>
            <ion-col size="12">
              <FinishDayForm :finish-day="finishDay" @save="onFinishDaySaved" />
            </ion-col>
          </ion-row>
        </ion-grid>

        <ion-grid v-if="activeView === 'resumen'">
          <ion-row class="ion-justify-content-center">
            <ion-col size="12" size-md="8" size-lg="6">
              <ion-card class="shadow1">
                <ion-card-header>
                  <ion-card-title>Resumen del Día</ion-card-title>
                  <ion-card-subtitle>{{
                    formattedSelectedDate
                  }}</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <ion-list>
                    <ion-item>
                      <ion-label>
                        <h3>Proveedores</h3>
                        <p>{{ daySummary.providersCount }} proveedores</p>
                      </ion-label>
                      <ion-note slot="end" color="primary">
                        {{
                          formatCurrency({ value: daySummary.totalEstimated })
                        }}
                      </ion-note>
                    </ion-item>
                    <ion-item>
                      <ion-label>
                        <h3>Ingresos</h3>
                        <p>{{ daySummary.incomeCount }} registros</p>
                      </ion-label>
                      <ion-note slot="end" color="success">
                        {{ formatCurrency({ value: daySummary.totalIncome }) }}
                      </ion-note>
                    </ion-item>
                    <ion-item>
                      <ion-label>
                        <h3>Gastos</h3>
                        <p>{{ daySummary.expenseCount }} registros</p>
                      </ion-label>
                      <ion-note slot="end" color="danger">
                        {{ formatCurrency({ value: daySummary.totalExpense }) }}
                      </ion-note>
                    </ion-item>
                    <ion-item>
                      <ion-label>
                        <h3>Balance</h3>
                        <p>Total del día</p>
                      </ion-label>
                      <ion-note
                        slot="end"
                        :color="daySummary.balance >= 0 ? 'success' : 'danger'"
                      >
                        {{ formatCurrency({ value: daySummary.balance }) }}
                      </ion-note>
                    </ion-item>
                  </ion-list>
                  <ion-item lines="none" class="ion-margin-top">
                    <ion-icon
                      slot="start"
                      :icon="timeOutline"
                      color="medium"
                    ></ion-icon>
                    <ion-label>
                      <p>Inicio del día</p>
                      <h3>{{ daySummary.startTime }}</h3>
                    </ion-label>
                  </ion-item>
                  <ion-item lines="none">
                    <ion-icon
                      slot="start"
                      :icon="timeOutline"
                      color="medium"
                    ></ion-icon>
                    <ion-label>
                      <p>Final del día</p>
                      <h3>{{ daySummary.endTime }}</h3>
                    </ion-label>
                  </ion-item>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </section>

      <!-- popovers -->
      <ion-popover
        :is-open="showDatePicker"
        :event="datePickerEvent"
        :keep-contents-mounted="true"
        @did-dismiss="showDatePicker = false"
      >
        <ion-content class="centered-popover">
          <ion-datetime
            :value="budgetController.getSelectedDate()"
            presentation="date"
            @ion-change="onDateSelected"
          ></ion-datetime>
          <ion-item>
            <ion-button
              slot="end"
              fill="clear"
              color="primary"
              size="small"
              @click="goToToday"
            >
              Hoy
            </ion-button>
          </ion-item>
        </ion-content>
      </ion-popover>

      <ion-popover
        :is-open="showMoreOptions"
        :event="moreOptionsEvent"
        :keep-contents-mounted="true"
        :dismiss-on-select="true"
        @did-dismiss="showMoreOptions = false"
      >
        <ion-content>
            <ion-item button @click="openDaySummaryModal">
              <ion-icon slot="start" :icon="timeOutline" color="primary"></ion-icon>
              <ion-label>Resumen del día</ion-label>
            </ion-item>
            <ion-item button @click="confirmClearDay">
              <ion-icon
                slot="start"
                :icon="trashOutline"
                color="danger"
              ></ion-icon>
              <ion-label>Vaciar día</ion-label>
            </ion-item>
            <ion-item v-if="isDev" button @click="insertTestData">
              <ion-icon
                slot="start"
                :icon="addOutline"
                color="success"
              ></ion-icon>
              <ion-label color="success">Insertar datos prueba</ion-label>
            </ion-item>
          </ion-content>
        </ion-popover>
        
        <ion-modal :is-open="showDaySummaryModal" @did-dismiss="showDaySummaryModal=false">
          <day-summary-modal @close="showDaySummaryModal=false" />
        </ion-modal>
      <!-- end popovers -->

      <!-- alerts -->
      <ion-alert
        :is-open="showClearConfirm"
        header="Vaciar día"
        message="¿Deseas eliminar todos los proveedores e ingresos de la fecha seleccionada?"
        :buttons="[
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => (showClearConfirm = false),
          },
          { text: 'Vaciar', cssClass: 'danger', handler: performClearDay },
        ]"
        @did-dismiss="showClearConfirm = false"
      ></ion-alert>
      <!-- end alerts -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import {
  IonSegment,
  IonSegmentButton,
  IonButton,
  IonButtons,
  IonMenuButton,
  IonCol,
  IonContent,
  IonDatetime,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonPage,
  IonPopover,
  IonRow,
  IonTitle,
  IonToolbar,
    IonAlert,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonListHeader,
  IonNote,
} from '@ionic/vue';
import { computed, ref, onMounted } from 'vue';
import {
  chevronBackOutline,
  chevronForwardOutline,
  ellipsisVerticalOutline,
  trashOutline,
  addOutline,
  timeOutline,
} from 'ionicons/icons';
import { format } from 'date-fns';
import { parseLocalDate, formatLocalDate } from '@/utils/date';
import { es as esLocale } from 'date-fns/locale';
// End Imports

// Controllers
import systemController from '@/controllers/systemConfigController';
import budgetController from '@/controllers/budgetController';
import accountsController from '@/controllers/accountsController';
import {
  AccountsController,
  type Account,
} from '@/controllers/accountsController';
import type { Income, Provider } from '@/stores/budgetStore';
import type { PaymentType } from '@/stores/budgetStore';
// End Controllers

// Components
import InicioViewComponent from './InicioViewComponent.vue';
import ProvidersComponent from './ProvidersComponent.vue';
import DaySummaryModal from './components/DaySummaryModal.vue';
// FinishDayForm removed (day-close flow deleted)
// End Components

// Vars
const activeView = ref<'inicio' | 'proveedores' | 'resumen'>('inicio');
  const showDatePicker = ref(false);
  const showMoreOptions = ref(false);
  const showDaySummaryModal = ref(false);
const showClearConfirm = ref(false);
const datePickerEvent = ref<Event | null>(null);
const moreOptionsEvent = ref<Event | null>(null);
const designMode = computed(() => systemController.getDesignMode());
const isDev = computed(() => import.meta.env.DEV);

// End Vars

// Functions
// finish-day flow removed

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

function openDatePicker(params: { event: Event }) {
  const { event } = params;
  datePickerEvent.value = event;
  showDatePicker.value = true;
}

  function openMoreOptions(params: { event: Event }) {
    const { event } = params;
    moreOptionsEvent.value = event;
    showMoreOptions.value = true;
  }

  function openDaySummaryModal() {
    showMoreOptions.value = false;
    showDaySummaryModal.value = true;
  }

function onDateSelected(e: CustomEvent) {
  const value = e.detail?.value;
  if (value) {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    budgetController.setDate({ date: `${y}-${m}-${day}` });
    showDatePicker.value = false;
  }

  function goBack() {
    const current = budgetController.getSelectedDate();
    const d = parseLocalDate({ d: current });
    d.setDate(d.getDate() - 1);
    budgetController.setDate({ date: formatLocalDate({ d }) });
  }

  function goForward() {
    const current = budgetController.getSelectedDate();
    const d = parseLocalDate({ d: current });
    d.setDate(d.getDate() + 1);
    budgetController.setDate({ date: formatLocalDate({ d }) });
  }

  function goToToday() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    budgetController.setDate({ date: `${y}-${m}-${day}` });
    showDatePicker.value = false;
  }

  function confirmClearDay() {
    showMoreOptions.value = false;
    showClearConfirm.value = true;
  }

  function performClearDay() {
    budgetController.clearDay();
    budgetController.saveData();
    showClearConfirm.value = false;
  }

    async function insertTestData() {
    const accountsCtrl = new AccountsController();

    try {
      await accountsCtrl.loadAll();
    } catch {}

    let accounts = accountsCtrl.getAccounts();

    if (accounts.length === 0) {
      const now = Date.now();
      const acc1: Account = {
        id: Date.now() + 1,
        name: 'Caja Principal',
        initialBalance: 0,
        createdAt: now,
        updatedAt: now,
      };
      const acc2: Account = {
        id: Date.now() + 2,
        name: 'Banco',
        initialBalance: 0,
        createdAt: now,
        updatedAt: now,
      };
      await accountsCtrl.addAccount({
        account: { name: 'Caja Principal', initialBalance: 0 },
      });
      await accountsCtrl.addAccount({
        account: { name: 'Banco', initialBalance: 0 },
      });
      accounts = [acc1, acc2];
    }

    const accountId1 = accounts[0].id;
    const accountId2 = accounts.length > 1 ? accounts[1].id : accountId1;

    budgetController.addIngreso({
      name: 'Venta mostrador 1',
      amount: 1500,
      paymentType: 'cash',
      accountId: accountId1,
    });
    budgetController.addIngreso({
      name: 'Venta mostrador 2',
      amount: 2300,
      paymentType: 'digital',
      accountId: accountId2,
    });
    budgetController.addIngreso({
      name: 'Venta online',
      amount: 4500,
      paymentType: 'cash',
      accountId: accountId1,
    });
    budgetController.addIngreso({
      name: 'Pedido mayorista',
      amount: 12000,
      paymentType: 'digital',
      accountId: accountId2,
    });
    budgetController.addIngreso({
      name: 'Venta telefónica',
      amount: 3500,
      paymentType: 'cash',
      accountId: accountId1,
    });

    budgetController.addEgreso({
      name: 'Compra inventario',
      amount: 8000,
      paymentType: 'cash',
      accountId: accountId1,
    });
    budgetController.addEgreso({
      name: 'Pago servicios',
      amount: 2500,
      paymentType: 'digital',
      accountId: accountId2,
    });
    budgetController.addEgreso({
      name: 'Transporte',
      amount: 800,
      paymentType: 'cash',
      accountId: accountId1,
    });

    budgetController.addProvider({
      name: 'Proveedor A',
      estimated: 500,
      accountId: accountId1,
    });
    budgetController.addProvider({
      name: 'Proveedor B',
      estimated: 800,
      accountId: accountId2,
    });
    budgetController.addProvider({
      name: 'Proveedor C',
      estimated: 1200,
      accountId: accountId1,
    });
    budgetController.addProvider({
      name: 'Proveedor D',
      estimated: 600,
      accountId: accountId2,
    });
    budgetController.addProvider({
      name: 'Proveedor E',
      estimated: 950,
      accountId: accountId1,
    });
    budgetController.addProvider({
      name: 'Proveedor F',
      estimated: 1500,
      accountId: accountId2,
    });
    budgetController.addProvider({
      name: 'Proveedor G',
      estimated: 450,
      accountId: accountId1,
    });

    budgetController.saveData();
    showMoreOptions.value = false;
    }

  // End Functions

  // Life cycle
  onMounted(async () => {
    await budgetController.loadDataForCurrentDate();
  });

  // End Life cycle

  // Computed
// finish-day related computed values removed

  const daySummary = computed(() => {
    const entries = budgetController.getEntries();
    const providers = budgetController.getProviders();

    const ingresos = entries.filter((e: Income) => e.entryType === 'ingreso');
    const egresos = entries.filter((e: Income) => e.entryType === 'egreso');

    const totalIncome = ingresos.reduce(
      (sum: number, e: Income) => sum + Number(e.amount || 0),
      0
    );
    const totalExpense = egresos.reduce(
      (sum: number, e: Income) => sum + Number(e.amount || 0),
      0
    );
    const totalEstimated = providers.reduce(
      (sum: number, p: Provider) => sum + Number(p.estimated || 0),
      0
    );

    const allTimestamps = entries
      .map((e: Income) => Number(e.createdAt))
      .filter((t: number) => t > 0)
      .sort((a: number, b: number) => a - b);

    const startTime =
      allTimestamps.length > 0
        ? formatTime({ timestamp: allTimestamps[0] })
        : '--:--';
    const endTime =
      allTimestamps.length > 0
        ? formatTime({ timestamp: allTimestamps[allTimestamps.length - 1] })
        : '--:--';

    return {
      providersCount: providers.length,
      providers,
      incomeCount: ingresos.length,
      incomes: ingresos,
      expenseCount: egresos.length,
      expenses: egresos,
      totalIncome,
      totalExpense,
      totalEstimated,
      balance: totalIncome - totalExpense,
      startTime,
      endTime,
    };
  });

  const formattedSelectedDate = computed(() => {
    try {
      const d = parseLocalDate({ d: budgetController.getSelectedDate() });
      if (isNaN(d.getTime())) return budgetController.getSelectedDate();
      return format(d, "d 'de' MMMM 'de' yyyy", { locale: esLocale });
    } catch {
      return budgetController.getSelectedDate();
    }
  });

  // End Computed
}
</script>
