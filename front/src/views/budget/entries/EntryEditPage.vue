<template>
  <ion-page>
    <EditPageHeader
      :title="isEditing ? 'Editar Entrada' : 'Nueva Entrada'"
      :is-save-disabled="!isFormValid || isDayClosed"
      :show-options-button="isEditing"
      :is-options-disabled="isDayClosed"
      @back="handleBack"
      @save="handleSave"
      @options="openOptionsPopover"
    />

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="4">
            <section class="ion-padding-start ion-padding-end">
              <ion-list class="transparent">
                <ion-card class="shadow1">
                  <ion-item lines="full" class="transparent">
                    <ion-select
                      v-model="entryData.entryType"
                      interface="popover"
                      label="Tipo"
                      label-placement="stacked"
                    >
                      <ion-select-option value="ingreso">Ingreso</ion-select-option>
                      <ion-select-option value="egreso">Egreso</ion-select-option>
                    </ion-select>
                  </ion-item>

                  <ion-item class="transparent" lines="full">
                    <ion-input
                      v-model="entryData.name"
                      label="Nombre"
                      label-placement="floating"
                      placeholder="Pepito"
                    />
                  </ion-item>

                  <ion-item lines="full" class="transparent" button @click="entryDatePicker.openPopover({ e: $event })">
                    <ion-label>Fecha</ion-label>
                    <ion-label slot="end">{{ toShortDate({ isoDate: entryDatePicker.dateISO.value }) }}</ion-label>
                  </ion-item>
                </ion-card>
              </ion-list>

              <AccountDistributionPicker
                :items="entryItems"
                header-label="Cuentas"
                :can-add-more="canAddMoreItems"
                :is-day-closed="isDayClosed"
                @add-item="addEntryItem"
                @remove-item="removeEntryItem"
                @update-item-amount="updateItemAmount"
                @update-item-account="onUpdateItemAccount"
              />

              <DetailsSection
                :notes="entryNotes"
                :show-attachments-modal="showAttachmentsModal"
                :pending-attachments="pendingAttachments"
                :existing-attachments="existingAttachments"
                @update:notes="entryNotes = $event"
                @open-attachments="handleOpenAttachments"
                @dismiss-attachments="closeAttachmentsModal"
                @save-attachments="onAttachmentsSave"
              />
            </section>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>

    <!-- popovers -->
  <DatePickerPopover
    :popover-state="reassignPicker.popoverState"
    :temp-picker-date-iso="reassignPicker.tempPickerDateISO.value"
    :can-apply="reassignPicker.canApply.value"
    @did-dismiss="reassignPicker.closePopover()"
    @cancel="reassignPicker.closePopover()"
    @apply="applyReassignDate"
    @update:temp-picker-date-iso="reassignPicker.tempPickerDateISO.value = $event"
  />

  <DatePickerPopover
    :popover-state="entryDatePicker.popoverState"
    :temp-picker-date-iso="entryDatePicker.tempPickerDateISO.value"
    :can-apply="entryDatePicker.canApply.value"
      @did-dismiss="entryDatePicker.closePopover()"
      @cancel="entryDatePicker.closePopover()"
      @apply="confirmEntryDate"
      @update:temp-picker-date-iso="entryDatePicker.tempPickerDateISO.value = $event"
    />

    <!-- options popover -->
    <ion-popover
      :is-open="optionsPopoverState.open"
      :event="optionsPopoverState.event"
      @did-dismiss="optionsPopoverState.open = false"
    >
      <ion-content>
        <ion-item button :disabled="isDayClosed" @click="handleReassignFromPopover">
          <ion-label>Reasignar fecha</ion-label>
        </ion-item>
        <ion-item button :disabled="isDayClosed" @click="handleDeleteFromPopover">
          <ion-icon slot="start" :icon="trashOutline" color="danger" />
          <ion-label color="danger">Eliminar</ion-label>
        </ion-item>
      </ion-content>
    </ion-popover>
    <!-- end options popover -->

    <!-- alerts -->
    <DeleteConfirmAlert
      :is-open="deleteConfirm.showDeleteAlert.value"
      message="¿Estás seguro de que deseas eliminar esta entrada?"
      :buttons="deleteConfirm.deleteAlertButtons"
      @did-dismiss="deleteConfirm.showDeleteAlert.value = false"
    />

    <!-- end alerts -->
  </ion-page>
