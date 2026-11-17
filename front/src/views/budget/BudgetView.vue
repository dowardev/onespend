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

        <ion-title>{{ t('budget.budgetview.title') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button v-if="pendingRecurringRecords.length > 0" @click="showPendingModal = true">
            <ion-icon :icon="timeOutline"></ion-icon>
            <ion-badge slot="end" color="warning">{{ pendingRecurringRecords.length }}</ion-badge>
          </ion-button>
          <ion-button v-if="isDev" @click="generateRandomData">
            <ion-icon :icon="diceOutline"></ion-icon>
          </ion-button>
          <ion-button @click="openMoreOptions({ event: $event })">
            <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- content -->
      <section class="budget-content">
        <section class="budget-body">
          <template v-if="isDataLoaded">
            <InicioViewComponent @open-date-picker="(e: Event) => openDatePicker({ event: e })" />
          </template>
        </section>
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
        <ion-content>
          <ion-datetime
            :value="budgetDayStore.selectedDate"
            presentation="date"
            @ion-change="onDateSelected"
          ></ion-datetime>
          <ion-item>
            <ion-button slot="end" fill="clear" color="primary" size="small" @click="goToToday">
              {{ t('common.today') }}
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
            <ion-label>{{ t('budget.budgetview.clearDayLabel') }}</ion-label>
          </ion-item>
        </ion-content>
      </ion-popover>
      <!-- end popovers -->

      <!-- alerts -->
      <ion-alert
        :is-open="showClearConfirm"
        :header="t('budget.budgetview.clearDayHeader')"
        :message="t('budget.budgetview.clearDayMessage')"
        :buttons="[
          {
            text: t('common.cancel'),
            role: 'cancel',
            handler: () => (showClearConfirm = false),
          },
          { text: t('budget.budgetview.clearDayConfirm'), cssClass: 'danger', handler: performClearDay },
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
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonPage,
  IonPopover,
  IonTitle,
  IonToolbar,
  IonAlert,
  onIonViewWillEnter,
  toastController,
} from '@ionic/vue';
import {
  chevronBackOutline,
  chevronForwardOutline,
  diceOutline,
  ellipsisVerticalOutline,
  trashOutline,
  timeOutline,
} from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useLocale } from '@/composables/useLocale';
import { format, addDays } from 'date-fns';
import { getDateFnsLocale } from '@/i18n';
import { parseLocalDate, formatLocalDate } from '@/utils/date';
import { faker } from '@faker-js/faker';
// end imports

// controllers
import systemController from '@/controllers/systemConfigController';
import budgetEntriesController from '@/controllers/budgetEntriesController';
import budgetProvidersController from '@/controllers/budgetProvidersController';
import accountsController from '@/controllers/accountsController';
import { SuppliersController, type Supplier } from '@/controllers/suppliersController';
import {
  recurringRecordsController,
  type RecurringRecord,
} from '@/controllers/recurringRecordsController';
import {
  processRecurringForDate,
  pendingRecurringRecords,
} from '@/services/recurringProcessor';
import { useBudgetDay } from '@/composables/useBudgetDay';
import attachmentService from '@/services/attachmentService';
import pendingAttachmentsService from '@/services/pendingAttachmentsService';
import { dataMediator } from '@/services/dataMediator';
import { SyncController } from '@/controllers/syncController';
const syncController = SyncController;
const { t } = useLocale();
// end controllers

// components
import InicioViewComponent from './entries/InicioViewComponent.vue';
import PendingRecurringModal from './components/PendingRecurringModal.vue';
// end components

// interface and types imports
import type { PaymentType } from '@/controllers/budgetEntriesController';
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
const showPendingModal = ref(false);
const repairRan = ref(false);
// end vars and const

// watch
// end

// computed
const budgetDayStore = useBudgetDay();
const formattedSelectedDate = computed(() => {
  try {
    const d = parseLocalDate({ d: budgetDayStore.selectedDate });
    if (isNaN(d.getTime())) return budgetDayStore.selectedDate;
    return format(d, t('common.dateLongFormat'), { locale: getDateFnsLocale() });
  } catch {
    return budgetDayStore.selectedDate;
  }
});
// end computed

