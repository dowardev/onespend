<template>
  <ion-modal
    :is-open="isOpen"
    :keep-contents-mounted="true"
    @did-dismiss="$emit('dismiss')"
  >
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
          <!-- Ellipsis button opens a popover with the date picker -->
          <ion-button fill="clear" title="Más" @click="openReassignPopover($event)">
            <ion-icon :icon="ellipsisHorizontalOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <!-- Reassign toolbar removed — only the Ionic picker remains in content -->
    </ion-header>

    <ion-content class="ion-padding-end">
      <!-- Reasignar fecha (Ionic picker) - only one instance remains further down in the content -->
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

      <template v-if="!entryData.id && addEntrySegment === 'entry'">
        <ion-list class="transparent">
          <div class="list-content">
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

            <ion-item class="transparent" lines="none">
              <ion-label position="stacked">Nombre</ion-label>

              <ion-input
                v-model="entryData.name"
                placeholder="Nombre"
                autofocus
              ></ion-input>
            </ion-item>
          </div>
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

          <div class="list-content">
            <ion-card
              v-for="(item, index) in entryItems"
              :key="index"
              class="shadow1"
            >
              <ion-item lines="full" class="transparent">
                <ion-label position="stacked">Cantidad</ion-label>

                <ion-input
                  v-model.number="item.amount"
                  type="number"
                  placeholder="0"
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

            <ion-note
              v-if="accountsList.length === 0"
              color="warning"
              class="ion-padding-start"
            >
              No hay cuentas. Crea una para continuar.
            </ion-note>
          </div>
        </ion-list>
      </template>

      <template v-if="!entryData.id && addEntrySegment === 'provider'">
        <ion-list>
          <div v-if="providersTodayWithData.length" class="list-content">
            <ion-item
              v-for="p in providersTodayWithData"
              :key="p.id"
              lines="full"
              :button="!!p.accountId && !isDayClosed"
              :disabled="!p.accountId || isDayClosed"
              @click="() => p.accountId && !isDayClosed && selectProvider({ provider: p })"
            >
              <ion-label>
                {{ p.name }}
                <p v-if="!p.accountId" style="color: var(--ion-color-warning)">
                  Sin cuenta asignada
                </p>
              </ion-label>
              <ion-note slot="end" :color="p.accountId ? 'primary' : 'medium'">
                {{ formatProviderAmount({ provider: p }) }}
              </ion-note>
            </ion-item>
          </div>

          <template v-else>
            <div class="ion-padding ion-text-center">
              <ion-label>No hay proveedores con datos para este día</ion-label>
            </div>
          </template>
        </ion-list>
      </template>

      <template v-if="entryData.id">
        <ion-list class="transparent">
          <div class="list-content">
            <ion-item class="transparent" lines="none">
              <ion-select
                v-model="entryData.entryType"
                label="Tipo"
                label-placement="stacked"
              >
                <ion-select-option value="ingreso">Ingreso</ion-select-option>

                <ion-select-option value="egreso">Egreso</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item class="transparent" lines="none">
              <ion-label position="stacked">Nombre</ion-label>

              <ion-input
                v-model="entryData.name"
                placeholder="Nombre"
                autofocus
              ></ion-input>
            </ion-item>
          </div>
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

          <div class="list-content">
            <ion-card
              v-for="(item, index) in entryItems"
              :key="index"
              class="shadow2"
            >
              <ion-item class="transparent">
                <ion-label position="stacked">Cantidad</ion-label>

                <ion-input
                  v-model.number="item.amount"
                  type="number"
                  placeholder="0"
                ></ion-input>
              </ion-item>

              <ion-item class="transparent">
                <ion-select
                  v-model="item.accountId"
                  label="Cuenta"
                  label-placement="stacked"
                  :validate="true"
                  error-text="Selecciona una cuenta"
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
              <ion-note
                v-if="accountsList.length === 0"
                color="warning"
                class="ion-padding-horizontal"
              >
                No hay cuentas. Crea una para continuar.
              </ion-note>

              <ion-item class="transparent" lines="none">
                <ion-button
                  slot="end"
                  color="danger"
                  fill="clear"
                  :disabled="isDayClosed"
                  >Eliminar</ion-button
                >
              </ion-item>
            </ion-card>
            <!-- Reassign control moved into popover (opened via ellipsis) -->
          </div>
        </ion-list>
      </template>
    </ion-content>

    <!-- Popover with date picker (opened from header ellipsis) -->
    <ion-popover
      :is-open="popoverState.open"
      :event="popoverState.event"
      @did-dismiss="popoverState.open = false"
    >
      <ion-content class="ion-padding">
        <div style="min-width:220px; max-width:320px">
          <ion-item lines="none">
            <ion-label position="stacked">Seleccionar fecha</ion-label>
            <ion-datetime
              v-if="showPicker"
              ref="reassignPicker"
              :value="reassignDateISO"
              :key="reassignDateISO"
              v-model="reassignDateISO"
              presentation="date"
              style="background: transparent; width: 100%"
              @ionChange="onReassignDatetimeChange"
            ></ion-datetime>
          </ion-item>

          <ion-item lines="full" style="margin-top:8px">
            <ion-button slot="start" fill="clear" size="small" @click="popoverState.open = false">Cancelar</ion-button>
            <ion-button slot="end" size="small" color="primary" :disabled="!reassignDate" @click="applyPopoverReassign">Aplicar</ion-button>
          </ion-item>
        </div>
      </ion-content>
    </ion-popover>
    </ion-modal>
