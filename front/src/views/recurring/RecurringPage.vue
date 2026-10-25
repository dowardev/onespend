<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <!-- header -->
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode" />
        </ion-buttons>

        <ion-title>{{ t('recurring.recurringpage.title') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button v-if="isDev" @click="seedTestData()">
            <ion-icon :icon="flaskOutline" />
          </ion-button>
          <ion-button @click="createRecord()">
            <ion-icon :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <!-- end header -->

    <!-- content -->
    <ion-content>
      <ion-grid class="recurring__grid">
        <ion-row class="ion-justify-content-center">
          <ion-col size-xs="12" size-md="10" size-lg="8" size-xl="6" class="recurring__col">
            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>{{ t('recurring.recurringpage.label') }}</ion-label>

                <ion-button v-if="!showSearch" @click="showSearch = true">
                  <ion-icon :icon="searchOutline"></ion-icon>
                </ion-button>
              </ion-list-header>

              <!-- search recurring -->
              <div class="search-row" :class="{ 'search-row--open': showSearch }">
                <div class="search-row__inner">
                  <ion-item lines="none">
                    <ion-searchbar
                      v-model="searchTerm"
                      mode="ios"
                      :placeholder="t('recurring.recurringpage.placeholder')"
                      show-clear-button="focus"
                    ></ion-searchbar>

                    <ion-button fill="clear" @click="showSearch = false">{{ t('common.cancel') }}</ion-button>
                  </ion-item>
                </div>
              </div>

              <div class="list-content recurring__content">
                <template v-for="group in groupedRecords" :key="group.letter">
                  <ion-item-group>
                    <ion-item-divider sticky>
                      <ion-label>{{ group.letter }}</ion-label>
                    </ion-item-divider>

                    <ion-item
                      v-for="record in group.items"
                      :key="record.sync_id ?? record.id"
                      class="transparent"
                      button
                      @click="editRecord({ record })"
                    >
                      <div
                        slot="start"
                        class="item-indicator"
                        :style="{ backgroundColor: record.type === 'provedor' || record.entryType === 'egreso' ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }"
                      ></div>
                      <ion-label>
                        <h3>{{ record.name }}</h3>
                        <p>
                          {{ frequencyDescription({ record }) }}<template v-if="record.time"> · {{ record.time }}</template>
                        </p>
                      </ion-label>

                      <ion-badge
                        slot="end"
                        :color="record.status === 'paused' ? 'warning' : 'success'"
                        style="margin-right: 8px"
                      >
                        {{ record.status === 'paused' ? t('recurring.status.paused') : t('recurring.status.active') }}
                      </ion-badge>
                      <ion-button
                        v-if="record.status === 'active' || record.status === 'paused'"
                        slot="end"
                        fill="clear"
                        :aria-label="record.status === 'active' ? t('recurring.action.pause') : t('recurring.action.resume')"
                        @click.stop="toggleRecord({ record })"
                      >
                        <ion-icon
                          :icon="record.status === 'active' ? pauseOutline : playOutline"
                        />
                      </ion-button>
                      <ion-button
                        slot="end"
                        fill="clear"
                        color="danger"
                        @click.stop="confirmRemove({ record })"
                      >
                        <ion-icon :icon="trashOutline" color="danger" />
                      </ion-button>
                    </ion-item>
                  </ion-item-group>
                </template>

                <ion-item v-if="filteredRecords.length === 0" class="transparent">
                  <ion-label class="ion-text-center">{{ t('recurring.recurringpage.empty') }}</ion-label>
                </ion-item>
              </div>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
    <!-- end content -->

    <!-- alerts -->
    <ion-alert
      :is-open="deleteConfirm.open"
      :header="t('recurring.recurringpage.deleteAlertHeader')"
      :message="t('recurring.recurringpage.deleteAlertMessage', { name: deleteConfirm.recordName })"
      :buttons="deleteAlertButtons"
      @did-dismiss="onDeleteAlertDidDismiss"
    />
    <!-- end alerts -->
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import { ref, computed, reactive,  } from 'vue';
import { useLocale } from '@/composables/useLocale';
import {
  onIonViewWillEnter,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonList,
  IonListHeader,
  IonItemGroup,
  IonItemDivider,
  IonAlert,
  IonButtons,
  IonIcon,
  IonMenuButton,
  IonSearchbar,
  IonBadge,
  toastController,
} from '@ionic/vue';
import {
  addOutline,
  pauseOutline,
  playOutline,
  flaskOutline,
  searchOutline,
  trashOutline,
} from 'ionicons/icons';
// End Imports

// Controllers
import systemController from '@/controllers/systemConfigController';
import {
  recurringRecordsController,
  type RecurringRecord,
} from '@/controllers/recurringRecordsController';
import accountsController from '@/controllers/accountsController';
import { syncQueue } from '@/services/syncQueue';
// End Controllers

// Components
// End Components

// Interface and types imports
// End Interface and types imports

// Main
import { useRouter } from 'vue-router';
import { format } from 'date-fns';
const router = useRouter();
const { t } = useLocale();
// End Main

// Vars and const
const searchTerm = ref('');
const showSearch = ref(false);
const records = ref<RecurringRecord[]>([]);
const deleteConfirm = reactive({
  open: false,
  recordId: null as string | number | null,
  recordName: '' as string,
});

const isDev = import.meta.env.DEV;

// Translation keys for frequency description
const weekDayShortKeys = [
  'recurring.recurringpage.weekdayShort.0',
  'recurring.recurringpage.weekdayShort.1',
  'recurring.recurringpage.weekdayShort.2',
  'recurring.recurringpage.weekdayShort.3',
  'recurring.recurringpage.weekdayShort.4',
  'recurring.recurringpage.weekdayShort.5',
  'recurring.recurringpage.weekdayShort.6',
];
const weekDayNamesKeys = [
  'recurring.recurringpage.weekdayFull.0',
  'recurring.recurringpage.weekdayFull.1',
  'recurring.recurringpage.weekdayFull.2',
  'recurring.recurringpage.weekdayFull.3',
  'recurring.recurringpage.weekdayFull.4',
  'recurring.recurringpage.weekdayFull.5',
  'recurring.recurringpage.weekdayFull.6',
];
const monthNamesKeys = [
  'recurring.recurringpage.month.1',
  'recurring.recurringpage.month.2',
  'recurring.recurringpage.month.3',
  'recurring.recurringpage.month.4',
  'recurring.recurringpage.month.5',
  'recurring.recurringpage.month.6',
  'recurring.recurringpage.month.7',
  'recurring.recurringpage.month.8',
  'recurring.recurringpage.month.9',
  'recurring.recurringpage.month.10',
  'recurring.recurringpage.month.11',
  'recurring.recurringpage.month.12',
];
const ordinalNamesKeys = [
  '',
  'recurring.recurringpage.ordinal.1',
  'recurring.recurringpage.ordinal.2',
  'recurring.recurringpage.ordinal.3',
  'recurring.recurringpage.ordinal.4',
  'recurring.recurringpage.ordinal.5',
  'recurring.recurringpage.ordinal.6',
  'recurring.recurringpage.ordinal.7',
  'recurring.recurringpage.ordinal.8',
];
const syncRecurringRecord = syncQueue.syncRecurringRecord;
// End Vars and const

// Watch
// End Watch

// Computed
const designMode = computed(() => systemController.getDesignMode());

const filteredRecords = computed(() => {
  const term = (searchTerm.value || '').toString().toLowerCase().trim();
  const list = records.value || [];
  if (!term) return list;
  return list.filter((r: RecurringRecord) => {
    const name = (r.name || '').toString().toLowerCase();
    return name.includes(term);
  });
});

const groupedRecords = computed(() => {
  const list = (filteredRecords.value || []).slice();
  list.sort((a: RecurringRecord, b: RecurringRecord) => {
    const na = (a.name || '').toString().toLowerCase();
    const nb = (b.name || '').toString().toLowerCase();
    return na.localeCompare(nb);
  });

  const map = new Map<string, RecurringRecord[]>();
  list.forEach((r: RecurringRecord) => {
    const name = (r.name || '').toString().trim();
    const letter = name ? name[0].toUpperCase() : '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(r);
  });

  return Array.from(map.keys())
    .sort()
    .map((letter) => ({ letter, items: map.get(letter) || [] }));
});

const deleteAlertButtons = computed(() => [
  {
    text: t('recurring.recurringpage.cancelButton'),
    role: 'cancel',
    handler: () => {},
  },
  {
    text: t('recurring.recurringpage.deleteButton'),
    role: 'destructive',
    handler: () => {
      void removeConfirmed();
    },
  },
]);
// End Computed

// Life cycle
onIonViewWillEnter(() => {
  loadRecords();
});
// End Life cycle

// Functions
function typeLabel(params: { record: RecurringRecord }) {
  const { record } = params;
  return record.type === 'cargo' ? t('recurring.recurringpage.type.charge') : t('recurring.recurringpage.type.provider');
}

function frequencyDescription(params: { record: RecurringRecord }) {
  const { record } = params;
  const interval = record.repeatInterval || 1;

  switch (record.repeatFrequency) {
    case 'day':
      return interval === 1
        ? t('recurring.recurringpage.freq.day.single')
        : t('recurring.recurringpage.freq.day.multiple', { n: interval });
    case 'week': {
      const days = (record.repeatDays || [])
        .sort((a, b) => a - b)
        .map((d) => t(weekDayShortKeys[d]))
        .filter(Boolean)
        .join(', ');
      const base = interval === 1
        ? t('recurring.recurringpage.freq.week.single')
        : t('recurring.recurringpage.freq.week.multiple', { n: interval });
      return days ? `${base} - ${days}` : base;
    }
    case 'month':
      if (record.repeatMonthWeekdayMode) {
        const ordinalIdx = record.repeatMonthWeekdayOrdinal ?? 1;
        const ordinalKey = ordinalIdx === -1 ? 'recurring.recurringpage.ordinal.last' : ordinalNamesKeys[ordinalIdx];
        const ordinal = t(ordinalKey);
        const weekday = t(weekDayNamesKeys[record.repeatMonthWeekday ?? 0]);
        return t('recurring.recurringpage.freq.month.weekday', { ordinal, weekday });
      }
      return t('recurring.recurringpage.freq.month.day', { day: record.repeatMonthDay || 1 });
    case 'year': {
      const month = t(monthNamesKeys[(record.repeatYearMonth || 1) - 1]);
      const day = record.repeatYearDay || 1;
      const base = interval === 1
        ? t('recurring.recurringpage.freq.year.single')
        : t('recurring.recurringpage.freq.year.multiple', { n: interval });
      return t('recurring.recurringpage.freq.year.withDate', { base, month, day });
    }
    default:
      return '';
  }
}

function nextDate(params: { record: RecurringRecord }) {
  const { record } = params;
  if (!record.startDate) return '';
  try {
    return format(new Date(record.startDate), 'dd/MM/yyyy');
  } catch {
    return record.startDate;
  }
}

function createRecord() {
  router.push({ name: 'RecurringEdit' });
}

function editRecord(params: { record: RecurringRecord }) {
  const { record } = params;
  router.push({ name: 'RecurringEdit', query: { recurringId: record.sync_id || record.id } });
}

async function toggleRecord(params: { record: RecurringRecord }) {
  const { record } = params;
  const recId = record.sync_id ?? record.id;
  if (recId == null) return;
  const willPause = record.status === 'active';
  await recurringRecordsController.toggleActive({ id: recId });
  await loadRecords();
  const toast = await toastController.create({
    message: willPause ? t('recurring.recurringpage.toast.paused') : t('recurring.recurringpage.toast.resumed'),
    duration: 2000,
    position: 'bottom',
    color: willPause ? 'warning' : 'success',
  });
  await toast.present();
}

function confirmRemove(params: { record: RecurringRecord }) {
  const { record } = params;
  deleteConfirm.open = true;
  deleteConfirm.recordId = (record.sync_id ?? record.id) ?? null;
  deleteConfirm.recordName = record.name || '';
}

function onDeleteAlertDidDismiss() {
  deleteConfirm.open = false;
  deleteConfirm.recordId = null;
  deleteConfirm.recordName = '';
}

async function removeConfirmed() {
  const id = deleteConfirm.recordId;
  const recordToDelete = id != null ? await recurringRecordsController.getRecordById({ id }) : null;

  deleteConfirm.open = false;
  deleteConfirm.recordId = null;
  deleteConfirm.recordName = '';

  if (!recordToDelete) return;
  await recurringRecordsController.removeRecord({ id: id! });
  await syncRecurringRecord({ record: { ...recordToDelete, status: 'deleted' as const } });
  await loadRecords();
}

async function seedTestData() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const accounts = accountsController.getAccounts();
  const accountId = accounts.length > 0 ? (accounts[0].id ?? null) : null;

  const seeds: Array<Omit<RecurringRecord, 'id' | 'sync_id' | 'createdAt'>> = [
    {
      type: 'cargo',
      entryType: 'egreso',
      name: 'Alquiler',
      amount: 15000,
      accountId,
      repeatFrequency: 'month',
      repeatInterval: 1,
      repeatMonthDay: 1,
      time: '09:00',
      autoInsert: true,
      startDate: today,
      status: 'active',
    },
    {
      type: 'cargo',
      entryType: 'egreso',
      name: 'Netflix',
      amount: 250,
      accountId,
      repeatFrequency: 'month',
      repeatInterval: 1,
      repeatMonthDay: 15,
      time: '10:00',
      autoInsert: true,
      startDate: today,
      status: 'active',
    },
    {
      type: 'cargo',
      entryType: 'ingreso',
      name: 'Salario',
      amount: 50000,
      accountId,
      repeatFrequency: 'month',
      repeatInterval: 1,
      repeatMonthDay: 28,
      time: '08:00',
      autoInsert: true,
      startDate: today,
      status: 'active',
    },
    {
      type: 'cargo',
      entryType: 'egreso',
      name: 'Limpieza',
      amount: 500,
      accountId,
      repeatFrequency: 'week',
      repeatInterval: 1,
      repeatDays: [1],
      autoInsert: false,
      startDate: today,
      status: 'active',
    },
    {
      type: 'cargo',
      entryType: 'egreso',
      name: 'Seguro auto',
      amount: 8000,
      accountId,
      repeatFrequency: 'year',
      repeatInterval: 1,
      repeatYearMonth: 1,
      repeatYearDay: 1,
      autoInsert: false,
      startDate: today,
      status: 'active',
    },
    {
      type: 'provedor',
      entryType: 'egreso',
      name: 'Supermercado',
      accountId,
      repeatFrequency: 'week',
      repeatInterval: 1,
      repeatDays: [2, 5],
      autoInsert: false,
      items: [{ amount: 2000, accountId }],
      products: [
        { productName: 'Leche', productPrice: 60, quantity: 2 },
        { productName: 'Pan', productPrice: 40, quantity: 3 },
      ],
      startDate: today,
      status: 'active',
    },
    {
      type: 'cargo',
      entryType: 'egreso',
      name: 'Gimnasio',
      amount: 1200,
      accountId,
      repeatFrequency: 'month',
      repeatInterval: 1,
      repeatMonthDay: 30,
      time: '07:00',
      autoInsert: true,
      startDate: today,
      status: 'active',
    },
    {
      type: 'cargo',
      entryType: 'egreso',
      name: 'Internet',
      amount: 900,
      accountId,
      repeatFrequency: 'month',
      repeatInterval: 1,
      repeatMonthWeekdayMode: true,
      repeatMonthWeekday: 4,
      repeatMonthWeekdayOrdinal: 2,
      time: '11:00',
      autoInsert: true,
      startDate: today,
      status: 'active',
    },
  ];

  for (const seed of seeds) {
    await recurringRecordsController.addRecord({ record: seed });
  }

  await loadRecords();

  const toast = await toastController.create({
    message: t('recurring.recurringpage.testDataToast'),
    duration: 2000,
    position: 'bottom',
    color: 'success',
  });
  await toast.present();
}

async function loadRecords() {
  try {
    const all = await recurringRecordsController.getAllRecords();
    records.value = (all || []).filter((r) => r.status !== 'deleted');
  } catch (e) {
    console.error('[RecurringPage] loadRecords error:', e);
  }
}
// End Functions
</script>

<style scoped>
/* cadena de altura: grid/row/col ocupan todo el alto del content */
.item-indicator {
  width: 4px;
  height: 24px;
  border-radius: 2px;
  flex-shrink: 0;
}

.recurring__grid {
  height: 100%;
}

.recurring__grid ion-row {
  height: 100%;
}

.recurring__col {
  height: 100%;
}

/* el list ocupa todo el alto disponible del content */
ion-list.transparent {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* scroll interno: el div se adapta al espacio restante (searchbar abierto/cerrado) */
/* y activa su scroll solo cuando el contenido choca con el borde */
.recurring__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* searchbar show/hide animation */
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

.record-actions {
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease;
}

ion-item:hover .record-actions,
ion-item:focus-within .record-actions {
  opacity: 1;
  pointer-events: auto;
}

@media (pointer: fine) {
  ion-item:hover .record-actions,
  ion-item:focus-within .record-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

@media (pointer: coarse) {
  .record-actions {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
