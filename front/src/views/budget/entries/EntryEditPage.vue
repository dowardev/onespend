<template>
  <ion-page>
    <!-- header -->
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="handleBack">
            <ion-icon :icon="arrowBackOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{
          isEditing ? 'Editar Entrada' : 'Nueva Entrada'
        }}</ion-title>

        <ion-buttons slot="end">
          <ion-button
            :disabled="!isFormValid || isDayClosed"
            @click="handleSave"
          >
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>

          <ion-button
            v-if="isEditing"
            fill="clear"
            :disabled="isDayClosed"
            @click="openOptionsPopover"
          >
            <ion-icon :icon="ellipsisVertical"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <!-- end header -->

    <!-- content -->
    <ion-content>
      <!-- Segment selector: only for new entries -->
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="4">
            <template v-if="!isEditing">
              <ion-segment v-model="addEntrySegment" scrollable>
                <ion-segment-button value="entry">
                  <ion-label>Registro</ion-label>
                </ion-segment-button>

                <ion-segment-button value="provider" :disabled="!hasProviders">
                  <ion-label>Proveedores</ion-label>
                </ion-segment-button>
              </ion-segment>
            </template>

            <section
              v-if="!isEditing && addEntrySegment === 'provider'"
              class="ion-padding-start ion-padding-end"
            >
              <ion-list>
                <ion-list-header>
                  <ion-label>Provedores</ion-label>
                  <ion-button @click="refreshProviders">
                    <ion-icon :icon="refreshOutline"></ion-icon>
                  </ion-button>
                </ion-list-header>

                <template v-if="providersTodayWithData.length">
                  <ion-card
                    v-for="p in providersTodayWithData"
                    :key="p.id"
                    class="shadow1"
                  >
                    <ion-item
                      class="transparent"
                      lines="full"
                      :button="!!p.accountId && !isDayClosed"
                      :disabled="!p.accountId || isDayClosed"
                      @click="
                        p.accountId &&
                        !isDayClosed &&
                        selectProvider({ provider: p })
                      "
                    >
                      <ion-label>
                        {{ p.name }}
                        <p
                          v-if="!p.accountId"
                          style="color: var(--ion-color-warning)"
                        >
                          Sin cuenta asignada
                        </p>
                      </ion-label>
                      <ion-note
                        slot="end"
                        :color="p.accountId ? 'primary' : 'medium'"
                      >
                        {{ formatProviderAmount({ provider: p }) }}
                      </ion-note>
                    </ion-item>
                  </ion-card>
                </template>
              </ion-list>
            </section>

            <!-- Unified entry form -->
            <section
              v-if="(!isEditing && addEntrySegment === 'entry') || isEditing"
              class="ion-padding-start ion-padding-end"
            >
              <ion-list class="transparent">
                <ion-card class="shadow1">
                  <ion-item lines="full" class="transparent">
                    <ion-select
                      v-model="entryData.entryType"
                      :interface="isEditing ? 'popover' : 'popover'"
                      label="Tipo"
                      label-placement="stacked"
                    >
                      <ion-select-option value="ingreso"
                        >Ingreso</ion-select-option
                      >
                      <ion-select-option value="egreso"
                        >Egreso</ion-select-option
                      >
                    </ion-select>
                  </ion-item>

                  <ion-item class="transparent" lines="full">
                    <ion-input
                      v-model="entryData.name"
                      label="Nombre"
                      label-placement="floating"
                      placeholder="Pepito"
                    ></ion-input>
                  </ion-item>

                  <ion-item
                    lines="full"
                    class="transparent"
                    button
                    @click="openEntryDatePopover"
                  >
                    <ion-label>Fecha</ion-label>
                    <ion-label slot="end">{{
                      formatShortDate(entryDateISO)
                    }}</ion-label>
                  </ion-item>
                </ion-card>
              </ion-list>

              <ion-list class="transparent">
                <ion-list-header>
                  <ion-label>Cuentas</ion-label>
                  <ion-button
                    :disabled="!canAddMoreItems || isDayClosed"
                    @click="addEntryItem"
                  >
                    <ion-icon :icon="addOutline"></ion-icon>
                    Agregar
                  </ion-button>
                </ion-list-header>

                <template v-for="(item, index) in entryItems" :key="index">
                  <ion-card class="shadow1">
                    <div
                      v-if="entryItems.length > 1"
                      style="display: flex; justify-content: flex-end"
                    >
                      <ion-button
                        :disabled="isDayClosed"
                        fill="clear"
                        size="small"
                        @click="removeEntryItem(index)"
                      >
                        <ion-icon
                          :icon="closeOutline"
                          color="danger"
                        ></ion-icon>
                      </ion-button>
                    </div>

                    <ion-item lines="full" class="transparent">
                      <ion-input
                        v-model="item.amount"
                        label="Cantidad"
                        label-placement="floating"
                        type="number"
                        placeholder="0"
                        :class="{
                          'ion-invalid': isAmountInvalid(index),
                          'ion-touched': isAmountTouched(index),
                        }"
                        :error-text="getAmountError(index)"
                      ></ion-input>
                    </ion-item>

                    <ion-item class="transparent" lines="none">
                      <ion-select
                        v-model="item.accountId"
                        interface="popover"
                        style="--border-width: 0px"
                        label="Cuenta"
                        label-placement="stacked"
                        :validate="true"
                        error-text="Selecciona una cuenta"
                        :disabled="accountsList.length === 0"
                      >
                        <ion-select-option
                          v-for="acc in availableAccountsForItem(index)"
                          :key="acc.id"
                          :value="acc.id"
                        >
                          {{ acc.name }}
                        </ion-select-option>
                      </ion-select>

                      <ion-button
                        slot="end"
                        fill="clear"
                        size="small"
                        :disabled="isDayClosed"
                        @click="openQuickAccountAlert(index)"
                      >
                        <ion-icon :icon="addOutline"></ion-icon>
                      </ion-button>
                    </ion-item>
                  </ion-card>
                </template>
              </ion-list>

              <ion-list>
                <ion-list-header>
                  <ion-label> Detalles </ion-label>
                </ion-list-header>

                <ion-card class="shadow1">
                  <ion-item
                    class="transparent"
                    lines="full"
                    button
                    @click="handleOpenAttachments"
                  >
                    <ion-label>Adjuntos</ion-label>
                  </ion-item>

                  <ion-item class="transparent" lines="none">
                    <ion-textarea
                      v-model="entryNotes"
                      label="Notas"
                      label-placement="stacked"
                      placeholder="Agregar notas..."
                      :auto-grow="true"
                      :rows="3"
                    ></ion-textarea>
                  </ion-item>
                </ion-card>
              </ion-list>
            </section>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Provider selection -->
    </ion-content>

    <!-- popovers -->
    <!-- Reassign date popover -->
    <ion-popover
      :is-open="popoverState.open"
      :event="popoverState.event"
      @did-dismiss="popoverState.open = false"
    >
      <ion-content class="ion-padding">
        <div style="min-width: 220px; max-width: 320px">
          <ion-item lines="none">
            <ion-label position="stacked">Seleccionar fecha</ion-label>
            <ion-datetime
              v-if="showPicker"
              ref="reassignPicker"
              :key="reassignDateISO"
              v-model="reassignDateISO"
              :value="reassignDateISO"
              presentation="date"
              style="background: transparent; width: 100%"
              @ion-change="onReassignDatetimeChange"
            ></ion-datetime>
          </ion-item>

          <ion-item lines="full" style="margin-top: 8px">
            <ion-button
              slot="start"
              fill="clear"
              size="small"
              @click="popoverState.open = false"
              >Cancelar</ion-button
            >
            <ion-button
              slot="end"
              size="small"
              color="primary"
              :disabled="!reassignDate"
              @click="applyPopoverReassign"
              >Aplicar</ion-button
            >
          </ion-item>
        </div>
      </ion-content>
    </ion-popover>

    <!-- Entry date picker popover -->
    <ion-popover
      :is-open="entryDatePopoverState.open"
      :event="entryDatePopoverState.event"
      @did-dismiss="entryDatePopoverState.open = false"
    >
      <ion-content>
        <ion-datetime
          :key="pickerDateKey"
          ref="pickerDateRef"
          v-model="pickerDateISO"
          presentation="date"
          style="background: transparent; width: 100%"
          @ion-change="onPickerDateChange"
        >
          <ion-buttons slot="buttons">
            <ion-button color="primary" @click="goToToday"> Hoy </ion-button>
            <ion-button color="primary" @click="confirmPicker">
              Aplicar
            </ion-button>
          </ion-buttons>
        </ion-datetime>
      </ion-content>
    </ion-popover>
    <!-- end popovers -->

    <!-- options popover -->
    <ion-popover
      :is-open="optionsPopoverState.open"
      :event="optionsPopoverState.event"
      @did-dismiss="optionsPopoverState.open = false"
    >
      <ion-content>
        <ion-item
          button
          :disabled="isDayClosed"
          @click="handleDeleteFromPopover"
        >
          <ion-icon slot="start" :icon="trashOutline" color="danger"></ion-icon>
          <ion-label color="danger">Eliminar</ion-label>
        </ion-item>
      </ion-content>
    </ion-popover>
    <!-- end options popover -->

    <!-- alerts -->
    <ion-alert
      :is-open="showDeleteAlert"
      header="Confirmar eliminación"
      message="¿Estás seguro de que deseas eliminar esta entrada?"
      :buttons="deleteAlertButtons"
      @did-dismiss="showDeleteAlert = false"
    ></ion-alert>

    <ion-alert
      :is-open="showQuickAccountAlert"
      header="Nueva Cuenta"
      :inputs="quickAccountInputs"
      :buttons="quickAccountButtons"
      @did-dismiss="showQuickAccountAlert = false"
    ></ion-alert>
    <!-- end alerts -->

    <!-- components -->
    <AttachmentsModal
      :is-open="showAttachmentsModal"
      :initial-files="pendingAttachments"
      :existing-attachments="existingAttachments"
      @dismiss="showAttachmentsModal = false"
      @save="handleAttachmentsSave"
    />
    <!-- end components -->
  </ion-page>
