<template>
  <ion-modal
    :is-open="isOpen"
    :keep-contents-mounted="true"
    @did-dismiss="onModalDidDismiss"
  >
    <!-- header -->
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="$emit('dismiss')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{
          entryData.id ? 'Editar Entrada' : 'Nueva Entrada'
        }}</ion-title>

        <ion-buttons slot="end">
          <ion-button
            v-if="entryData.id"
            fill="clear"
            color="danger"
            :disabled="isDayClosed"
            @click="$emit('delete')"
          >
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>

          <ion-button
            :disabled="!isFormValid || isDayClosed"
            @click="handleSave"
          >
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <!-- end header -->

    <!-- content -->
    <ion-content>
      <!-- New entry segment selector -->
      <ion-grid v-if="!entryData.id">
        <ion-row class="ion-justify-content-center">
          <ion-col size="6">
            <ion-segment v-model="addEntrySegment" scrollable>
              <ion-segment-button value="entry">
                <ion-label>Registro</ion-label>
              </ion-segment-button>

              <ion-segment-button value="provider">
                <ion-label>Proveedores</ion-label>
              </ion-segment-button>
            </ion-segment>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- New entry - Entry form -->
      <template v-if="!entryData.id && addEntrySegment === 'entry'">
        <div class="ion-padding-start ion-padding-end">
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
                  autofocus
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
              <ion-label>Detalles</ion-label>

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
                    <ion-icon :icon="closeOutline" color="danger"></ion-icon>
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
                    @click="$emit('quick-account', index)"
                  >
                    <ion-icon :icon="addOutline"></ion-icon>
                  </ion-button>
                </ion-item>
              </ion-card>
            </template>
          </ion-list>
        </div>
      </template>

      <!-- New entry - Provider selection -->
      <section class="ion-padding-start ion-padding-end">
        <template v-if="!entryData.id && addEntrySegment === 'provider'">
          <ion-list>
            <ion-list-header>
              <ion-label>Provedores</ion-label>

              <ion-button>
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
                    () =>
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

            <template v-else>
              <div class="ion-padding ion-text-center">
                <ion-label
                  >No hay proveedores con datos para este día</ion-label
                >
              </div>
            </template>
          </ion-list>
        </template>
      </section>

      <!-- Edit existing entry -->
      <section class="ion-padding">
        <template v-if="entryData.id">
          <ion-list class="transparent">
            <ion-card class="shadow1">
              <ion-item class="transparent" lines="full">
                <ion-select
                  v-model="entryData.entryType"
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
                  autofocus
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
              <ion-label>Detalles</ion-label>

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
                    <ion-icon :icon="closeOutline" color="danger"></ion-icon>
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

                <ion-item lines="full" class="transparent">
                  <ion-select
                    v-model="item.accountId"
                    label="Cuenta"
                    label-placement="stacked"
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
                    @click="$emit('quick-account', index)"
                  >
                    <ion-icon :icon="addOutline"></ion-icon>
                  </ion-button>
                </ion-item>
              </ion-card>
            </template>
          </ion-list>
        </template>
      </section>
    </ion-content>
    <!-- end content -->

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

    <!-- alerts -->
    <!-- end alerts -->
  </ion-modal>
</template>

<script setup lang="ts">
// imports
import {
  IonModal,
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
} from '@ionic/vue';
import {
  addOutline,
  closeOutline,
  refreshOutline,
  saveOutline,
  trashOutline,
} from 'ionicons/icons';
import { computed, ref, watch, onMounted, reactive, nextTick } from 'vue';
import { format } from 'date-fns';
// end imports

// controllers
import budgetController from '@/controllers/budgetController';
// end controllers

// components
// end components

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
// end interface and types imports

// main
const props = defineProps<{
  isOpen: boolean;
  entryData: {
    id: string | number | null;
    entryType: 'ingreso' | 'egreso';
    name: string;
    amount?: number;
    groups?: Array<{ amount: number; accountId: string | number | null }>;
  };
  accountsList: Array<{ id: string | number; name: string }>;
  isDayClosed: boolean;
  providersTodayWithData: Array<{
    id: string | number;
    name: string;
    estimated: number;
    accountId: string | number | null;
  }>;
}>();

const emit = defineEmits([
  'dismiss',
  'save',
  'delete',
  'quick-account',
  'select-provider',
  'reassign-date',
  'reassigned',
]);
// end main

// vars and const
const addEntrySegment = ref('entry');
const entryItems = ref<
  Array<{ amount: number | string; accountId: string | number | null }>
