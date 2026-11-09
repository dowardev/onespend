<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <EditPageHeader
      :title="isEditing ? 'Editar Entrada' : 'Nueva Entrada'"
      :is-save-disabled="v$.$invalid"
      :show-options-button="isEditing"
      @back="handleBack"
      @save="handleSave"
      @options="openOptionsPopover"
    />

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-sm="8" size-md="6" size-lg="4">
            <section class="ion-padding-start ion-padding-end">
              <ion-list class="transparent">
                <ion-card class="shadow1">
                  <ion-item lines="full" class="transparent">
                    <ion-select
                      v-model="entryData.entryType"
                      interface="popover"
                      :label="t('budget.entries.entryeditpage.text1')"
                      label-placement="stacked"
                    >
                      <ion-select-option value="ingreso">Ingreso</ion-select-option>
                      <ion-select-option value="egreso">Egreso</ion-select-option>
                    </ion-select>
                  </ion-item>

                  <ion-item lines="full" class="transparent" button data-cy="category-selector" @click="openCategoryPicker()">
                    <ion-label>{{ t('budget.entries.entryeditpage.label1') }}</ion-label>
                    <ion-label slot="end" class="ion-text-end" color="medium">
                      {{ selectedCategoryName || t('common.select') }}
                    </ion-label>
                  </ion-item>

                  <ion-item class="transparent" lines="full">
                    <ion-input
                      v-model="entryData.name"
                      :label="t('budget.entries.entryeditpage.text2')"
                      label-placement="floating"
                      :placeholder="t('budget.entries.entryeditpage.placeholder')"
                      data-cy="entry-name-input"
                    />
                  </ion-item>

                    <div v-if="v$.name?.$error" class="validation-error">
                      <span v-if="v$.name?.required?.$invalid">El nombre es obligatorio</span>
                    </div>

                  <ion-item lines="full" class="transparent" button @click="entryDatePicker.openPopover({ e: $event })">
                    <ion-label>{{ t('budget.entries.entryeditpage.label2') }}</ion-label>
                    <ion-label slot="end">{{ toShortDate({ isoDate: entryDatePicker.dateISO.value }) }}</ion-label>
                  </ion-item>

                    <div v-if="v$.date?.$error" class="validation-error">
                      <span v-if="v$.date?.required?.$invalid">La fecha es obligatoria</span>
                    </div>

                  <ion-item lines="full" class="transparent" button data-cy="entry-time-trigger" @click="openTimePicker({ e: $event })">
                    <ion-label>{{ t('budget.entries.entryeditpage.labelTime', 'Hora') }}</ion-label>
                    <ion-label slot="end" class="ion-text-end" color="medium">
                      {{ entryTime || t('common.select') }}
                    </ion-label>
                  </ion-item>

                </ion-card>
              </ion-list>

              <AccountDistributionPicker
                :items="entryItems"
                :header-label="t('budget.entries.entryeditpage.text3')"
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

  <!-- LBDS-273: time picker popover (same component, presentation="time"). -->
  <!-- GitLab #17 (P6): no explicit `locale` — the picker follows the active
       app language. The 24h cycle stays explicit: that is a format
       decision, not a language one. -->
  <DatePickerPopover
    :popover-state="timePickerPopover"
    :temp-picker-date-iso="timeTemp"
    :can-apply="true"
    presentation="time"
    hour-cycle="h24"
    @did-dismiss="timePickerPopover.open = false"
    @cancel="timePickerPopover.open = false"
    @apply="confirmTime"
    @update:temp-picker-date-iso="timeTemp = $event ? String($event).slice(11, 16) : ''"
  />

    <!-- options popover -->
    <ion-popover
      :is-open="optionsPopoverState.open"
      :event="optionsPopoverState.event"
      @did-dismiss="optionsPopoverState.open = false"
    >
      <ion-content>
        <ion-item button @click="handleReassignFromPopover">
          <ion-label>{{ t('budget.entries.entryeditpage.label3') }}</ion-label>
        </ion-item>
        <ion-item button @click="handleDeleteFromPopover">
          <ion-icon slot="start" :icon="trashOutline" color="danger" />
          <ion-label color="danger">{{ t('common.delete') }}</ion-label>
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

    <!-- category picker modal -->
    <CategoryPickerModal
      :is-open="showCategoryPicker"
      :categories="entryCategories"
      :selected-id="categoryId"
      @select="onCategorySelect"
      @dismiss="showCategoryPicker = false"
    />
    <!-- end category picker modal -->
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
  toastController,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { trashOutline } from 'ionicons/icons';