</template>

<script setup lang="ts">
// imports
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonButtons,
  IonIcon,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonListHeader,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonNote,
  IonCard,
  IonDatetime,
  IonPopover,
  IonAlert,
  IonTextarea,
} from '@ionic/vue';
import {
  arrowBackOutline,
  addOutline,
  closeOutline,
  refreshOutline,
  saveOutline,
  trashOutline,
  ellipsisVertical,
} from 'ionicons/icons';
import { computed, ref, watch, onMounted, reactive, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { format } from 'date-fns';
import budgetController from '@/controllers/budgetController';
import accountsController from '@/controllers/accountsController';
import pendingAttachmentsService from '@/services/pendingAttachmentsService';
import attachmentService from '@/services/attachmentService';
import AttachmentsModal from './componentes/AttachmentsModal.vue';
// end imports

// interface and types imports
interface EntryGroup {
  amount: number;
  accountId: string | number | null;
}

interface ProviderSummary {
  id: string | number;
  name: string;
  estimated: number;
  accountId: string | number | null;
}

interface Provider {
  id: string | number;
  name: string;
  estimated: number;
  accountId: string | number | null;
  date?: string;
}
// end interface and types imports

// router
const router = useRouter();
const route = useRoute();
// end router

// vars and const
const addEntrySegment = ref('entry');
const entryItems = ref<
  Array<{ amount: number | string; accountId: string | number | null }>
>([{ amount: '', accountId: null }]);

const entryData = ref({
  id: null as string | number | null,
  entryType: 'ingreso' as 'ingreso' | 'egreso',
  name: '',
  date: '',
});

const entryNotes = ref('');
const showAttachmentsModal = ref(false);
const entrySyncId = ref<string | null>(null);
const pendingAttachments = ref<File[]>([]);
const existingAttachments = ref<Array<{ id: number; name: string; size: number }>>([]);
const deletedAttachments = ref<number[]>([]);

// reassignDate holds the short date (yyyy-MM-dd) used for persistence
const reassignDate = ref<string | null>(null);
// reassignDateISO holds full ISO value bound to ion-datetime
const reassignDateISO = ref<string | null>(null);
// entryDateISO holds the date for new entries created via the page
const entryDateISO = ref<string | null>(null);
// State for entry date picker popover in form
const entryDatePopoverState = reactive({
  open: false,
  event: null as Event | null,
});
const showEntryDatePicker = ref(true);
const pickerDateISO = ref<string | null>(null);
const pickerDateRef = ref<any>(null);
const pickerDateKey = ref(0);
const popoverState = reactive({ open: false, event: null as Event | null });
const reassignPicker = ref<any>(null);
const showPicker = ref(true);

const showDeleteAlert = ref(false);
const showQuickAccountAlert = ref(false);
const quickAccountTargetIndex = ref<number | null>(null);
const optionsPopoverState = reactive({
  open: false,
  event: null as Event | null,
});

const quickAccountInputs = [
  {
    name: 'accountName',
    type: 'text',
    placeholder: 'Nombre de la cuenta',
  },
  {
    name: 'initialBalance',
    type: 'number',
    placeholder: 'Balance inicial (opcional)',
    value: 0,
  },
];

const quickAccountButtons = [
  {
    text: 'Cancelar',
    role: 'cancel',
  },
  {
    text: 'Crear',
    handler: (data: { accountName: string; initialBalance: string }) => {
      if (!data.accountName || data.accountName.trim() === '') {
        return false;
      }
      createQuickAccount(
        data.accountName.trim(),
        Number(data.initialBalance) || 0
      );
      return true;
    },
  },
];

const deleteAlertButtons = [
  {
    text: 'Cancelar',
    role: 'cancel',
    handler: () => {
      showDeleteAlert.value = false;
    },
  },
  {
    text: 'Eliminar',
    cssClass: 'danger-alert-btn',
    handler: confirmDelete,
  },
];

// end vars and const

// Computed from route
const isEditing = computed(() => !!route.query.entryId);
const isDayClosed = computed(() => false);

// Compute accounts from controller
const accountsList = computed(() => {
  const list = accountsController.getAccounts();
  if (!list || !Array.isArray(list)) return [];
  return list.filter((acc: any) => acc != null && acc.id != null);
});

// Providers today
const providersToday = computed(() => {
  const sel = String(budgetController.getSelectedDate() || '').slice(0, 10);
  if (!sel) return [];
  return budgetController
    .getProviders()
    .filter((p: any) => String(p.date || '').slice(0, 10) === sel);
});

const providersTodayWithData = computed(() => {
  return providersToday.value.filter((p: any) => Number(p?.estimated) > 0);
});

const hasProviders = computed(() => providersTodayWithData.value.length > 0);

// computed
const isFormValid = computed(() => {
  return (
    entryData.value.name.trim().length > 0 &&
    entryData.value.entryType &&
    entryItems.value.length > 0 &&
    entryItems.value.every(item => {
      const val = String(item.amount).trim();
      return (
        val !== '' &&
        !isNaN(Number(val)) &&
        Number(val) > 0 &&
        item.accountId != null
      );
    })
  );
});

const canAddMoreItems = computed(() => {
  return entryItems.value.length < accountsList.value.length;
});
// end computed

// onmounted
onMounted(async () => {
  if (isEditing.value && route.query.entryId) {
    await loadEntry(route.query.entryId as string);
  } else {
    // New entry - initialize with defaults
    const defaultAccountId = getDefaultAccountId();
    entryItems.value = [{ amount: '', accountId: defaultAccountId }];
    const selectedDate = budgetController.getSelectedDate();
    entryDateISO.value = selectedDate
      ? selectedDate.slice(0, 10) + 'T00:00:00'
      : format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
    pickerDateISO.value = entryDateISO.value;
  }
});
// end onmounted

// watch
// end watch

// functions
async function loadEntry(entryId: string) {
  const entries = budgetController.getEntries();
  const entry = entries.find((e: any) => String(e.id) === String(entryId));

  if (!entry) return;

  entryData.value = {
    id: entry.id,
    entryType: entry.entryType || 'ingreso',
    name: entry.name || '',
    date: entry.date || '',
  };

  entryNotes.value = entry.notes || '';

  entrySyncId.value = entry.sync_id || null;

  const defaultAccountId = getDefaultAccountId();

  if (entry.groups && Array.isArray(entry.groups) && entry.groups.length > 0) {
    entryItems.value = entry.groups.map((g: EntryGroup) => ({
      amount: g.amount ?? '',
      accountId: g.accountId ?? defaultAccountId,
    }));
  } else {
    entryItems.value = [
      {
        amount: entry.amount ?? '',
        accountId: entry.accountId || defaultAccountId,
      },
    ];
  }

  const resolvedDate = resolveEntryDate(entry);
  reassignDate.value = resolvedDate;
  reassignDateISO.value = toISODateTime(resolvedDate);
  entryDateISO.value = reassignDateISO.value;
  pickerDateISO.value = reassignDateISO.value;

  showPicker.value = false;
  await nextTick();
  showPicker.value = true;
}

function handleBack() {
  router.back();
}

function handleDelete() {
  showDeleteAlert.value = true;
}

function openOptionsPopover(e: Event) {
  optionsPopoverState.event = e;
  optionsPopoverState.open = true;
}

function handleDeleteFromPopover() {
  optionsPopoverState.open = false;
  showDeleteAlert.value = true;
}

async function confirmDelete() {
  if (entryData.value.id) {
    // Eliminar adjuntos del backend si existe sync_id
    if (entrySyncId.value) {
      try {
        const response = await attachmentService.listAttachments(entrySyncId.value);
        for (const attachment of response.data) {
          await attachmentService.deleteAttachment(attachment.id);
        }
      } catch (error) {
        console.error('Failed to delete attachments:', error);
      }

      // Eliminar archivos pendientes de localStorage
      pendingAttachmentsService.removePendingAttachment(entrySyncId.value);
    }

    budgetController.removeIngreso({ id: entryData.value.id });
    budgetController.saveData();
  }
  showDeleteAlert.value = false;
  router.back();
}

// Date helpers
function parseEntryDate(dateValue: unknown): string {
  if (!dateValue) return format(new Date(), 'yyyy-MM-dd');

  if (typeof dateValue === 'string') {
    return dateValue.length >= 10 ? dateValue.slice(0, 10) : dateValue;
  }

  if (typeof dateValue === 'number') {
    return format(new Date(dateValue), 'yyyy-MM-dd');
  }

  if (dateValue instanceof Date) {
    return format(dateValue, 'yyyy-MM-dd');
  }

  return String(dateValue).slice(0, 10);
}

function toISODateTime(dateStr: string): string {
  if (dateStr.includes('T')) {
    return dateStr.length >= 19 ? dateStr.slice(0, 19) : dateStr + 'T00:00:00';
  }
  return `${dateStr}T00:00:00`;
}

function resolveEntryDate(entry: any): string {
  if (entry?.date) {
    return parseEntryDate(entry.date);
  }

  const selectedDate = budgetController.getSelectedDate?.();
  if (selectedDate) return parseEntryDate(selectedDate);

  return format(new Date(), 'yyyy-MM-dd');
}
// end Date helpers

function getDefaultAccountId() {
  return accountsList.value.length > 0 ? accountsList.value[0].id : null;
}

const availableAccountsForItem = (currentIndex: number) => {
  const usedAccountIds = entryItems.value
    .filter((_: unknown, idx: number) => idx !== currentIndex)
    .map((item: { accountId: string | number | null }) =>
      String(item.accountId)
    )
    .filter((id: string) => id !== 'null' && id !== 'undefined' && id !== '');
  return accountsList.value.filter(
    (acc: any) => !usedAccountIds.includes(String(acc.id))
  );
};

function formatProviderAmount(params: { provider: ProviderSummary }) {
  const { provider } = params;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(provider?.estimated) || 0);
}