>([{ amount: '', accountId: null }]);
// reassignDate holds the short date (yyyy-MM-dd) used for persistence
const reassignDate = ref<string | null>(null);
// reassignDateISO holds full ISO value bound to ion-datetime (some Ionic versions need full ISO)
const reassignDateISO = ref<string | null>(null);
// entryDateISO holds the date for new entries created via the modal
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
const showToast = ref(false);
const toastMessage = ref('');
const toastColor = ref<'success' | 'danger' | 'primary'>('success');
// Controls whether ion-datetime is mounted. Toggling forces a remount so it reads v-model value.
const showPicker = ref(true);
// store the initial date shown in the picker to detect no-op applies
const reassignInitialShort = ref<string | null>(null);

// Validación simple para amount (sin Vuelidate forEach)
function isNumericValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  return /^-?\d*\.?\d+$/.test(String(value));
}

function isPositiveValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

// Helper para obtener error de amount por índice
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
// end vars and const

// watch
watch(
  () => props.entryData,
  async (newData, oldData) => {
    const newId = newData?.id;
    const oldId = oldData?.id;
    const isNewEntry = !newId;
    const dateChanged = newData?.date !== oldData?.date;

    // Trigger on id change, or when creating new entry and date changes
    if (newId !== oldId || (isNewEntry && dateChanged)) {
      const defaultAccountId = getDefaultAccountId();

      if (newId) {
        // Editing existing entry
        entryItems.value = initEntryItems(newData, defaultAccountId);

        const resolvedDate = resolveEntryDate(newData);
        reassignDate.value = resolvedDate;
        reassignDateISO.value = toISODateTime(resolvedDate);
        entryDateISO.value = reassignDateISO.value;
        pickerDateISO.value = reassignDateISO.value;

        // Force remount of ion-datetime to ensure it reads the new value
        showPicker.value = false;
        await nextTick();
        showPicker.value = true;
      } else {
        // Creating new entry
        entryItems.value = [{ amount: '', accountId: defaultAccountId }];
        addEntrySegment.value = 'entry';

        const date = newData?.date
          ? parseEntryDate(newData.date)
          : format(new Date(), 'yyyy-MM-dd');
        const isoDate = toISODateTime(date);
        entryDateISO.value = isoDate;
        pickerDateISO.value = isoDate;
      }
    }
  },
  { immediate: true }
);
// end watch

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

const entryData = computed(() => props.entryData);

const canAddMoreItems = computed(() => {
  return entryItems.value.length < props.accountsList.length;
});
// end computed

// onmounted
onMounted(() => {
  // Ensure entryItems have a default accountId if accounts are available
  try {
    if (
      entryItems.value.length > 0 &&
      (entryItems.value[0].accountId === null ||
        entryItems.value[0].accountId === undefined) &&
      props.accountsList &&
      props.accountsList.length > 0
    ) {
      entryItems.value = entryItems.value.map(item => ({
        amount: Number(item.amount) || 0,
        accountId: item.accountId ?? props.accountsList[0].id,
      }));
    }
  } catch (e) {}
});
// end onmounted

// functions
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

  // Try to find date from store
  if (entry?.id) {
    const fromStore = budgetController
      .getEntries()
      .find((e: any) => String(e.id) === String(entry.id));
    if (fromStore?.date) return parseEntryDate(fromStore.date);
  }

  // Fallback to controller's selected date
  const selectedDate = budgetController.getSelectedDate?.();
  if (selectedDate) return parseEntryDate(selectedDate);

  return format(new Date(), 'yyyy-MM-dd');
}

function initEntryItems(entry: any, defaultAccountId: string | number | null) {
  if (entry?.groups?.length > 0) {
    return entry.groups.map((g: EntryGroup) => ({
      amount: g.amount ?? '',
      accountId: g.accountId ?? defaultAccountId,
    }));
  }

  return [
    {
      amount: entry?.amount ?? '',
      accountId: entry?.accountId || defaultAccountId,
    },
  ];
}
// end Date helpers

function getDefaultAccountId() {
  return props.accountsList.length > 0 ? props.accountsList[0].id : null;
}