// onIonViewWillEnter
onIonViewWillEnter(async () => {
  try {
    // 1. Local data only — what the UI needs to paint (Dexie, offline-first).
    await dataMediator.reloadAll();
    await accountsController.loadAll();
    await budgetDayStore.loadBudgetForDate({ date: budgetDayStore.selectedDate });

    // Paint immediately with local data; never block rendering on network.
    isDataLoaded.value = true;

    // 2. Background work (pull / repair / recurring processor) — the UI must
    //    render first and update reactively when data arrives.
    void (async () => {
      try {
        await syncController.pullFromServer();
      } catch {
        // background pull; don't block view rendering
      }
      if (!repairRan.value) {
        await recurringRecordsController.repairRecords();
        repairRan.value = true;
      }
      await processRecurringForDate(budgetDayStore.selectedDate);
    })();
  } catch (error) {
    console.error('Failed to load budget data:', error);
    isDataLoaded.value = true;
  }
});
// end onIonViewWillEnter

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
      await processRecurringForDate(budgetDayStore.selectedDate);
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
    await processRecurringForDate(budgetDayStore.selectedDate);
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
    await processRecurringForDate(budgetDayStore.selectedDate);
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
    await processRecurringForDate(budgetDayStore.selectedDate);
  }, 50);
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
      await pendingAttachmentsService.removePendingAttachment(entry.sync_id);
    }
  }

  // Eliminar entradas del día
  budgetEntriesController.getStore().clearEntries();
  budgetProvidersController.getStore().clearProviders();

  showClearConfirm.value = false;
}