function selectProvider(params: { provider: ProviderSummary }) {
  const { provider } = params;
  const providerData = provider as Provider;
  if (!providerData.accountId) {
    return;
  }
  budgetController.addProviderEgresos({ provider: providerData });
  budgetController.saveData();
  router.back();
}

async function refreshProviders() {
  await budgetController.loadDataForDate({
    date: budgetController.getSelectedDate(),
  });
}

function addEntryItem() {
  if (canAddMoreItems.value) {
    entryItems.value.push({ amount: '', accountId: getDefaultAccountId() });
  }
}

function removeEntryItem(index: number) {
  if (entryItems.value.length > 1) {
    entryItems.value.splice(index, 1);
  }
}

async function handleSave() {
  if (!isFormValid.value) return;

  const totalAmount = entryItems.value.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const payload: any = {
    entryType: entryData.value.entryType,
    name: entryData.value.name,
    amount: totalAmount,
    accountId: entryItems.value[0]?.accountId ?? null,
    groups: entryItems.value,
    notes: entryNotes.value,
  };

  if (entryDateISO.value) {
    payload.date = entryDateISO.value.slice(0, 10);
  }

  let savedEntry;

  if (entryData.value.id) {
    const originalDate = entryData.value.date;
    const hasDateChanged = payload.date && payload.date !== originalDate;

    if (hasDateChanged) {
      const { reassignEntry } = await import('@/composables/useReassignEntry');
      reassignEntry({
        entryId: entryData.value.id,
        newDate: payload.date,
        originalDate: originalDate,
        restoreSelectedDate: true,
        verbose: false,
      });
    } else {
      budgetController.updateIngreso({
        id: entryData.value.id,
        changes: {
          entryType: payload.entryType,
          name: payload.name,
          amount: payload.amount,
          accountId: payload.accountId,
          groups: payload.groups,
        },
      });
    }
    savedEntry = budgetController.getEntries().find((e: any) => String(e.id) === String(entryData.value.id));
  } else {
    if (totalAmount > 0) {
      const entryDataAny: any = {
        name: payload.name,
        amount: payload.amount,
        accountId: payload.accountId,
        groups: payload.groups,
      };
      if (payload.date) {
        entryDataAny.date = payload.date;
      }
      if (payload.entryType === 'ingreso') {
        savedEntry = budgetController.addIngreso(entryDataAny);
      } else {
        savedEntry = budgetController.addEgreso(entryDataAny);
      }
    }
  }

  budgetController.saveData();

  const entrySyncIdValue = savedEntry?.sync_id || entrySyncId.value;
  const isNewEntry = !entryData.value.id;

  if (entrySyncIdValue) {
    for (const attachmentId of deletedAttachments.value) {
      try {
        await attachmentService.deleteAttachment(attachmentId);
      } catch (error) {
        console.error('Failed to delete attachment:', error);
      }
    }

    if (pendingAttachments.value.length > 0) {
      // Para entradas nuevas: siempre guardar en pendingAttachments (se subirá al sincronizar)
      // Para entradas existentes: intentar subir inmediatamente si hay conexión
      console.log('[EntryEditPage] Saving attachments:', { isNewEntry, entrySyncIdValue, count: pendingAttachments.value.length });
      if (!isNewEntry && navigator.onLine) {
        try {
          await attachmentService.uploadAttachments(entrySyncIdValue, pendingAttachments.value);
          console.log('[EntryEditPage] Attachments uploaded successfully');
        } catch (error) {
          console.error('[EntryEditPage] Failed to upload, saving to pending:', error);
          await pendingAttachmentsService.addPendingAttachment(
            entrySyncIdValue,
            pendingAttachments.value
          );
        }
      } else {
        console.log('[EntryEditPage] Saving to pendingAttachmentsService');
        await pendingAttachmentsService.addPendingAttachment(
          entrySyncIdValue,
          pendingAttachments.value
        );
      }
    }

    pendingAttachments.value = [];
    deletedAttachments.value = [];
  }

  router.back();
}

