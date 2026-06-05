<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>

        <ion-title>Presupuesto </ion-title>

        <ion-buttons slot="end">
          <ion-button v-if="pendingRecurringRecords.length > 0" @click="showPendingModal = true">
            <ion-icon :icon="timeOutline"></ion-icon>
            <ion-badge color="warning" slot="end">{{ pendingRecurringRecords.length }}</ion-badge>
          </ion-button>
          <ion-button @click="openMoreOptions({ event: $event })">
            <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- content -->
      <section>
        <ion-grid>
          <ion-row class="ion-justify-content-center">
            <ion-col size="8">
              <section class="ion-padding-top">
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
              </section>

              <section>
                <template v-if="isDataLoaded">
                  <InicioViewComponent />
                </template>
              </section>
            </ion-col>
          </ion-row>
        </ion-grid>
      </section>
      <!-- end content -->

      <!-- modals -->
      <PendingRecurringModal
        :is-open="showPendingModal"
        :records="pendingRecurringRecords"
        @close="showPendingModal = false"
        @apply="applySinglePendingRecord"
        @apply-all="applyAllPendingRecords"
      />
      <!-- end modals -->

      <!-- popovers -->
      <ion-popover
        :is-open="showDatePicker"
        :event="datePickerEvent"
        keep-contents-mounted
        @did-dismiss="showDatePicker = false"
      >
        <ion-content class="centered-popover">
          <ion-datetime
            :value="budgetDayStore.selectedDate"
            presentation="date"
            @ion-change="onDateSelected"
          ></ion-datetime>
          <ion-item>
            <ion-button slot="end" fill="clear" color="primary" size="small" @click="goToToday">
              Hoy
            </ion-button>
          </ion-item>
        </ion-content>
      </ion-popover>

      <ion-popover
        :is-open="showMoreOptions"
        :event="moreOptionsEvent"
        :dismiss-on-select="true"
        @did-dismiss="showMoreOptions = false"
      >
        <ion-content>
          <ion-item button @click="confirmClearDay">
            <ion-icon slot="start" :icon="trashOutline" color="danger"></ion-icon>
            <ion-label>Vaciar día</ion-label>
          </ion-item>
          <ion-item v-if="isDev" button @click="insertTestData">
            <ion-icon slot="start" :icon="addOutline" color="success"></ion-icon>
            <ion-label color="success">Insertar datos prueba</ion-label>
          </ion-item>
        </ion-content>
      </ion-popover>
      <!-- end popovers -->

      <!-- alerts -->
      <ion-alert
        :is-open="showClearConfirm"
        header="Vaciar día"
        message="¿Deseas eliminar todos los registros de la fecha seleccionada?"
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

<script lang="ts" setup>
// imports
import {
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
  onIonViewWillEnter,
  onIonViewWillLeave,
} from '@ionic/vue';
import {
  chevronBackOutline,
  chevronForwardOutline,
  ellipsisVerticalOutline,
  trashOutline,
  addOutline,
  timeOutline,
} from 'ionicons/icons';
import { computed, ref } from 'vue';
import { format } from 'date-fns';
import { parseLocalDate, formatLocalDate } from '@/utils/date';
import { es as esLocale } from 'date-fns/locale';
// end imports

// controllers
import systemController from '@/controllers/systemConfigController';
import budgetEntriesController from '@/controllers/budgetEntriesController';
import budgetProvidersController from '@/controllers/budgetProvidersController';
import accountsController from '@/controllers/accountsController';
import { AccountsController } from '@/controllers/accountsController';
import { recurringRecordsController, type RecurringRecord } from '@/controllers/recurringRecordsController';
import { isDueOnDate, shouldAutoInsert } from '@/composables/useRecurrence';
import { useBudgetDayStore } from '@/stores/budgetDayStore';
import { useBudgetEntriesStore } from '@/stores/budgetEntriesStore';
import { useBudgetProvidersStore } from '@/stores/budgetProvidersStore';
import attachmentService from '@/services/attachmentService';
import pendingAttachmentsService from '@/services/pendingAttachmentsService';
// end controllers

// components
import InicioViewComponent from './entries/InicioViewComponent.vue';
import PendingRecurringModal from './components/PendingRecurringModal.vue';
// end components

// interface and types imports
// end interface and types imports

// main
// end main