</template>

<script setup lang="ts">
// Imports
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonCard,
  IonNote,
  IonListHeader,
  IonToast,
  IonPopover,
} from '@ionic/vue';

import {
  addOutline,
  closeOutline,
  saveOutline,
  trashOutline,
  calendarOutline,
  ellipsisHorizontalOutline,
} from 'ionicons/icons';
import { computed, ref, watch, onMounted, reactive, nextTick } from 'vue';
import budgetController from '@/controllers/budgetController';
import { format } from 'date-fns';

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
// End Imports

// Components

// End Components

// Vars
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
]);

const addEntrySegment = ref('entry');
const entryItems = ref<Array<{ amount: number; accountId: string | number | null }>>([
  { amount: 0, accountId: null },
]);
// reassignDate holds the short date (yyyy-MM-dd) used for persistence
const reassignDate = ref<string | null>(null);
// reassignDateISO holds full ISO value bound to ion-datetime (some Ionic versions need full ISO)
const reassignDateISO = ref<string | null>(null);
const popoverState = reactive({ open: false, event: null as Event | null });
const reassignPicker = ref<any>(null);
const showToast = ref(false);
const toastMessage = ref('');
const toastColor = ref<'success' | 'danger' | 'primary'>('success');
// Controls whether ion-datetime is mounted. Toggling forces a remount so it reads v-model value.
const showPicker = ref(true);
// store the initial date shown in the picker to detect no-op applies
const reassignInitialShort = ref<string | null>(null);