async function generateRandomData() {
  const days = 30;
  const halfRange = 15;
  const startDate = budgetDayStore.selectedDate;
  if (!startDate) return;

  // 1. Ensure at least 2 accounts
  let accountIds = await getRandomAccountIds();
  if (accountIds.length < 2) {
    const existingNames = (await accountsController.loadAll()).map((a) => String(a.name));
    if (!existingNames.includes('Caja Principal')) {
      await accountsController.addAccount({
        account: { name: 'Caja Principal', initialBalance: 0 },
      });
    }
    if (!existingNames.includes('Banco')) {
      await accountsController.addAccount({ account: { name: 'Banco', initialBalance: 0 } });
    }
    accountIds = await getRandomAccountIds();
    if (accountIds.length < 2) {
      await accountsController.addAccount({
        account: { name: 'Caja Principal', initialBalance: 0 },
      });
      await accountsController.addAccount({ account: { name: 'Banco', initialBalance: 0 } });
      accountIds = await getRandomAccountIds();
      if (accountIds.length === 0) {
        const toast = await toastController.create({
          message: t('budget.budgetview.message'),
          duration: 3000,
          position: 'bottom',
          color: 'danger',
        });
        await toast.present();
        return;
      }
    }
  }

  // 2. Ensure at least 3 catalog suppliers
  const suppliersCtrl = new SuppliersController();
  let catalogSuppliers = [...(suppliersCtrl.getSuppliers() as Supplier[])];
  if (catalogSuppliers.length < 3) {
    const sampleNames = ['Verdulería del Barrio', 'Carnicería Don Pepe', 'Panadería La Espiga'];
    const toCreate = 3 - catalogSuppliers.length;
    for (let k = 0; k < toCreate; k++) {
      const name = sampleNames[k] || `Proveedor ${faker.company.name().split(' ')[0]}`;
      const created = await suppliersCtrl.addSupplier({ s: { name, products: [] } });
      if (created) catalogSuppliers.push(created);
    }
    // Force reload store so liveQuery catches up for subsequent reads
    await suppliersCtrl.getStore().reload();
  }

  // 3. Toast
  const toast = await toastController.create({
    message: `Generando datos aleatorios para ${days} días...`,
    duration: 0,
    position: 'bottom',
  });
  await toast.present();

  const paymentTypes: PaymentType[] = ['cash', 'digital'];
  const ingresoCategories = [
    'Venta de',
    'Servicio de',
    'Cobro por',
    'Honorarios de',
    'Comisión por',
    'Renta de',
    'Consultoría de',
  ];
  const ingresoItems = [
    'productos',
    'mercancía',
    'servicios profesionales',
    'asesoría legal',
    'diseño gráfico',
    'desarrollo web',
    'consultoría',
    'capacitación',
    'mantenimiento',
    'instalación',
    'transporte',
    'logística',
  ];
  const egresoItems = [
    'Compra de',
    'Pago de',
    'Renta de',
    'Mantenimiento de',
    'Suscripción de',
    'Servicio de',
    'Suministro de',
  ];
  const egresoCategories = [
    'materiales',
    'insumos',
    'oficina',
    'electricidad',
    'agua',
    'internet',
    'telefonía',
    'seguros',
    'transporte',
    'combustible',
    'publicidad',
    'marketing',
    'hosting',
    'software',
    'equipo',
  ];

  let successCount = 0;
  let failCount = 0;

  for (let offset = -halfRange; offset < halfRange; offset++) {
    try {
      const date = format(addDays(parseLocalDate({ d: startDate }), offset), 'yyyy-MM-dd');

      budgetDayStore.setSelectedDate(date);
      await budgetDayStore.loadBudgetForDate({ date });

      // Generate ingresos (3-8)
      const ingresoCount = faker.number.int({ min: 3, max: 8 });
      for (let j = 0; j < ingresoCount; j++) {
        const category = faker.helpers.arrayElement(ingresoCategories);
        const item = faker.helpers.arrayElement(ingresoItems);
        const name = `${category} ${item}`;
        const amount = faker.number.int({ min: 500, max: 20000 });
        const paymentType = faker.helpers.arrayElement(paymentTypes);
        const accountId = faker.helpers.arrayElement(accountIds);

        await budgetEntriesController.addIngreso({ name, amount, paymentType, accountId, date });
      }

      // Generate egresos (2-6)
      const egresoCount = faker.number.int({ min: 2, max: 6 });
      for (let j = 0; j < egresoCount; j++) {
        const prefix = faker.helpers.arrayElement(egresoItems);
        const category = faker.helpers.arrayElement(egresoCategories);
        const name = `${prefix} ${category}`;
        const amount = faker.number.int({ min: 100, max: 10000 });
        const paymentType = faker.helpers.arrayElement(paymentTypes);
        const accountId = faker.helpers.arrayElement(accountIds);

        await budgetEntriesController.addEgreso({ name, amount, paymentType, accountId, date });
      }

      // Generate proveedores (1-4)
      const providerCount = faker.number.int({ min: 1, max: 4 });
      for (let j = 0; j < providerCount; j++) {
        const supplier = faker.helpers.arrayElement(catalogSuppliers);
        const name = supplier.name;
        const estimated = faker.number.int({ min: 200, max: 5000 });
        const accountId = Number(faker.helpers.arrayElement(accountIds));

        await budgetProvidersController.addProvider({
          name,
          estimated,
          accountId,
          date,
          _supplierId: supplier.sync_id,
          _supplierName: supplier.name,
          _supplier: supplier,
        });
      }

      successCount++;
      console.log(`[generateRandomData] Día ${date}: OK`);
    } catch (e) {
      failCount++;
      console.error('[generateRandomData] Error en día', offset, e);
    }
  }

  // Restore original selected date
  budgetDayStore.setSelectedDate(startDate);
  await budgetDayStore.loadBudgetForDate({ date: startDate });

  await toast.dismiss();
  const color = failCount > 0 ? (successCount > 0 ? 'warning' : 'danger') : 'success';
  const message =
    failCount > 0
      ? `Generados ${successCount}/${days} días (${failCount} fallos)`
      : `Datos generados para ${days} días`;

  const resultToast = await toastController.create({
    message,
    duration: 4000,
    position: 'bottom',
    color,
  });
  await resultToast.present();
}

async function getRandomAccountIds(): Promise<(string | number)[]> {
  try {
    const accounts = await accountsController.loadAll();
    if (accounts.length === 0) return [];
    return accounts.map((a) => a.id);
  } catch {
    return [];
  }
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
            : ((i.accountId ?? null) as string | number | null),
      })),
    });
  }

  const idx = pendingRecurringRecords.value.findIndex((r) => (r.sync_id ?? r.id) === (record.sync_id ?? record.id));
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

<style scoped>
/* Mobile/tablet: cadena de altura para que el registro pegue al borde inferior.
   La página no scrollea; el registro scrollea internamente. (hasta 991px) */
@media (max-width: 991px) {
  ion-content {
    --overflow: hidden;
  }

  .budget-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* el cuerpo (InicioViewComponent) ocupa el resto */
  .budget-body {
    flex: 1;
    min-height: 0;
  }
}

/* Desktop: centrar contenido con max-width (sin grid wrapper). */
@media (min-width: 992px) {
  .budget-content {
    max-width: 800px;
    margin: 0 auto;
  }
}
</style>