// vars and const
const showDatePicker = ref(false);
const showMoreOptions = ref(false);
const showClearConfirm = ref(false);
const datePickerEvent = ref<Event | null>(null);
const moreOptionsEvent = ref<Event | null>(null);
const isDataLoaded = ref(false);
const designMode = computed(() => systemController.getDesignMode());
const isDev = computed(() => import.meta.env.DEV);
const pendingRecurringRecords = ref<RecurringRecord[]>([]);
const showPendingModal = ref(false);
const recurringTimer = ref<ReturnType<typeof setInterval> | null>(null);
const repairRan = ref(false);
// end vars and const

// watch
// end

// computed
const budgetDayStore = useBudgetDayStore();
const formattedSelectedDate = computed(() => {
  try {
    const d = parseLocalDate({ d: budgetDayStore.selectedDate });
    if (isNaN(d.getTime())) return budgetDayStore.selectedDate;
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: esLocale });
  } catch {
    return budgetDayStore.selectedDate;
  }
});
// end computed

// onIonViewWillEnter
  onIonViewWillEnter(async () => {
    try {
      await accountsController.loadAll();
      await budgetDayStore.loadBudgetForDate({ date: budgetDayStore.selectedDate });
      if (!repairRan.value) {
        await recurringRecordsController.repairRecords();
        repairRan.value = true;
      }
      await processRecurringForDate();
      isDataLoaded.value = true;
    } catch (error) {
      console.error('Failed to load budget data:', error);
      isDataLoaded.value = true;
    }
  });
// end onIonViewWillEnter

// onIonViewWillLeave
onIonViewWillLeave(() => {
  stopRecurringTimer();
});
// end onIonViewWillLeave

// functions
// NOTE: functions must follow the structure of named parameters
// The parameters of the function must be accessed using object destructuring
// Example
// function prueba(params:{nombre:string,apellido:string,edad:number}) {
// const {nombre,apellido,edad}=params
// }
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

async function onDateSelected(e: CustomEvent) {
  const value = e.detail?.value;
  if (value) {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    budgetDayStore.setSelectedDate(dateStr);
    await budgetDayStore.loadBudgetForDate({ date: dateStr });
    showDatePicker.value = false;
    setTimeout(async () => {
      await processRecurringForDate();
    }, 50);
  }
}

async function goBack() {
  const current = budgetDayStore.selectedDate;
  const d = parseLocalDate({ d: current });
  d.setDate(d.getDate() - 1);
  const dateStr = formatLocalDate({ d });
  budgetDayStore.setSelectedDate(dateStr);
  await budgetDayStore.loadBudgetForDate({ date: dateStr });
  setTimeout(async () => {
    await processRecurringForDate();
  }, 50);
}

async function goForward() {
  const current = budgetDayStore.selectedDate;
  const d = parseLocalDate({ d: current });
  d.setDate(d.getDate() + 1);
  const dateStr = formatLocalDate({ d });
  budgetDayStore.setSelectedDate(dateStr);
  await budgetDayStore.loadBudgetForDate({ date: dateStr });
  setTimeout(async () => {
    await processRecurringForDate();
  }, 50);
}