async function openReassignPopover(e: Event) {
  try {
    // eslint-disable-next-line no-console
    console.log('EditEntryModal.openReassignPopover - reassignDateISO:', reassignDateISO.value, 'reassignDate:', reassignDate.value, 'showPicker:', showPicker.value);
  } catch (err) {}
  // prepare ISO value for the picker before opening the popover
  try {
    // prefer already-normalized ISO, else build from short date
    if (!reassignDateISO.value) {
      if (reassignDate.value) {
        reassignDateISO.value = `${String(reassignDate.value).slice(0,10)}T00:00:00`;
      } else if ((props.entryData as any)?.date) {
        const raw = (props.entryData as any).date;
        if (typeof raw === 'string' && raw.includes('T')) reassignDateISO.value = raw.length >= 19 ? raw.slice(0,19) : raw + 'T00:00:00';
        else if (typeof raw === 'string') reassignDateISO.value = `${raw.slice(0,10)}T00:00:00`;
        else if (typeof raw === 'number') reassignDateISO.value = format(new Date(raw), 'yyyy-MM-dd') + 'T00:00:00';
      } else {
        reassignDateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
      }
    }
  } catch (err) {
    reassignDateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
  }

    // capture initial short date for comparison
    try {
      reassignInitialShort.value = reassignDateISO.value ? String(reassignDateISO.value).slice(0,10) : (reassignDate.value ?? null);
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
      iso = val.length >= 10 && val.includes('T') ? val : `${String(val).slice(0,10)}T00:00:00`;
    } else if (val instanceof Date) {
      iso = format(val, "yyyy-MM-dd") + 'T00:00:00';
    } else {
      iso = String(val).slice(0, 10) + 'T00:00:00';
    }
    reassignDateISO.value = iso;
    reassignDate.value = iso.slice(0, 10);
    // debug log removed
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('EditEntryModal.onReassignDatetimeChange error', err);
  }
}
async function handleApplyReassign() {
  // Attempt to read the picker's raw/current value first — sometimes v-model is not updated yet
  let finalDate: string | null = null;
  try {
    const picker = reassignPicker && (reassignPicker as any).value;
    const pickerRaw = picker ? (picker.value ?? (picker.getValue ? picker.getValue() : undefined)) : undefined;
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
  if (!finalDate) finalDate = reassignDate.value ?? (reassignDateISO.value ? String(reassignDateISO.value).slice(0, 10) : null);
  if (!finalDate) return;

  // Debug: indicate handler invoked and show picker/raw values
  try {
    const picker = reassignPicker && (reassignPicker as any).value;
    const pickerRaw = picker ? (picker.value ?? (picker.getValue ? picker.getValue() : undefined)) : undefined;
    // eslint-disable-next-line no-console
    console.log('EditEntryModal.handleApplyReassign invoked - finalDate:', finalDate, 'reassignDate:', reassignDate.value, 'reassignDateISO:', reassignDateISO.value, 'pickerRaw:', pickerRaw, 'initialShort:', reassignInitialShort.value);
  } catch (err) {
    // ignore
  }

  // First, emit to parent so parent can react if it listens
  try { emit('reassign-date', finalDate); } catch (err) {}

  // Then attempt to perform the move locally as a reliable fallback so the button always works
  try {
    const prevSelected = budgetController.getSelectedDate && budgetController.getSelectedDate();

    // Resolve original date for the entry
    let originalDate: string | null = (props.entryData as any).date || null;
    if (!originalDate) {
      // try to find in controller or via other means
      try {
        const found = budgetController.getEntries().find((en: any) => String(en.id) === String((props.entryData as any).id));
        if (found && found.date) originalDate = found.date;
      } catch (err) {}
    }
    if (!originalDate) originalDate = prevSelected || format(new Date(), 'yyyy-MM-dd');
    originalDate = String(originalDate).slice(0, 10);

    // Ensure we have the original bucket loaded
    try { budgetController.setDate({ date: originalDate }); } catch (err) {}
    await budgetController.loadDataForDate({ date: originalDate });

    // Resolve id in store
    const storeEntry = budgetController.getEntries().find((en: any) => String(en.id) === String((props.entryData as any).id));
    const idToUse = storeEntry ? storeEntry.id : (props.entryData as any).id;

    // Update and persist
    budgetController.updateIngreso({ id: idToUse, changes: { date: finalDate } });
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
        const srcEntry = srcEntries.find((en: any) => String(en.id) === String(idToUse));
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

          try { budgetController.setDate({ date: finalDate }); } catch (err) {}
          await budgetController.loadDataForDate({ date: finalDate });
          if ((srcEntry as any).entryType === 'ingreso') budgetController.addIngreso(payload);
          else budgetController.addEgreso(payload);
          await budgetController.saveData();
        }
      } catch (err) {
        try { console.error('EditEntryModal.handleApplyReassign fallback error', err); } catch (e) {}
      }
    }

    // Restore prev selected view
    try {
      if (prevSelected && prevSelected !== originalDate) {
        try { budgetController.setDate({ date: prevSelected }); } catch (err) {}
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
    try { console.error('EditEntryModal.handleApplyReassign - error', err); } catch (e) {}
    toastMessage.value = 'Error reasignando entrada';
    toastColor.value = 'danger';
    showToast.value = true;
  }
}
// End Vars

// Functions
function getDefaultAccountId() {
  return props.accountsList.length > 0 ? props.accountsList[0].id : null;
}

const availableAccountsForItem = (currentIndex: number) => {
  const usedAccountIds = entryItems.value
    .filter((_: unknown, idx: number) => idx !== currentIndex)
    .map((item: { accountId: string | number | null }) => String(item.accountId))
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
    entryItems.value.push({ amount: 0, accountId: getDefaultAccountId() });
  }
}

function handleSave() {
  if (!isFormValid.value) return;

  const totalAmount = entryItems.value.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const payload = {
    entryType: entryData.value.entryType,
    name: entryData.value.name,
    amount: totalAmount,
    accountId: entryItems.value[0]?.accountId ?? null,
    groups: entryItems.value,
  };

  // Debug log to help trace save events from the modal
  try {
    // debug log removed
  } catch (e) {}

  emit('save', payload);
}
// End Functions