const availableAccountsForItem = (currentIndex: number) => {
  const usedAccountIds = entryItems.value
    .filter((_: unknown, idx: number) => idx !== currentIndex)
    .map((item: { accountId: string | number | null }) =>
      String(item.accountId)
    )
    .filter((id: string) => id !== 'null' && id !== 'undefined' && id !== '');
  return props.accountsList.filter(
    (acc: { id: string | number }) => !usedAccountIds.includes(String(acc.id))
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
  emit('select-provider', provider);
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

function handleSave() {
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
  };

  // Include date for both new entries and updates
  if (entryDateISO.value) {
    payload.date = entryDateISO.value.slice(0, 10);
  }

  emit('save', payload);
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
  // Initialize picker with current entry date
  pickerDateISO.value = entryDateISO.value;
  showEntryDatePicker.value = false;
  await nextTick();
  showEntryDatePicker.value = true;
  entryDatePopoverState.event = e;
  entryDatePopoverState.open = true;
}

function cancelPicker() {
  pickerDateRef.value?.$el.cancel();
  entryDatePopoverState.open = false;
}

function onPickerDateChange(event: CustomEvent) {
  // Actualizar pickerDateISO cuando el usuario selecciona una fecha manualmente
  pickerDateISO.value = event.detail.value;
}

function confirmPicker() {
  pickerDateRef.value?.$el.confirm();
  entryDateISO.value = pickerDateISO.value;
  entryDatePopoverState.open = false;
}

function goToToday() {
  // Establecer la fecha de hoy y forzar re-renderizado
  const today = new Date();
  pickerDateISO.value = format(today, 'yyyy-MM-dd') + 'T00:00:00';
  pickerDateKey.value++;
}

// Reassign date functions
async function openReassignPopover(e: Event) {
  // prepare ISO value for the picker before opening the popover
  try {
    // prefer already-normalized ISO, else build from short date
    if (!reassignDateISO.value) {
      if (reassignDate.value) {
        reassignDateISO.value = `${String(reassignDate.value).slice(0, 10)}T00:00:00`;
      } else if ((props.entryData as any)?.date) {
        const raw = (props.entryData as any).date;
        if (typeof raw === 'string' && raw.includes('T'))
          reassignDateISO.value =
            raw.length >= 19 ? raw.slice(0, 19) : raw + 'T00:00:00';
        else if (typeof raw === 'string')
          reassignDateISO.value = `${raw.slice(0, 10)}T00:00:00`;
        else if (typeof raw === 'number')
          reassignDateISO.value =
            format(new Date(raw), 'yyyy-MM-dd') + 'T00:00:00';
      } else {
        reassignDateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
      }
    }
  } catch (err) {
    reassignDateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
  }

  // capture initial short date for comparison
  try {
    reassignInitialShort.value = reassignDateISO.value
      ? String(reassignDateISO.value).slice(0, 10)
      : (reassignDate.value ?? null);
  } catch (err) {}

  // force remount of the picker so it reads the v-model
  try {
    showPicker.value = false;
    await nextTick();
    showPicker.value = true;
    // small delay to let component mount
    await new Promise(res => setTimeout(res, 30));
  } catch (err) {}

  popoverState.event = e;
  popoverState.open = true;
}

function applyPopoverReassign() {
  popoverState.open = false;
  // call same handler as Apply inside modal
  void handleApplyReassign();
}

function applyReassignFromPopover() {
  if (!reassignDate.value) return;
  emit('reassign-date', reassignDate.value);
  popoverState.open = false;
}

// IonDatetime change handler — normalize value and keep v-model in sync
function onReassignDatetimeChange(e: any) {
  try {
    const val = e?.detail?.value ?? e;
    if (!val) return;
    let iso: string | null = null;
    if (typeof val === 'string') {
      // val may be 'yyyy-MM-dd' or full ISO
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
    console.error('EditEntryModal.onReassignDatetimeChange error', err);
  }
}

async function handleApplyReassign() {
  // Attempt to read the picker's raw/current value first — sometimes v-model is not updated yet
  let finalDate: string | null = null;
  try {
    const picker = reassignPicker.value && (reassignPicker as any).value;
    const pickerRaw = picker
      ? (picker.value ?? (picker.getValue ? picker.getValue() : undefined))
      : undefined;
    if (pickerRaw) {
      // normalize pickerRaw to short yyyy-MM-dd
      const p = String(pickerRaw);
      finalDate = p.includes('T') ? p.slice(0, 10) : p.slice(0, 10);
      // ensure local models reflect this choice
      reassignDateISO.value = p.includes('T') ? p : `${finalDate}T00:00:00`;
      reassignDate.value = finalDate;
    }
  } catch (err) {
    // ignore
  }

  // Fallback to existing reactive values if picker raw not available
  if (!finalDate)
    finalDate =
      reassignDate.value ??
      (reassignDateISO.value
        ? String(reassignDateISO.value).slice(0, 10)
        : null);
  if (!finalDate) return;

  // First, emit to parent so parent can react if it listens
  try {
    emit('reassign-date', finalDate);
  } catch (err) {}

  // Then attempt to perform the move locally as a reliable fallback so the button always works
  try {
    const prevSelected =
      budgetController.getSelectedDate && budgetController.getSelectedDate();

    // Resolve original date for the entry
    let originalDate: string | null = (props.entryData as any).date || null;
    if (!originalDate) {
      // try to find in controller or via other means
      try {
        const found = budgetController
          .getEntries()
          .find(
            (en: any) => String(en.id) === String((props.entryData as any).id)
          );
        if (found && found.date) originalDate = found.date;
      } catch (err) {}
    }
    if (!originalDate)
      originalDate = prevSelected || format(new Date(), 'yyyy-MM-dd');
    originalDate = String(originalDate).slice(0, 10);

    // Ensure we have the original bucket loaded
    try {
      budgetController.setDate({ date: originalDate });
    } catch (err) {}
    await budgetController.loadDataForDate({ date: originalDate });

    // Resolve id in store
    const storeEntry = budgetController
      .getEntries()
      .find((en: any) => String(en.id) === String((props.entryData as any).id));
    const idToUse = storeEntry ? storeEntry.id : (props.entryData as any).id;

    // Update and persist
    budgetController.updateIngreso({
      id: idToUse,
      changes: { date: finalDate },
    });
    await budgetController.saveData();

    // Verify move
    let moved = false;
    try {
      await budgetController.loadDataForDate({ date: finalDate });
      const destEntries = budgetController.getEntries();
      moved = destEntries.some((en: any) => String(en.id) === String(idToUse));
    } catch (err) {
      // ignore
    }

    if (!moved) {
      // fallback remove+create
      try {
        await budgetController.loadDataForDate({ date: originalDate });
        const srcEntries = budgetController.getEntries();
        const srcEntry = srcEntries.find(
          (en: any) => String(en.id) === String(idToUse)
        );
        if (srcEntry) {
          const payload: any = {
            name: srcEntry.name,
            amount: srcEntry.amount,
            paymentType: srcEntry.paymentType,
            accountId: srcEntry.accountId ?? null,
            groups: srcEntry.groups ?? [],
          };

          budgetController.removeIngreso({ id: idToUse });
          await budgetController.saveData();

          try {
            budgetController.setDate({ date: finalDate });
          } catch (err) {}
          await budgetController.loadDataForDate({ date: finalDate });
          if ((srcEntry as any).entryType === 'ingreso')
            budgetController.addIngreso(payload);
          else budgetController.addEgreso(payload);
          await budgetController.saveData();
        }
      } catch (err) {
        console.error('EditEntryModal.handleApplyReassign fallback error', err);
      }
    }

    // Restore prev selected view
    try {
      if (prevSelected && prevSelected !== originalDate) {
        try {
          budgetController.setDate({ date: prevSelected });
        } catch (err) {}
        await budgetController.loadDataForDate({ date: prevSelected });
      }
    } catch (err) {}

    // Show success toast
    try {
      toastMessage.value = 'Entrada reasignada';
      toastColor.value = 'success';
      showToast.value = true;
      await new Promise(res => setTimeout(res, 700));
    } catch (err) {}

    // Emit reassigned and close everything
    emit('reassigned');
    emit('dismiss');
    popoverState.open = false;
  } catch (err) {
    console.error('EditEntryModal.handleApplyReassign - error', err);
    toastMessage.value = 'Error reasignando entrada';
    toastColor.value = 'danger';
    showToast.value = true;
  }
}
// Reset modal internals when closed
function resetForm() {
  try {
    addEntrySegment.value = 'entry';
    entryItems.value = [{ amount: '', accountId: getDefaultAccountId() }];
    reassignDate.value = null;
    reassignDateISO.value = null;
    entryDateISO.value = null;
    pickerDateISO.value = null;
    pickerDateKey.value = 0;
    popoverState.open = false;
    popoverState.event = null;
    entryDatePopoverState.open = false;
    entryDatePopoverState.event = null;
    showPicker.value = true;
    reassignInitialShort.value = null;
    showToast.value = false;
    toastMessage.value = '';
    toastColor.value = 'success';
  } catch (err) {
    // noop
  }
}

// Handler invoked when the ion-modal fires did-dismiss
function onModalDidDismiss() {
  emit('dismiss');
  resetForm();
}

// Watch isOpen to reset if parent closes the modal programmatically
watch(
  () => props.isOpen,
  opened => {
    if (!opened) {
      setTimeout(() => resetForm(), 80);
    }
  }
);
// end functions
</script>