// Entry date picker functions for form
function formatShortDate(isoDate: string | null): string {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch (e) {
    return isoDate.slice(0, 10);
  }
}

async function openEntryDatePopover(e: Event) {
  pickerDateISO.value = entryDateISO.value;
  showEntryDatePicker.value = false;
  await nextTick();
  showEntryDatePicker.value = true;
  entryDatePopoverState.event = e;
  entryDatePopoverState.open = true;
}

function onPickerDateChange(event: CustomEvent) {
  pickerDateISO.value = event.detail.value;
}

function confirmPicker() {
  entryDateISO.value = pickerDateISO.value;
  entryDatePopoverState.open = false;
}

function goToToday() {
  const today = new Date();
  pickerDateISO.value = format(today, 'yyyy-MM-dd') + 'T00:00:00';
  pickerDateKey.value++;
}

async function handleOpenAttachments() {
  if (entrySyncId.value) {
    try {
      const response = await attachmentService.listAttachments(entrySyncId.value);
      existingAttachments.value = response.data;
    } catch (error) {
      console.error('Failed to load existing attachments:', error);
      existingAttachments.value = [];
    }
  }
  showAttachmentsModal.value = true;
}

function handleAttachmentsSave(newFiles: File[], deletedIds: number[]) {
  pendingAttachments.value = newFiles;
  deletedAttachments.value = deletedIds;
}