// Life cycle
onMounted(() => {
  // Ensure entryItems have a default accountId if accounts are available
  try {
    if (
      entryItems.value.length > 0 &&
      (entryItems.value[0].accountId === null || entryItems.value[0].accountId === undefined) &&
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

// End Life cycle

// Computed
const isFormValid = computed(() => {
  return (
    entryData.value.name.trim().length > 0 &&
    entryData.value.entryType &&
    entryItems.value.length > 0 &&
    entryItems.value.every(
      item => Number(item.amount) > 0 && item.accountId != null
    )
  );
});

const entryData = computed(() => props.entryData);

const canAddMoreItems = computed(() => {
  return entryItems.value.length < props.accountsList.length + 2;
});
// End Computed

// Watch
watch(
  () => props.entryData.id,
  async (newId, oldId) => {
    if (newId !== oldId) {
      if (newId) {
        const newData = props.entryData;
        try {
          // quick debug to confirm modal received entryData
          // eslint-disable-next-line no-console
          console.log('EditEntryModal.watch - opening modal for id:', newData.id, 'raw date:', (newData as any).date);
        } catch (e) {}
        if (
          newData.groups &&
          Array.isArray(newData.groups) &&
          newData.groups.length > 0
        ) {
          entryItems.value = newData.groups.map((g: EntryGroup) => ({
            amount: Number(g.amount) || 0,
            accountId: g.accountId ?? getDefaultAccountId(),
          }));
        } else {
          entryItems.value = [
            {
              amount: Number(newData.amount) || 0,
              accountId: newData.accountId || getDefaultAccountId(),
            },
          ];
        }
        // initialize reassign date when editing an existing entry
        try {
          const raw = (newData as any).date;
          let resolved: string | null = null;
          // If raw is missing try to find the entry in the controller store
          if (!raw) {
            try {
              const fromStore = budgetController.getEntries().find((en: any) => String(en.id) === String(newData.id));
              if (fromStore && fromStore.date) resolved = fromStore.date;
            } catch (err) {
              // ignore
            }
          } else {
            resolved = raw as any;
          }

          if (!resolved) {
            // try to use the controller's selected date as last resort
            try {
              const sel = budgetController.getSelectedDate && budgetController.getSelectedDate();
              if (sel) resolved = sel;
            } catch (err) {}
            reassignDate.value = resolved ? (String(resolved).slice(0,10)) : format(new Date(), 'yyyy-MM-dd');
          } else if (typeof resolved === 'string') {
            reassignDate.value = resolved.length >= 10 ? resolved.slice(0, 10) : resolved;
          } else if (typeof resolved === 'number') {
            reassignDate.value = format(new Date(resolved), 'yyyy-MM-dd');
          } else if (resolved instanceof Date) {
            reassignDate.value = format(resolved, 'yyyy-MM-dd');
          } else {
            reassignDate.value = String(resolved).slice(0, 10);
          }
        } catch (e) {
          reassignDate.value = format(new Date(), 'yyyy-MM-dd');
        }
        // Debug: log the initialized reassignDate and ensure ISO value is set for the picker
        try {
        // debug log removed
        } catch (e) {}

        try {
          const rawVal = (newData as any).date;
          if (rawVal && typeof rawVal === 'string' && rawVal.includes('T')) {
            reassignDateISO.value = rawVal.length >= 19 ? rawVal.slice(0, 19) : rawVal + 'T00:00:00';
          } else if (typeof rawVal === 'number') {
            reassignDateISO.value = format(new Date(rawVal), "yyyy-MM-dd") + 'T00:00:00';
          } else if (reassignDate.value) {
            reassignDateISO.value = `${reassignDate.value}T00:00:00`;
          } else {
            reassignDateISO.value = format(new Date(), "yyyy-MM-dd") + 'T00:00:00';
          }

          // Force remount of the ion-datetime so it reliably reads the ISO value
          showPicker.value = false;
          await nextTick();
          showPicker.value = true;

          // small delay to allow component to mount and reflect value
          await new Promise(res => setTimeout(res, 80));

          // try to log underlying picker state and force underlying input value
          try {
            const picker = reassignPicker && (reassignPicker as any).value;
            // debug log removed
            try {
              const el = picker.el ?? picker.$el ?? picker;
              const input = el && (el.shadowRoot ? el.shadowRoot.querySelector('input') : el.querySelector && el.querySelector('input'));
              // if we found an input element in the shadow DOM, set its value and dispatch events
              if (input) {
                try {
                  const short = reassignDateISO.value ? String(reassignDateISO.value).slice(0, 10) : '';
                  input.value = short;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                  // debug log removed
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.warn('EditEntryModal - could not set underlying input value', err);
                }
              }
              // also try to set picker.value directly
              try {
                if (picker) {
                  if (typeof picker.setValue === 'function') picker.setValue(reassignDateISO.value);
                  else picker.value = reassignDateISO.value;
                }
              } catch (err) {
                // ignore
              }
              // debug log removed
            } catch (err) {}
          } catch (err) {}

          // debug log removed
        } catch (e) {
          // ignore
        }
      } else if (entryItems.value.length === 0 || 
                 (entryItems.value.length === 1 && entryItems.value[0].amount === 0)) {
        entryItems.value = [{ amount: 0, accountId: getDefaultAccountId() }];
        addEntrySegment.value = 'entry';
      }
    }
  },
  { immediate: true }
);
// End Watch
</script>

<script lang="ts">
// This extra script block is intentionally empty; template-level logic is handled above.
</script>