async function goToToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${day}`;
  budgetDayStore.setSelectedDate(dateStr);
  await budgetDayStore.loadBudgetForDate({ date: dateStr });
  showDatePicker.value = false;
  setTimeout(async () => {
    await processRecurringForDate();
  }, 50);
}

async function deduplicateRecurringEntries(): Promise<void> {
  const existingEntries = budgetEntriesController.getEntries();
  const existingProviders = budgetProvidersController.getProviders();
  const entryRecurringIds = new Set<string>();
  const providerRecurringIds = new Set<string>();
  let hadDuplicates = false;

  for (const e of existingEntries) {
    if (e._fromRecurringId) {
      if (entryRecurringIds.has(e._fromRecurringId)) {
        budgetEntriesController.removeEntry({ id: e.id });
        console.warn('[recurring] dedup: removed duplicate entry', e.id, e._fromRecurringId);
        hadDuplicates = true;
      } else {
        entryRecurringIds.add(e._fromRecurringId);
      }
    }
  }
  for (const p of existingProviders) {
    if (p._fromRecurringId) {
      if (providerRecurringIds.has(p._fromRecurringId)) {
        budgetProvidersController.removeProvider({ id: p.id });
        console.warn('[recurring] dedup: removed duplicate provider', p.id, p._fromRecurringId);
        hadDuplicates = true;
      } else {
        providerRecurringIds.add(p._fromRecurringId);
      }
    }
  }

  if (hadDuplicates) {
    await budgetDayStore.saveBudgetData();
  }
}

async function processRecurringForDate() {
  try {
    const dateStr = budgetDayStore.selectedDate;
    if (!dateStr) return;

    await deduplicateRecurringEntries();

    const existingEntries = budgetEntriesController.getEntries();
    const existingProviders = budgetProvidersController.getProviders();
    const records = await recurringRecordsController.getActiveRecords();
    const pendientes: RecurringRecord[] = [];

    for (const record of records) {
      if (!isDueOnDate({ record, dateStr })) continue;

      const auto = shouldAutoInsert({ record, dateStr });

      if (auto) {
        const syncId = record.sync_id;
        if (!syncId) {
          console.warn('[recurring] SKIP — missing sync_id for', record.name);
          pendientes.push(record);
          continue;
        }

        if (record.type === 'cargo') {
          const alreadyExists = existingEntries.some(
            (e) => e._fromRecurringId === syncId,
          );
          if (alreadyExists) continue;
          if (record.entryType === 'ingreso') {
            await budgetEntriesController.addIngreso({
              name: record.name,
              amount: record.amount || 0,
              accountId: record.accountId,
              _fromRecurringId: syncId,
            });
          } else {
            await budgetEntriesController.addEgreso({
              name: record.name,
              amount: record.amount || 0,
              accountId: record.accountId,
              _fromRecurringId: syncId,
            });
          }
        } else {
          const alreadyExists = existingProviders.some(
            (p) => p._fromRecurringId === syncId,
          );
          if (alreadyExists) continue;
          await budgetProvidersController.addProvider({
            name: record.name,
            estimated: record.estimated,
            accountId: Number(record.accountId) || 0,
            _fromRecurringId: syncId,
            products: record.products?.map((p) => ({
              id: p.supplierProductId ? String(p.supplierProductId) : undefined,
              productName: p.productName,
              productPrice: p.productPrice,
              quantity: p.quantity,
            })),
            items: record.items?.map((i) => ({
              amount: Number(i.amount),
              accountId: typeof i.accountId === 'object' && i.accountId
                ? (i.accountId as { id: string | number }).id
                : (i.accountId ?? null) as string | number | null,
            })),
          });
        }
      } else {
        pendientes.push(record);
      }
    }
    await budgetDayStore.saveBudgetData();

    pendingRecurringRecords.value = pendientes;
    if (pendientes.some((r) => r.autoInsert && r.time)) {
      startRecurringTimer();
    } else {
      stopRecurringTimer();
    }
  } catch (error) {
    console.error('Failed to process recurring records:', error);
  }
}

function startRecurringTimer() {
  if (recurringTimer.value) return;
  recurringTimer.value = setInterval(async () => {
    await processRecurringForDate();
  }, 60000);
}

function stopRecurringTimer() {
  if (recurringTimer.value) {
    clearInterval(recurringTimer.value);
    recurringTimer.value = null;
  }
}

function confirmClearDay() {
  showMoreOptions.value = false;
  showClearConfirm.value = true;
}

async function performClearDay() {
  // Eliminar adjuntos de todas las entradas del día
  const entries = budgetEntriesController.getEntries();
  for (const entry of entries) {
    if (entry.sync_id) {
      try {
        // Eliminar adjuntos del backend
        const response = await attachmentService.listAttachments(entry.sync_id);
        for (const attachment of response.data) {
          await attachmentService.deleteAttachment(attachment.id);
        }
      } catch (error) {
        console.error('Failed to delete attachments for entry:', entry.sync_id, error);
      }

      // Eliminar archivos pendientes de localStorage
      pendingAttachmentsService.removePendingAttachment(entry.sync_id);
    }
  }

  // Eliminar entradas del día
  budgetEntriesController.getStore().clearEntries();
  budgetProvidersController.getStore().clearProviders();
  budgetDayStore.isDayClosed = false;
  await budgetDayStore.saveBudgetData();
  showClearConfirm.value = false;
}

async function insertTestData() {
  const accountsCtrl = new AccountsController();

  try {
    await accountsCtrl.loadAll();
  } catch (error) {
    console.error(error);
  }

  let accounts = accountsCtrl.getAccounts();

  if (accounts.length === 0) {
    await accountsCtrl.addAccount({
      account: { name: 'Caja Principal', initialBalance: 0 },
    });
    await accountsCtrl.addAccount({
      account: { name: 'Banco', initialBalance: 0 },
    });
    accounts = accountsCtrl.getAccounts();
  }

  const accountId1 = accounts[0].id;
  const accountId2 = accounts[1]?.id ?? accountId1;

  await budgetEntriesController.addIngreso({
    name: 'Venta mostrador 1',
    amount: 1500,
    paymentType: 'cash',
    accountId: accountId1,
  });
  await budgetEntriesController.addIngreso({
    name: 'Venta mostrador 2',
    amount: 2300,
    paymentType: 'digital',
    accountId: accountId2,
  });
  await budgetEntriesController.addIngreso({
    name: 'Venta online',
    amount: 4500,
    paymentType: 'cash',
    accountId: accountId1,
  });
  await budgetEntriesController.addIngreso({
    name: 'Pedido mayorista',
    amount: 12000,
    paymentType: 'digital',
    accountId: accountId2,
  });
  await budgetEntriesController.addIngreso({
    name: 'Venta telefónica',
    amount: 3500,
    paymentType: 'cash',
    accountId: accountId1,
  });

  await budgetEntriesController.addEgreso({
    name: 'Compra inventario',
    amount: 8000,
    paymentType: 'cash',
    accountId: accountId1,
  });
  await budgetEntriesController.addEgreso({
    name: 'Pago servicios',
    amount: 2500,
    paymentType: 'digital',
    accountId: accountId2,
  });
  await budgetEntriesController.addEgreso({
    name: 'Transporte',
    amount: 800,
    paymentType: 'cash',
    accountId: accountId1,
  });

  await budgetProvidersController.addProvider({
    name: 'Proveedor A',
    estimated: 500,
    accountId: Number(accountId1),
  });
  await budgetProvidersController.addProvider({
    name: 'Proveedor B',
    estimated: 800,
    accountId: Number(accountId2),
  });
  await budgetProvidersController.addProvider({
    name: 'Proveedor C',
    estimated: 1200,
    accountId: Number(accountId1),
  });
  await budgetProvidersController.addProvider({
    name: 'Proveedor D',
    estimated: 600,
    accountId: Number(accountId2),
  });
  await budgetProvidersController.addProvider({
    name: 'Proveedor E',
    estimated: 950,
    accountId: Number(accountId1),
  });
  await budgetProvidersController.addProvider({
    name: 'Proveedor F',
    estimated: 1500,
    accountId: Number(accountId2),
  });
  await budgetProvidersController.addProvider({
    name: 'Proveedor G',
    estimated: 450,
    accountId: Number(accountId1),
  });

  await budgetDayStore.saveBudgetData();
  showMoreOptions.value = false;
}

async function applySinglePendingRecord(params: { record: RecurringRecord }) {
  const { record } = params;
  const syncId = record.sync_id || '';
  const dateStr = budgetDayStore.selectedDate;

  if (record.type === 'cargo') {
    if (record.entryType === 'ingreso') {
      await budgetEntriesController.addIngreso({
        name: record.name,
        amount: record.amount || 0,
        accountId: record.accountId,
        date: dateStr || undefined,
        _fromRecurringId: syncId,
      });
    } else {
      await budgetEntriesController.addEgreso({
        name: record.name,
        amount: record.amount || 0,
        accountId: record.accountId,
        date: dateStr || undefined,
        _fromRecurringId: syncId,
      });
    }
  } else {
    await budgetProvidersController.addProvider({
      name: record.name,
      estimated: record.estimated,
      accountId: Number(record.accountId) || 0,
      date: dateStr || undefined,
      _fromRecurringId: syncId,
      products: record.products?.map((p) => ({
        id: p.supplierProductId ? String(p.supplierProductId) : undefined,
        productName: p.productName,
        productPrice: p.productPrice,
        quantity: p.quantity,
      })),
      items: record.items?.map((i) => ({
        amount: Number(i.amount),
        accountId:
          typeof i.accountId === 'object' && i.accountId
            ? (i.accountId as { id: string | number }).id
            : (i.accountId ?? null) as string | number | null,
      })),
    });
  }

  await budgetDayStore.saveBudgetData();
  const idx = pendingRecurringRecords.value.findIndex((r) => r.id === record.id);
  if (idx !== -1) pendingRecurringRecords.value.splice(idx, 1);
  if (pendingRecurringRecords.value.length === 0) showPendingModal.value = false;
}

async function applyAllPendingRecords() {
  const records = [...pendingRecurringRecords.value];
  for (const record of records) {
    await applySinglePendingRecord({ record });
  }
  showPendingModal.value = false;
}
// end functions
</script>