async function openReassignPopover(e: Event) {
  try {
    if (!reassignDateISO.value) {
      if (reassignDate.value) {
        reassignDateISO.value = `${String(reassignDate.value).slice(0, 10)}T00:00:00`;
      } else if (entryData.value.date) {
        const raw = entryData.value.date;
        if (typeof raw === 'string' && raw.includes('T'))
          reassignDateISO.value =
            raw.length >= 19 ? raw.slice(0, 19) : raw + 'T00:00:00';
        else if (typeof raw === 'string')
          reassignDateISO.value = `${raw.slice(0, 10)}T00:00:00`;
      } else {
        reassignDateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
      }
    }
  } catch (err) {
    reassignDateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
  }

  try {
    showPicker.value = false;
    await nextTick();
    showPicker.value = true;
    await new Promise(res => setTimeout(res, 30));
  } catch (err) {}

  popoverState.event = e;
  popoverState.open = true;
}

function applyPopoverReassign() {
  popoverState.open = false;
}

function onReassignDatetimeChange(e: any) {
  try {
    const val = e?.detail?.value ?? e;
    if (!val) return;
    let iso: string | null = null;
    if (typeof val === 'string') {
      iso =
        val.length >= 10 && val.includes('T')
          ? val
          : `${String(val).slice(0, 10)}T00:00:00`;
    } else if (val instanceof Date) {
      iso = format(val, 'yyyy-MM-dd') + 'T00:00:00';
    } else {
      iso = String(val).slice(0, 10) + 'T00:00:00';
    }
    reassignDateISO.value = iso;
    reassignDate.value = iso.slice(0, 10);
  } catch (err) {
    console.error('EntryEditPage.onReassignDatetimeChange error', err);
  }
}