</template>

<script setup lang="ts">
// imports
import {
  IonPage,
  IonButton,
  IonIcon,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonCard,
  IonPopover,
} from '@ionic/vue';
import { trashOutline } from 'ionicons/icons';
import { computed, ref, onMounted, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { format } from 'date-fns';
import budgetController from '@/controllers/budgetController';
import { useAttachments } from '@/composables/useAttachments';
import { parseDateValue, toShortDate } from '@/utils/dateHelpers';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import { useDatePicker } from '@/composables/useDatePicker';
import EditPageHeader from '@/views/budget/components/EditPageHeader.vue';
import AccountDistributionPicker from '@/views/budget/components/AccountDistributionPicker.vue';
import DeleteConfirmAlert from '@/views/budget/components/DeleteConfirmAlert.vue';
import DatePickerPopover from '@/views/budget/components/DatePickerPopover.vue';
import DetailsSection from '@/views/budget/components/DetailsSection.vue';
// end imports

// interface and types imports
interface EntryGroup {
  amount: number;
  accountId: string | number | { id: string | number } | null;
}
// end interface and types imports

// router
const router = useRouter();
const route = useRoute();
// end router

// vars and const
const entryItems = ref<Array<{ amount: number | string; accountId: string | number | { id: string | number } | null }>>([
  { amount: '', accountId: null },
]);

const entryData = ref({
  id: null as string | number | null,
  entryType: 'ingreso' as 'ingreso' | 'egreso',
  name: '',
  date: '',
});

const entryNotes = ref('');
const entrySyncId = ref<string | null>(null);
const {
  showAttachmentsModal,
  pendingAttachments,
  existingAttachments,
  deletedAttachments,
  openAttachments: handleOpenAttachments,
  handleAttachmentsSave,
  saveAttachments,
  deleteAllAttachments,
  dismissModal: closeAttachmentsModal,
} = useAttachments({ entityType: 'entries', syncId: entrySyncId });

const deleteConfirm = useDeleteConfirm({
  onConfirm: confirmDelete,
});

const reassignPicker = useDatePicker();
const entryDatePicker = useDatePicker();

const reassignDate = ref<string | null>(null);

const optionsPopoverState = reactive({
  open: false,
  event: null as Event | null,
});
// end vars and const

// Computed from route
const isEditing = computed(() => !!route.query.entryId);
const isDayClosed = computed(() => false);

// computed
const isFormValid = computed(() => {
  return (
    entryData.value.name.trim().length > 0 &&
    entryData.value.entryType &&
    entryItems.value.length > 0 &&
    entryItems.value.every((item) => {
      const val = String(item.amount).trim();
      return val !== '' && !isNaN(Number(val)) && Number(val) > 0 && item.accountId != null;
    })
  );
});

const canAddMoreItems = computed(() => true);
// end computed

// onmounted
onMounted(async () => {
  if (isEditing.value && route.query.entryId) {
    await loadEntry(route.query.entryId as string);
  } else {
    entryItems.value = [{ amount: '', accountId: null }];
    const selectedDate = budgetController.getSelectedDate();
    const dateStr = selectedDate
      ? selectedDate.slice(0, 10) + 'T00:00:00'
      : format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
    entryDatePicker.setDate({ date: dateStr });
  }
});
// end onmounted

// functions
async function loadEntry(entryId: string) {
  const entries = budgetController.getEntries();
  const entry = entries.find((e: any) => String(e.id) === String(entryId));

  if (!entry) return;

  const entryAny = entry as any;
  entryData.value = {
    id: entryAny.id,
    entryType: entryAny.entryType || 'ingreso',
    name: entryAny.name || '',
    date: entryAny.date || '',
  };

  entryNotes.value = entryAny.notes || '';
  entrySyncId.value = entryAny.sync_id || null;

  function normalizeAccountId(accountId: unknown): { id: string | number } | null {
    if (!accountId) return null;
    if (typeof accountId === 'object' && accountId !== null && 'id' in accountId) {
      return { id: (accountId as { id: string | number }).id };
    }
    return { id: accountId as string | number };
  }

  if (entryAny.groups && Array.isArray(entryAny.groups) && entryAny.groups.length > 0) {
    entryItems.value = entryAny.groups.map((g: EntryGroup) => ({
      amount: g.amount ?? '',
      accountId: normalizeAccountId(g.accountId),
    }));
  } else {
    entryItems.value = [
      {
        amount: entryAny.amount ?? '',
        accountId: normalizeAccountId(entryAny.accountId),
      },
    ];
  }

  const resolvedDate = resolveEntryDate(entryAny);
  reassignDate.value = resolvedDate;
  reassignPicker.setDate({ date: resolvedDate });
  entryDatePicker.setDate({ date: resolvedDate });
}

function handleBack() {
  router.back();
}

function openOptionsPopover(e: Event) {
  optionsPopoverState.event = e;
  optionsPopoverState.open = true;
}

function handleReassignFromPopover() {
  optionsPopoverState.open = false;
  openReassignPopover({ e: optionsPopoverState.event! });
}

function handleDeleteFromPopover() {
  optionsPopoverState.open = false;
  deleteConfirm.openDeleteAlert();
}

async function confirmDelete() {
  if (entryData.value.id) {
    if (entrySyncId.value) {
      await deleteAllAttachments();
    }
    budgetController.removeIngreso({ id: entryData.value.id });
    budgetController.saveData();
  }
  deleteConfirm.showDeleteAlert.value = false;
  router.back();
}

function resolveEntryDate(entry: any): string {
  if (entry?.date) {
    return parseDateValue({ raw: entry.date }).slice(0, 10);
  }
  const selectedDate = budgetController.getSelectedDate?.();
  if (selectedDate) return parseDateValue({ raw: selectedDate }).slice(0, 10);
  return format(new Date(), 'yyyy-MM-dd');
}

function addEntryItem() {
  entryItems.value.push({ amount: '', accountId: null });
}

function removeEntryItem(params: { index: number }) {
  if (entryItems.value.length > 1) {
    entryItems.value.splice(params.index, 1);
  }
}

function updateItemAmount(params: { index: number; amount: string }) {
  entryItems.value[params.index].amount = params.amount;
}

function onUpdateItemAccount(params: { index: number; accountId: { id: string | number } | null }) {
  const { index, accountId } = params;
  if (entryItems.value[index]) {
    entryItems.value[index].accountId = accountId;
  }
}

async function handleSave() {
  if (!isFormValid.value) return;

  function getAccountIdValue(accountId: unknown): string | number | null {
    if (!accountId) return null;
    if (typeof accountId === 'object' && accountId !== null && 'id' in accountId) {
      return (accountId as { id: string | number }).id ?? null;
    }
    return accountId as string | number;
  }

  const totalAmount = entryItems.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const payload: any = {
    entryType: entryData.value.entryType,
    name: entryData.value.name,
    amount: totalAmount,
    accountId: getAccountIdValue(entryItems.value[0]?.accountId),
    groups: entryItems.value.map((item) => ({
      amount: Number(item.amount) || 0,
      accountId: getAccountIdValue(item.accountId),
    })),
    notes: entryNotes.value,
  };

  if (entryDatePicker.dateISO.value) {
    payload.date = entryDatePicker.dateISO.value.slice(0, 10);
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
          notes: payload.notes,
        } as any,
      });
    }
    savedEntry = budgetController
      .getEntries()
      .find((e: any) => String(e.id) === String(entryData.value.id));
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
    entrySyncId.value = entrySyncIdValue;
    await saveAttachments({ isSynced: !isNewEntry });
  }

  router.back();
}

function onAttachmentsSave(params: { newFiles: File[]; deletedIds: number[] }) {
  handleAttachmentsSave(params);
}

async function openReassignPopover(params: { e: Event }) {
  const { e } = params;
  if (!reassignPicker.dateISO.value) {
    const src = reassignDate.value || entryData.value.date;
    if (src) {
      const iso = src.includes('T') ? src : `${src.slice(0, 10)}T00:00:00`;
      reassignPicker.setDate({ date: iso });
    }
  }
  await reassignPicker.openPopover({ e });
}

async function applyReassignDate() {
  const finalDate = reassignPicker.applyDate();
  if (!finalDate) return;
  reassignDate.value = finalDate;

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
    console.error('EntryEditPage.applyReassignDate error', err);
  }
}

function confirmEntryDate() {
  entryDatePicker.applyDate();
}
// end functions
</script>