import { computed, ref, onMounted, reactive, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { format } from 'date-fns';
import { useBudgetDay } from '@/composables/useBudgetDay';
import budgetEntriesController from '@/controllers/budgetEntriesController';
import { useAttachments } from '@/composables/useAttachments';
import { parseDateValue, toShortDate } from '@/utils/dateHelpers';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import { useDatePicker } from '@/composables/useDatePicker';
import { required, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import EditPageHeader from '@/views/budget/components/EditPageHeader.vue';
import AccountDistributionPicker from '@/views/budget/components/AccountDistributionPicker.vue';
import DeleteConfirmAlert from '@/views/budget/components/DeleteConfirmAlert.vue';
import DatePickerPopover from '@/views/budget/components/DatePickerPopover.vue';
import CategoryPickerModal from '@/components/CategoryPickerModal.vue';
import DetailsSection from '@/views/budget/components/DetailsSection.vue';
import { useEntryLoader } from '@/composables/useEntryLoader';
import { entryCategoriesDb } from '@/db/controllers/entryCategoriesDb';
// end imports

// interface and types imports
interface EntryGroup {
  amount: number;
  accountId: string | number | { id: string | number } | null;
}
import type { EntryCategoryRow } from '@/db/types';
// end interface and types imports

// router
const router = useRouter();
const { t } = useLocale();
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

const entryNotes = ref<string | undefined>(undefined);
const entrySyncId = ref<string | null>(null);
const categoryId = ref<string | null>(null);
const entryCategories = ref<EntryCategoryRow[]>([]);
const showCategoryPicker = ref(false);
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

// LBDS-273 (GitLab #13): optional HH:MM mirror of the recurring `time`
// column. Empty string = no time set; the save path coerces '' to
// undefined so the mapper drops the key from the push payload. The
// load path populates from `entryAny.time` (already normalized to
// HH:MM by the live pull mapper, `SyncQueueService.mapServerItemToRow`).
const entryTime = ref<string>('');

// LBDS-273: popover state for the time picker. Same pattern as the
// date picker's `useDatePicker()`, but inline (the date composable
// doesn't support a `presentation` prop). The popover uses direct
// binding on `entryTime` (no temp value) — time selection is atomic,
// there's no calendar navigation to cancel.
const timePickerPopover = reactive({ open: false, event: null as Event | null });
const timeTemp = ref<string>('');

function openTimePicker(params: { e: Event }) {
  // LBDS-273: seed the temp with the current value so the picker opens
  // on the currently-set time. On Apply, confirmTime copies timeTemp
  // back into entryTime. On Cancel/Dismiss, timeTemp is discarded and
  // entryTime stays untouched — matches the date picker's UX.
  timeTemp.value = entryTime.value;
  timePickerPopover.event = params.e;
  timePickerPopover.open = true;
}

function confirmTime() {
  entryTime.value = timeTemp.value;
  timePickerPopover.open = false;
}

const reassignDate = ref<string | null>(null);

const optionsPopoverState = reactive({
  open: false,
  event: null as Event | null,
});
// end vars and const

// vuelidate
const itemsValid = (items: Array<{ amount: number | string; accountId: unknown }>) => {
  if (!items || items.length === 0) return false
  return items.every(item => {
    const val = String(item.amount).trim()
    return val !== '' && !isNaN(Number(val)) && Number(val) > 0 && item.accountId != null
  })
}

const rules = computed(() => ({
  name: { required },
  date: { required },
  entryType: { required },
  items: { itemsValid: helpers.withMessage('Todos los items deben tener un monto válido y una cuenta asignada', itemsValid) },
}))

const v$ = useVuelidate(rules, computed(() => {
  const pickerDate = entryDatePicker.dateISO.value
  return {
    name: entryData.value.name,
    date: entryData.value.date || (pickerDate ? pickerDate.slice(0, 10) : ''),
    entryType: entryData.value.entryType,
    items: entryItems.value,
  }
})) as any
// end vuelidate

// Computed from route
const isEditing = computed(() => !!route.query.entryId);

const selectedCategoryName = computed(() => {
  if (!categoryId.value) return '';
  return entryCategories.value.find((c) => c.id === categoryId.value)?.name || '';
});

// end computed

// onmounted
onMounted(async () => {
  await entryCategoriesDb.ensureSeeded();
  entryCategories.value = await entryCategoriesDb.getAll();

  // Performance "Agregar" navigation carries entryType + date query params (REQ-6).
  // Validate strictly and fall back to the current defaults on any malformed value.
  const queryType = String(route.query.entryType || '');
  const queryDate = String(route.query.date || '');

  if (isEditing.value && route.query.entryId) {
    await loadEntry(route.query.entryId as string);
  } else {
    entryItems.value = [{ amount: '', accountId: null }];
    const budgetDayStore = useBudgetDay();
    const selectedDate = budgetDayStore.selectedDate;
    const dateStr = selectedDate
      ? selectedDate.slice(0, 10) + 'T00:00:00'
      : format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
    entryDatePicker.setDate({ date: dateStr });
    // LBDS-273: default the time to "now" for new entries. Edit flow
    // leaves it untouched so `loadEntry` can populate from the row.
    // The user can still clear it by tapping the trigger and dismissing
    // the popover without picking.
    entryTime.value = format(new Date(), 'HH:mm');
  }

  if (queryType === 'ingreso' || queryType === 'egreso') {
    entryData.value = { ...entryData.value, entryType: queryType };
    categoryId.value = null; // entryType reset clears any category (REQ-4 AC-4.1)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
    const parsed = new Date(queryDate + 'T00:00:00');
    if (!isNaN(parsed.getTime())) {
      entryDatePicker.setDate({ date: queryDate + 'T00:00:00' });
    }
  }
});
// end onmounted

// watch
watch(() => entryData.value.entryType, () => {
  categoryId.value = null;
});
// end watch

// functions
async function loadEntry(entryId: string) {
  const { loadEntryFromDb } = useEntryLoader();
  const entry = await loadEntryFromDb({ entryId });

  if (!entry) {
    const { toastController } = await import('@ionic/vue');
    const toast = await toastController.create({
      message: t('budget.entries.entryeditpage.message'),
      duration: 3000,
    });
    await toast.present();
    router.replace('/budget');
    return;
  }

  const entryAny = entry as any;
  entryData.value = {
    id: entryAny.id,
    entryType: entryAny.entryType || 'ingreso',
    name: entryAny.name || '',
    date: entryAny.date || '',
  };

  // LBDS-275 F1: preserve the absence of notes as `undefined` instead of
  // coercing to `''`, so `toApiFormat` can omit the key from the push payload
  // when the row never had a note. Coercing to `''` would let the first edit
  // of a pre-fix row silently wipe any server-side note the row might carry.
  entryNotes.value = entryAny.notes;
  categoryId.value = entryAny.category ?? null;
  entrySyncId.value = entryAny.sync_id || null;
  // LBDS-273: hydrate the time from the loaded entry. `entryAny.time` is
  // already normalized to HH:MM by the live pull mapper
  // (`SyncQueueService.mapServerItemToRow`) on pull.
  entryTime.value = entryAny.time ?? '';

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
  // Close the confirm alert immediately so the user gets feedback that the
  // tap registered.
  deleteConfirm.showDeleteAlert.value = false;

  if (!entryData.value.id) {
    router.back();
    return;
  }

  let deleteSucceeded = false;

  try {
    // LBDS-280: the attachment delete is now a sync-queue enqueue (no HTTP),
    // so we can await it cheaply. The queue's retry/backoff/DLQ machinery
    // owns the server-side delete; if it fails, the entry is still gone
    // locally and queued for sync, so the user's intent is honoured.
    if (entrySyncId.value) {
      await deleteAllAttachments();
    }
    // Optimistic entry delete: local Dexie + sync queue enqueue (no HTTP,
    // so no waiting on the server). Matches the pattern in RecurringEditPage
    // and ProviderEditPage.
    await budgetEntriesController.removeEntry({ id: entryData.value.id });
    deleteSucceeded = true;
  } catch (err) {
    console.error('EntryEditPage.confirmDelete error', err);
  }

  await showDeleteToast({
    message: deleteSucceeded ? 'Entrada eliminada' : 'No se pudo eliminar la entrada',
    color: deleteSucceeded ? 'success' : 'danger',
  });

  // Always navigate — the user confirmed the delete; we either succeeded
  // (entry gone, queued for sync) or hit a rare catastrophic local-Dexie
  // failure. In both cases the confirmation dialog is dismissed and the
  // user moves on.
  router.back();
}

async function showDeleteToast(params: { message: string; color: 'success' | 'danger' }) {
  const toast = await toastController.create({
    message: params.message,
    duration: 2500,
    color: params.color,
    position: 'bottom',
  });
  await toast.present();
}

function resolveEntryDate(entry: any): string {
  if (entry?.date) {
    return parseDateValue({ raw: entry.date }).slice(0, 10);
  }
  const budgetDayStore = useBudgetDay();
  const selectedDate = budgetDayStore.selectedDate;
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

function openCategoryPicker() {
  showCategoryPicker.value = true;
}

function onCategorySelect(category: EntryCategoryRow) {
  categoryId.value = category.id;
  showCategoryPicker.value = false;
}

async function handleSave() {
  const isValid = await v$.value.$validate()
  if (!isValid) return

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
    category: categoryId.value ?? undefined,
  };

  if (entryDatePicker.dateISO.value) {
    payload.date = entryDatePicker.dateISO.value.slice(0, 10);
  }

  let createdSyncId: string | undefined;
  const isEditingMode = !!route.query.entryId;

  if (isEditingMode) {
    const targetId = entryData.value.id ?? String(route.query.entryId);
    const originalDate = entryData.value.date;
    const hasDateChanged = payload.date && payload.date !== originalDate;

    if (hasDateChanged) {
      await budgetEntriesController.updateIngreso({
        id: targetId,
        changes: {
          entryType: payload.entryType,
          name: payload.name,
          amount: payload.amount,
          accountId: payload.accountId,
          groups: payload.groups,
          notes: payload.notes,
          category: payload.category,
          // LBDS-273: optional time. Empty string → undefined so the
          // mapper drops the key from the push payload.
          time: entryTime.value || undefined,
        } as any,
      });
      const { reassignEntry } = await import('@/composables/useReassignEntry');
      await reassignEntry({
        entryId: targetId,
        newDate: payload.date,
        verbose: false,
      });
    } else {
      await budgetEntriesController.updateIngreso({
        id: targetId,
        changes: {
          entryType: payload.entryType,
          name: payload.name,
          amount: payload.amount,
          accountId: payload.accountId,
          groups: payload.groups,
          notes: payload.notes,
          category: payload.category,
          // LBDS-273: optional time. Empty string → undefined so the
          // mapper drops the key from the push payload.
          time: entryTime.value || undefined,
        } as any,
      });
    }
  } else {
    // GitLab #16 (P1): the `totalAmount > 0` guard was dead code — the
    // `itemsValid` vuelidate rule already guarantees every item has an
    // amount > 0 and an account, so `totalAmount` is > 0 by the time the
    // save reaches this point. The create path now runs unconditionally.
    const entryDataAny: any = {
      name: payload.name,
      amount: payload.amount,
      accountId: payload.accountId,
      groups: payload.groups,
      category: payload.category,
      // LBDS-275: notes must travel on the create path. The form already
      // builds the note into the payload, but the controller's addIngreso /
      // addEgreso used to ignore it, so the row was written without notes.
      notes: payload.notes,
      // LBDS-273: optional time. Empty string → undefined so the mapper
      // drops the key from the push payload.
      time: entryTime.value || undefined,
    };
    if (payload.date) {
      entryDataAny.date = payload.date;
    }
    if (payload.entryType === 'ingreso') {
      const saved = await budgetEntriesController.addIngreso(entryDataAny);
      createdSyncId = saved?.sync_id;
    } else {
      const saved = await budgetEntriesController.addEgreso(entryDataAny);
      createdSyncId = saved?.sync_id;
    }
  }

  const entrySyncIdValue = entrySyncId.value || createdSyncId || String(route.query.entryId ?? '') || null;
  const isNewEntry = !isEditingMode;

  if (entrySyncIdValue) {
    entrySyncId.value = entrySyncIdValue;
    await saveAttachments({ isSynced: !isNewEntry });
  }

  router.back();
}

  async function onAttachmentsSave(params: { newFiles: File[]; deletedIds: number[] }) {
    await handleAttachmentsSave(params);
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

  const entryId = entryData.value.id;
  if (entryId == null || entryId === undefined) return;
  try {
    const { reassignEntry } = await import('@/composables/useReassignEntry');
    await reassignEntry({
      entryId,
      newDate: finalDate,
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

<style scoped>
</style>