async function applyPopoverReassignAction() {
  if (!reassignDate.value) return;

  const finalDate = reassignDate.value;

  try {
    const { reassignEntry } = await import('@/composables/useReassignEntry');
    await reassignEntry({
      entryId: entryData.value.id,
      newDate: finalDate,
      originalDate: entryData.value.date || undefined,
      restoreSelectedDate: true,
      verbose: false,
    });
  } catch (err) {
    console.error('EntryEditPage.applyPopoverReassignAction error', err);
  }

  popoverState.open = false;
}

// Quick account functions
function openQuickAccountAlert(itemIndex: number) {
  quickAccountTargetIndex.value = itemIndex;
  showQuickAccountAlert.value = true;
}

async function createQuickAccount(name: string, initialBalance: number) {
  const newAccount = await accountsController.addAccount({
    a: {
      name,
      initialBalance,
    },
  });

  if (newAccount && quickAccountTargetIndex.value !== null) {
    const idx = quickAccountTargetIndex.value;
    if (entryItems.value[idx]) {
      entryItems.value[idx].accountId = newAccount.id;
    }
  }

  quickAccountTargetIndex.value = null;
}

// Validation functions
function isNumericValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  return /^-?\d*\.?\d+$/.test(String(value));
}

function isPositiveValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

function getAmountError(index: number): string {
  const amount = entryItems.value[index]?.amount;
  if (!isNumericValue(amount)) return 'Solo se permiten números';
  if (!isPositiveValue(amount)) return 'El valor debe ser mayor a 0';
  return '';
}

function isAmountInvalid(index: number): boolean {
  const amount = entryItems.value[index]?.amount;
  return !isNumericValue(amount) || !isPositiveValue(amount);
}

function isAmountTouched(index: number): boolean {
  const amount = entryItems.value[index]?.amount;
  return amount !== null && amount !== undefined && String(amount) !== '';
}
// end functions
</script>

<style>
button.alert-button.danger-alert-btn {
  color: var(--ion-color-danger);
}
</style>
