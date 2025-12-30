<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar style="--background: white">
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>

        <ion-title>Presupuesto </ion-title>

        <ion-buttons slot="end">
          <!-- button more options -->
          <ion-button
            @click="
              popovers.moreOptions.event = $event;
              popovers.moreOptions.open = true;
            "
          >
            <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content style="--background: white">
      <section>
        <ion-item lines="none" class="transparent">
          <ion-buttons>
            <ion-segment v-model="activeView" scrollable>
              <ion-segment-button value="inicio">Inicio</ion-segment-button>

              <ion-segment-button value="proveedores"
                >Proveedores</ion-segment-button
              >
            </ion-segment>
          </ion-buttons>

          <ion-buttons slot="end">
            <ion-button
              title="Retroceder un día"
              @click="changeDate({ days: -1 })"
            >
              <ion-icon :icon="chevronBackOutline"></ion-icon>
            </ion-button>

            <ion-button
              title="Seleccionar fecha"
              @click="openDatePopover({ event: $event })"
            >
              {{ formattedSelectedDate }}
            </ion-button>

            <ion-button title="Avanzar un día" @click="changeDate(1)">
              <ion-icon :icon="chevronForwardOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-item>
      </section>

      <section>
        <ion-grid v-if="activeView === 'inicio'">
          <ion-row>
            <ion-col size="12">
              <InicioViewComponent
                :entries="entries"
                :providers="proveedores"
                :selected-date="selectedDate"
                :controls-disabled="controlsDisabled"
                :total-estimacion-efectivo-tarjeta="
                  totalEstimacionEfectivoTarjeta
                "
                :faltante="faltante"
                @create-entry="onSelectEntryType"
                @delete-ingreso="onDeleteIngreso"
                @options-popover-did-dismiss="onOptionsPopoverDidDismiss"
                @update-ingreso="handleUpdateIngreso"
                @add-egresos="handleAddEgresosFromChild"
                @delete-egresos-group="handleDeleteEgresosGroup"
              />
            </ion-col>
          </ion-row>
        </ion-grid>

        <ion-grid v-if="activeView === 'proveedores'">
          <ion-row>
            <ion-col size="12">
              <ProvidersToggleComponent
                :selected-date="selectedDate"
                :providers="proveedores"
                :ingreso-efectivo="totalIngresosEfectivo"
                :ingreso-tarjeta="totalIngresosDigital"
                :ingreso-credito="0"
              />
            </ion-col>
          </ion-row>
        </ion-grid>

        <!-- final day -->
        <FinishDayForm
          v-if="showFinishForm"
          :finish-day="finishDay"
          @save="saveFinishDay"
        />
      </section>

      <!-- popover -->
      <ion-popover
        :is-open="popovers.date.open"
        :event="popovers.date.event"
        :keep-contents-mounted="true"
        @did-dismiss="onPopoverDidDismiss"
      >
        <ion-content class="centered-popover">
          <ion-datetime
            v-model="selectedDate"
            style="background: transparent"
            presentation="date"
            @ion-change="e => (selectedDate = String(e?.detail?.value))"
          ></ion-datetime>

          <ion-item>
            <ion-button
              slot="end"
              fill="clear"
              class="no-shadow"
              color="primary"
              size="small"
              @click="resetToToday()"
            >
              Hoy
            </ion-button>
          </ion-item>
        </ion-content>
      </ion-popover>

      <!-- popover more options -->

      <ion-popover
        :is-open="popovers.moreOptions.open"
        :event="popovers.moreOptions.event"
        :keep-contents-mounted="true"
        :dismiss-on-select="true"
        @did-dismiss="popovers.moreOptions.open = false"
      >
        <ion-content>
          <!-- on/off day -->
          <ion-item
            lines="none"
            button
            @click="onExecutionToggle({ detail: { checked: !isInExecution } })"
          >
            <ion-toggle
              :key="toggleKey"
              :enable-on-off-labels="true"
              :checked="isInExecution"
              :aria-label="`Estado del día: ${isInExecution ? 'Abierto' : 'Cerrado'}`"
              @ion-change="onExecutionToggle"
              @click.stop
            >
              {{ isInExecution ? 'Abierto' : 'Cerrado' }}
            </ion-toggle>

            <ion-button
              slot="start"
              fill="clear"
              title="Info"
              @click.stop="
                popovers.inforSuppliers.event = $event;
                popovers.inforSuppliers.open = true;
              "
            >
              <ion-icon :icon="informationCircleSharp"></ion-icon>
            </ion-button>
          </ion-item>

          <!-- Button clear day -->
          <ion-item
            button
            :disabled="controlsDisabled"
            @click="confirmClearDay()"
          >
            <ion-icon
              slot="start"
              :icon="trashOutline"
              color="danger"
            ></ion-icon>
            <ion-label>Vaciar dia</ion-label>
          </ion-item>

          <!-- Button finsh day (removed; replaced by toggle) -->
        </ion-content>
      </ion-popover>

      <!-- Info popover for the execution toggle -->
      <ion-popover
        :is-open="popovers.inforSuppliers.open"
        :event="popovers.inforSuppliers.event"
        :keep-contents-mounted="true"
        @did-dismiss="() => (popovers.inforSuppliers.open = false)"
      >
        <ion-content class="ion-padding" style="max-width: 320px">
          <p>Conmuta el toggle para abrir o cerrar el día.</p>
          <p>
            <strong>Día abierto:</strong> registra y edita ingresos y
            proveedores.
          </p>
          <p>
            <strong>Día cerrado:</strong> completa el formulario «Datos finales»
            y pulsa <em>Guardar</em> para incluir el día en los reportes; la
            vista quedará en solo lectura.
          </p>
          <ion-button
            slot="bottom"
            fill="clear"
            @click="popovers.inforSuppliers.open = false"
            >Cerrar</ion-button
          >
        </ion-content>
      </ion-popover>

      <!-- end popover -->

      <!-- confirmation alert -->
      <ion-alert
        :is-open="deleteConfirm.open"
        header="Confirmar eliminación"
        :message="`¿Eliminar proveedor «${deleteConfirm.providerName}»? Esta acción no se puede deshacer.`"
        :buttons="getAlertButtons()"
        @did-dismiss="onDeleteAlertDidDismiss"
      ></ion-alert>
      <!-- end confirmation alert -->

      <!-- clear day confirmation alert -->
      <ion-alert
        :is-open="clearDayConfirm.open"
        header="Vaciar día"
        message="¿Deseas eliminar todos los proveedores e ingresos de la fecha seleccionada? Esta acción no se puede deshacer."
        :buttons="[
          {
            text: 'Cancelar',
            role: 'cancel',
            cssClass: 'secondary',
            handler: onClearDayDismiss,
          },
          { text: 'Vaciar', cssClass: 'danger', handler: performClearDay },
        ]"
        @did-dismiss="onClearDayDismiss"
      ></ion-alert>
      <!-- end clear day confirmation alert -->

      <!-- validation alert when trying to close without data -->
      <ion-alert
        :is-open="closeValidation.open"
        header="No se puede cerrar el día"
        :message="closeValidation.message"
        :buttons="[
          {
            text: 'Aceptar',
            role: 'cancel',
            handler: acceptCloseValidation,
          },
        ]"
        @did-dismiss="acceptCloseValidation"
      ></ion-alert>
      <!-- end close validation alert -->

      <!-- overwrite confirm when products modal would overwrite provider efectivo -->
      <ion-alert
        :is-open="overwriteConfirm.open"
        header="Sobrescribir valor"
        :message="`El proveedor «${overwriteConfirm.providerName}» ya tiene valores en Efectivo o Tarjeta. ¿Deseas sobrescribir Efectivo con ${formatCurrency({ v: overwriteConfirm.total })}?`"
        :buttons="[
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => {
              overwriteConfirm.open = false;
              overwriteConfirm._resolve?.(false);
              overwriteConfirm._resolve = null;
            },
          },
          {
            text: 'Sobrescribir',
            cssClass: 'danger',
            handler: () => {
              overwriteConfirm.open = false;
              overwriteConfirm._resolve?.(true);
              overwriteConfirm._resolve = null;
            },
          },
        ]"
        @did-dismiss="
          () => {
            if (overwriteConfirm._resolve) {
              overwriteConfirm._resolve(false);
              overwriteConfirm._resolve = null;
            }
            overwriteConfirm.open = false;
          }
        "
      ></ion-alert>
      <!-- end overwrite confirm -->

      <!-- apply conflict alert for templates -->
      <ion-alert
        :is-open="showApplyConflictModal"
        header="Conflicto de datos"
        :message="applyConflictMessage"
        :buttons="[
          { text: 'Cancelar', role: 'cancel', handler: onApplyConflictDismiss },
          { text: 'Combinar', handler: handleApplyConflictCombine },
          {
            text: 'Sobrescribir',
            cssClass: 'danger',
            handler: handleApplyConflictOverwrite,
          },
        ]"
        @did-dismiss="onApplyConflictDismiss"
      ></ion-alert>

      <!-- modals -->
      <!-- products modal -->
      <ion-modal
        style="--height: 90dvh"
        :is-open="modals.products.open"
        :keep-contents-mounted="true"
        :backdrop-dismiss="false"
        @did-dismiss="onProductsModalDidDismiss"
      >
        <ProductsModalComponent
          :products="modals.products.products"
          :quantities="modals.products.quantities"
          :title="modals.products.title"
          @save="payload => handleProductsModalSave(payload)"
          @dismiss="onProductsModalDidDismiss"
        />
      </ion-modal>

      <!-- modal notes -->
      <ion-modal
        :is-open="modals.notes.open"
        :backdrop-dismiss="false"
        @did-dismiss="onNotesModalDidDismiss"
      >
        <ion-header class="ion-no-border" mode="ios">
          <ion-toolbar>
            <ion-buttons>
              <ion-button @click="onNotesModalDidDismiss()">
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-button>
            </ion-buttons>

            <ion-title>Notas</ion-title>

            <ion-buttons slot="end">
              <ion-button @click="saveNotes()">
                <ion-icon :icon="saveOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-card class="shadow1">
            <ion-card-content>
              <ion-textarea
                v-model="modals.notes.content"
                label="Notas"
                label-placement="floating"
                :auto-grow="true"
              ></ion-textarea>
            </ion-card-content>
          </ion-card>
        </ion-content>
      </ion-modal>

      <!-- finish day form moved inline (shown when showFinishForm is true) -->

      <!-- toasts -->
      <ion-toast
        :is-open="toast.open"
        :message="toast.message"
        :duration="toast.duration"
        @did-dismiss="() => (toast.open = false)"
      ></ion-toast>
      <!-- end toasts -->

      <!-- floating buttons removed; replaced by toggle -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import {
  IonSegment,
  IonSegmentButton,
  IonAlert,
  IonButton,
  IonButtons,
  IonMenuButton,
  IonCardContent,
  IonCol,
  IonContent,
  IonDatetime,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonPage,
  IonPopover,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  IonToast,
  IonToggle,
} from '@ionic/vue';
import {
  reactive,
  computed,
  nextTick,
  ref,
  onMounted,
  onUnmounted,
  watch,
  ComponentPublicInstance,
} from 'vue';
import {
  addOutline,
  trashOutline,
  closeOutline,
  saveOutline,
  chevronBackOutline,
  chevronForwardOutline,
  ellipsisVerticalOutline,
  informationCircleSharp,
} from 'ionicons/icons';
import { useRoute } from 'vue-router';
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import { es as esLocale } from 'date-fns/locale';

// interface
type Income = {
  id: string | number;
  name: string;
  amount: number;
  date: string;
  paymentType: 'cash' | 'digital';
  entryType?: 'ingreso' | 'egreso';
  createdAt?: number; // timestamp in ms when entry was created
};

// Provider type used throughout the component. Fields mirror the objects created
// for proveedores and the data persisted in backups. Some fields are optional
// (like _justAdded/_editing) and payment fields are numbers.
type Provider = {
  id: string | number;
  name: string;
  date: string;
  estimated: number;
  dollar: number;
  efectivo: number;
  tarjeta: number;
  credito: number;
  notes: string;
  visited: boolean;
  _justAdded?: boolean;
  _editing?: boolean;
  // Optional persisted supplier key used to reliably map a provider to suppliersProducts
  _supplierKey?: string;
  // Flag indicating provider came from a template
  _fromTemplate?: boolean;
};

type FocusableRef =
  | Element
  | ComponentPublicInstance
  | {
      setFocus?: () => void;
      $el?: { setFocus?: () => void };
      focus?: () => void;
    };
// end interface

// Controllers
import dixieController from '@/controllers/dixie';
import { formatLocalDate } from '@/utils/date';
import backupController from '@/controllers/backupController';
import suppliersController from '@/controllers/suppliersController';
import systemController from '@/controllers/systemConfigController';
// end controllers

// components
import ProductsModalComponent from './modals/PoductsModalComponent.vue';
import ProviderCardComponent from './ProviderCardComponent.vue';
import FinishDayForm from './FinishDayForm.vue';
import ProvidersToggleComponent from './ProvidersComponent.vue';
import SummaryCards from './components/SummaryCards.vue';
import InicioViewComponent from './InicioViewComponent.vue';
// end components

// vars
const entries = reactive([]) as Income[];
const newIngreso = reactive({
  name: '',
  amount: 0,
  date: formatLocalDate(new Date()),
  paymentType: 'cash',
  entryType: 'ingreso' as 'ingreso' | 'egreso',
});
const proveedores = reactive([]) as Provider[];
const newProveedor = reactive({ name: '', estimated: 0, dollar: 0, notes: '' });
const nameInputRefs = reactive(
  {} as Record<string | number, FocusableRef | null>
);
const STORAGE_KEY = 'budget:selectedDate';
// initialize a local YYYY-MM-DD date string to avoid UTC offset issues
const _initialSelectedDate = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
})();

const selectedDate = ref<string>(_initialSelectedDate);
const activeView = ref<'inicio' | 'proveedores'>('inicio');
const route = useRoute();
const popovers = reactive({
  date: { open: false, event: null as unknown },
  inforSuppliers: { open: false, event: null as unknown },
  moreOptions: { open: false, event: null as unknown },
  addEntryType: { open: false, event: null as unknown },
});
const modals = reactive({
  products: {
    open: false,
    event: null as unknown,
    products: [] as any[],
    quantities: {} as Record<string | number, number>,
    providerId: null as string | number | null,
    title: '' as string,
  },
  notes: {
    open: false,
    providerId: null as string | number | null,
    content: '' as string,
  },
  // finishDay was previously stored inside `modals`. It has been extracted
  // to its own reactive object (finishDay) to separate UI modal state from form data.
});

// finishDay: data model for the inline finish-day form
const finishDay = reactive({
  totalSales: 0,
  totalSalesEfectivo: 0,
  totalSalesTarjeta: 0,
  totalSalesCredito: 0,
  type: '%',
  margin: 0,
});

// State used to ask for confirmation before removing a provider
const deleteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '' as string,
});

const providersBodyRef = ref<HTMLElement | null>(null);
// Key used to force remount of the toggle when we need to reset its visual state
const toggleKey = ref(0);

// Refs to the two scrollable lists so we can programmatically scroll them
const notVisitedList = ref<HTMLElement | null>(null);
const visitedList = ref<HTMLElement | null>(null);

// Map of supplier name -> products loaded from suppliers DB
const suppliersProducts = reactive({} as Record<string, any[]>);
// Map of normalized supplier name -> original supplier name (from suppliers DB)
const suppliersNames = reactive({} as Record<string, string>);
const showApplyConflictModal = ref(false);
const applyConflictMessage = ref('');
const pendingApplyPayload = ref<any | null>(null);
const pendingApplyTemplate = ref<any | null>(null);

// Overwrite confirmation alert state used instead of window.confirm
const overwriteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '',
  total: 0,
  // internal resolver used to fulfill the awaiting Promise when the user acts
  _resolve: null as null | ((val: boolean) => void),
});

// Toast state used to inform the user when an action is prevented (e.g. editing a provider from a template)
const toast = reactive({ open: false, message: '', duration: 2500 });
// Previously used an alert to confirm reopening a closed day — removed.
// Reopening logic is performed inline when needed.

// Confirmation state for clearing the current date's data (vaciar día)
const clearDayConfirm = reactive({
  open: false,
  processing: false,
});

const closeValidation = reactive({
  open: false,
  message: '',
});

const dayState = ref<'open' | 'closing' | 'closed'>('open');
const closingIntent = ref(false);

// end vars

// life
onMounted(async () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    selectedDate.value = saved;
  }

  // Global debug listener for child dispatch fallback
  try {
    window.addEventListener('abogaz:update-provider', (e: any) => {
      try {
        console.log(
          'global abogaz:update-provider',
          e?.detail || e?.detail?.payload || e
        );
      } catch (_e) {
        console.log('global abogaz:update-provider (fallback)', e);
      }
    });
  } catch (_e) {
    /* noop */
  }
  // load suppliers/products map used to decide if a provider has products
  await loadSuppliersProducts();
  // load data for the selected date
  await loadDataForDate(selectedDate.value);
  // keep references to avoid unused warnings
  void addIngreso;
  void onIngresoIonInput;
  void onNewIngresoNameInput;
  void onNewIngresoAmountInput;
  void addProveedor;

  const el = providersBodyRef.value as HTMLElement | null;
  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener('pointerdown', handlePointerDown, { passive: true });
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);
  }
});

onUnmounted(() => {
  const el = providersBodyRef.value as HTMLElement | null;
  if (el && typeof el.removeEventListener === 'function') {
    el.removeEventListener('pointerdown', handlePointerDown as any);
    el.removeEventListener('pointerup', handlePointerUp as any);
    el.removeEventListener('pointercancel', handlePointerUp as any);
  }
});
// end life

// watch
watch(
  selectedDate,
  newSelectedDate => {
    try {
      localStorage.setItem(STORAGE_KEY, newSelectedDate);
    } catch (_e) {
      /* noop */
    }
    loadDataForDate(newSelectedDate);
  },
  { immediate: false }
);

// Watch for query param used to force refresh from other views (TemplatesView pushes ?refresh=timestamp)
watch(
  () => route.query.refresh,
  async () => {
    try {
      // Prefer the date provided in the URL query (if any) and update selectedDate accordingly
      const parsedDateFromRouteISO = parseIsoDateFromString(
        route.query.date as string | undefined
      );

      // If a backupId query param is provided, prefer loading that specific backup
      try {
        const backupId = route.query.backupId as string | undefined;
        const loaded = await tryLoadBackupByIdFromRoute(backupId);
        if (loaded) return;
      } catch (_e) {
        /* ignore */
      }

      if (parsedDateFromRouteISO) selectedDate.value = parsedDateFromRouteISO;
      loadDataForDate(selectedDate.value);
    } catch (_e) {
      /* noop */
    }
  },
  { immediate: true }
);

// Deep watchers to trigger auto-save
watch(
  entries,
  () => {
    autoSave();
  },
  { deep: true }
);

watch(
  proveedores,
  () => {
    autoSave();
  },
  { deep: true }
);
// end watch

// Clear temporary closingIntent when the inline finish-day form is closed
watch(
  () => dayState.value,
  (stateValue: 'open' | 'closing' | 'closed') => {
    // If we've exited the closing flow and the day is not closed, clear the temporary intent
    if (stateValue === 'open') {
      // ensure we are back to 'open' state
      dayState.value = 'open';
      // clear the transient alias as well (if present)
      if (typeof closingIntent.value !== 'undefined')
        closingIntent.value = false;
    }
  }
);

// end watch

// Computed
const totalIngresosOnly = computed(() =>
  entries.reduce(
    (s, i) => s + (i.entryType === 'ingreso' ? Number(i.amount || 0) : 0),
    0
  )
);

const totalEgresos = computed(() =>
  entries.reduce(
    (s, i) => s + (i.entryType === 'egreso' ? Number(i.amount || 0) : 0),
    0
  )
);

// Net total: ingresos minus egresos (egresos treated as negative)
const totalIngresos = computed(() =>
  entries.reduce(
    (s, i) =>
      s +
      (i.entryType === 'egreso'
        ? -Number(i.amount || 0)
        : Number(i.amount || 0)),
    0
  )
);

// Search query used by filteredProviders (was missing causing a TS error)
const searchQuery = ref('');

// Filtered providers based on searchQuery
const filteredProviders = computed(() => {
  try {
    const q = String(searchQuery.value || '')
      .trim()
      .toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter((p: any) =>
      (p.name || '').toString().toLowerCase().includes(q)
    );
  } catch (_e) {
    return proveedores;
  }
});

const filteredNotVisited = computed(() =>
  filteredProviders.value.filter((p: any) => !p.visited)
);
const filteredVisited = computed(() =>
  filteredProviders.value.filter((p: any) => !!p.visited)
);

// Enrich providers with precomputed flags/values so child components receive simple props
const enrichedNotVisited = computed(() =>
  filteredNotVisited.value.map((p: any) => ({
    ...p,
    hasProducts: hasProductsFor(p),
    consideredValue: valueToConsider(p),
  }))
);

const enrichedVisited = computed(() =>
  filteredVisited.value.map((p: any) => ({
    ...p,
    hasProducts: hasProductsFor(p),
    paymentIsPrimary: isPaymentPrimary(p),
    consideredValue: valueToConsider(p),
  }))
);

// Totales de ingresos por método de pago (efectivo / digital)
// Treat egresos as negative so payment-method totals reflect signed availability
const totalIngresosEfectivo = computed(() =>
  entries.reduce(
    (s, i) =>
      s +
      (i.paymentType === 'cash'
        ? i.entryType === 'egreso'
          ? -Number(i.amount || 0)
          : Number(i.amount || 0)
        : 0),
    0
  )
);
const totalIngresosDigital = computed(() =>
  entries.reduce(
    (s, i) =>
      s +
      (i.paymentType === 'digital'
        ? i.entryType === 'egreso'
          ? -Number(i.amount || 0)
          : Number(i.amount || 0)
        : 0),
    0
  )
);

const totalProviders = computed(() =>
  proveedores.reduce((s, p) => s + valueToConsider(p), 0)
);
// Total of providers that have been visited (checked)
const totalVisitedProviders = computed(() =>
  proveedores.reduce(
    (s, p) => s + (p.visited ? valueToConsiderExcludingCredito(p) : 0),
    0
  )
);

// Computed lists split by visited flag
// Totals by payment method but only for visited providers (used in "real" accordion breakdown)
const totalVisitedEfectivo = computed(() =>
  proveedores.reduce((s, p) => s + (p.visited ? Number(p.efectivo || 0) : 0), 0)
);
const totalVisitedTarjeta = computed(() =>
  proveedores.reduce((s, p) => s + (p.visited ? Number(p.tarjeta || 0) : 0), 0)
);

// Breakdown of estimation totals by payment method (used in the accordion content)
const totalEstimacionEfectivo = computed(() =>
  proveedores.reduce((s, p) => s + Number(p.efectivo || 0), 0)
);
const totalEstimacionDigital = computed(() =>
  proveedores.reduce((s, p) => s + Number(p.tarjeta || 0), 0)
);

// Formatted date for display using date-fns with Spanish locale
const formattedSelectedDate = computed(() => {
  try {
    const v = selectedDate.value;
    if (!v) return '';
    // parseISO accepts ISO strings; if parse fails, fall back to Date constructor
    let d: Date;
    try {
      d = parseLocalDate(String(v));
      if (isNaN(d.getTime())) throw new Error('invalid');
    } catch (_e) {
      d = new Date(String(v));
      if (isNaN(d.getTime())) return String(v);
    }
    // Example format: "mar 11 nov" or use a longer form like "11 de noviembre de 2025"
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: esLocale });
  } catch (_e) {
    return String(selectedDate.value);
  }
});

const designMode = computed(() => systemController.getDesignMode());

// Binding for the "En ejecucion" toggle and derived view helpers.
// We use a single `dayState` ref (values: 'open' | 'closing' | 'closed') and
// create explicit computed helpers for clarity and to simplify template logic.
const isInExecution = computed(() => dayState.value === 'open');

// Show the main editable grid when the day is open and the finish form is not shown
const showMainGrid = computed(() => dayState.value === 'open');

// Show the finish-day form when we're in the temporary closing flow or the day is closed
const showFinishForm = computed(
  () => dayState.value === 'closing' || dayState.value === 'closed'
);

// Controls (buttons/actions) should be disabled when the day is closed or in the closing flow
const controlsDisabled = computed(() => dayState.value !== 'open');

// Total estimacion considerando exclusivamente efectivo + tarjeta ingresados en proveedores
const totalEstimacionEfectivoTarjeta = computed(() =>
  proveedores.reduce(
    (s, p) => s + Number(p.efectivo || 0) + Number(p.tarjeta || 0),
    0
  )
);

// Faltante: diferencia firmada entre lo disponible y lo requerido (disponible - requerido)
const faltante = computed(() => {
  try {
    const requerido = Number(totalEstimacionEfectivoTarjeta.value) || 0;
    const disponible = Number(totalIngresos.value) || 0;
    // signed difference: disponible - requerido
    return disponible - requerido;
  } catch (_e) {
    return 0;
  }
});

// Faltante por método de pago: efectivo (disponibleEfectivo - requeridoEfectivo)
const faltanteEfectivo = computed(() => {
  try {
    const requerido = Number(totalEstimacionEfectivo.value) || 0;
    const disponible = Number(totalIngresosEfectivo.value) || 0;
    return disponible - requerido;
  } catch (_e) {
    return 0;
  }
});

// Faltante por método de pago: digital (disponibleDigital - requeridoDigital)
const faltanteDigital = computed(() => {
  try {
    const requerido = Number(totalEstimacionDigital.value) || 0;
    const disponible = Number(totalIngresosDigital.value) || 0;
    return disponible - requerido;
  } catch (_e) {
    return 0;
  }
});
// end computed

// functions
// Helper: parse an ISO-like date from a string and return YYYY-MM-DD or null
function parseIsoDateFromString(dateString?: string): string | null {
  if (!dateString) return null;
  try {
    const parsedDate = parseLocalDate(String(dateString));
    return isNaN(parsedDate.getTime()) ? null : formatLocalDate(parsedDate);
  } catch (_e) {
    return null;
  }
}

// Helper: try to load a specific backup by id from the route and populate component state
async function tryLoadBackupByIdFromRoute(backupId?: string) {
  if (!backupId) return false;
  try {
    const idNum = isNaN(Number(backupId)) ? backupId : Number(backupId);
    const b = (await dixieController.getBackup(idNum as any)) as any;
    if (b && b.data) {
      const d = b.data as any;

      entries.splice(
        0,
        entries.length,
        ...(d.ingresos || []).map((i: any) => ({
          id: i.id ?? Date.now() + Math.random(),
          paymentType: i.paymentType === 'digital' ? 'digital' : 'cash',
          createdAt: i.createdAt ?? Date.now(),
          ...i,
        }))
      );

      const normalizedProviders = (d.proveedores || []).map((p: any) => {
        const key = normalizeName(p.name ?? '');
        return {
          id: p.id ?? Date.now() + Math.random(),
          name: p.name ?? '',
          date: p.date ?? selectedDate.value,
          estimated: Number(p.estimated || 0),
          dollar: Number(p.dollar || 0),
          _dbName: p._dbName ?? p.name ?? '',
          efectivo: Number(p.efectivo || 0),
          tarjeta: Number(p.tarjeta || 0),
          credito: Number(p.credito || 0),
          notes: p.notes || '',
          visited: !!p.visited,
          _fromTemplate: !!p._fromTemplate,
          _justAdded: !!p._justAdded,
          _supplierKey: key || undefined,
          _editing: false,
        };
      });

      proveedores.splice(0, proveedores.length, ...normalizedProviders);

      Object.assign(
        newIngreso,
        d.newIngreso || {
          name: '',
          amount: 0,
          date: selectedDate.value,
        }
      );
      Object.assign(
        newProveedor,
        d.newProveedor || {
          name: '',
          estimated: 0,
          dollar: 0,
          notes: '',
        }
      );

      return true;
    }
  } catch (e) {
    console.error('Failed to load backupId from query', e);
  }
  return false;
}

// Small helpers extracted from the original onExecutionToggle to improve readability
async function validateCanCloseDay(): Promise<boolean> {
  const hasIngresos =
    entries.length > 0 && entries.some(i => Number(i.amount || 0) > 0);
  const hasProveedor = proveedores.length > 0;
  if (!hasIngresos || !hasProveedor) {
    const parts: string[] = [];
    if (!hasIngresos) parts.push('al menos un ingreso');
    if (!hasProveedor) parts.push('al menos un proveedor');
    closeValidation.message = `Es necesario registrar ${parts.join(' y ')} antes de cerrar el día.`;
    closeValidation.open = true;
    dayState.value = 'open';
    await nextTick();
    return false;
  }
  return true;
}

async function preloadFinishDayFromBackups() {
  try {
    const all = (await dixieController.listBackups()) as any[];
    const target = (selectedDate.value || '').slice(0, 10);
    const matches = (all || [])
      .filter(
        b =>
          b &&
          b.component === 'BudgetFinishDay' &&
          b.data &&
          b.data.selectedDate &&
          (b.data.selectedDate as string).slice(0, 10) === target
      )
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (matches.length) {
      const latest = matches[0];
      const d = latest.data || {};
      finishDay.totalSalesEfectivo =
        Number(d.totalSalesEfectivo ?? d.totalSales ?? 0) || 0;
      finishDay.totalSalesTarjeta = Number(d.totalSalesTarjeta ?? 0) || 0;
      finishDay.totalSalesCredito = Number(d.totalSalesCredito ?? 0) || 0;
      finishDay.totalSales =
        Number(
          d.totalSales ||
            finishDay.totalSalesEfectivo +
              finishDay.totalSalesTarjeta +
              finishDay.totalSalesCredito
        ) || 0;
      finishDay.type = String(d.type || finishDay.type || '%');
      finishDay.margin = Number(d.margin || 0) || 0;
    }
  } catch (_e) {
    /* ignore preload errors */
  }
}

async function persistFinishDayReopenState() {
  const payloadToSave = {
    component: 'BudgetFinishDay',
    data: {
      selectedDate: formatLocalDate(selectedDate.value),
      totalSalesEfectivo:
        Number(finishDay.totalSalesEfectivo || finishDay.totalSales || 0) || 0,
      totalSalesTarjeta: Number(finishDay.totalSalesTarjeta || 0) || 0,
      totalSalesCredito: Number(finishDay.totalSalesCredito || 0) || 0,
      totalSales:
        Number(finishDay.totalSalesEfectivo || 0) +
          Number(finishDay.totalSalesTarjeta || 0) +
          Number(finishDay.totalSalesCredito || 0) ||
        Number(finishDay.totalSales || 0) ||
        0,
      type: String(finishDay.type || '%'),
      margin: Number(finishDay.margin || 0) || 0,
      closed: false,
    },
    createdAt: Date.now(),
  };

  try {
    await dixieController.addEntry({ entry: payloadToSave });
  } catch (addErr) {
    try {
      await dixieController.putEntry({ entry: payloadToSave });
    } catch (putErr) {
      await backupController.saveBackup({ entry: payloadToSave });
    }
  }
}

async function persistBudgetViewBackup() {
  try {
    const backupPayload = {
      component: 'BudgetView',
      data: {
        selectedDate: formatLocalDate(selectedDate.value),
        ingresos: entries || [],
        entries: entries || [],
        proveedores: proveedores || [],
        newIngreso: newIngreso || {
          name: '',
          amount: 0,
          date: formatLocalDate(selectedDate.value),
        },
        newProveedor: newProveedor || {
          name: '',
          estimated: 0,
          dollar: 0,
          notes: '',
        },
        totals: {
          totalIngresos: Number(totalIngresos.value || 0) || 0,
          totalProviders: Number(totalProviders.value || 0) || 0,
          totalVisitedProviders: Number(totalVisitedProviders.value || 0) || 0,
        },
      },
      createdAt: Date.now(),
    };

    try {
      await dixieController.addEntry({ entry: backupPayload });
    } catch (addErr) {
      try {
        await dixieController.putEntry({ entry: backupPayload });
      } catch (putErr) {
        try {
          await backupController.saveBackup({ entry: backupPayload });
        } catch (_e) {
          /* noop */
        }
      }
    }
  } catch (_e) {
    /* noop */
  }
}

async function removeLocalClosedFlag() {
  try {
    const key = `budget:closed:${String(selectedDate.value || '').slice(0, 10)}`;
    localStorage.removeItem(key);
  } catch (_e) {
    /* noop */
  }
}

async function onExecutionToggle(event: any) {
  try {
    const checked = !!(event?.detail?.checked ?? event?.detail?.value);

    // If user toggles OFF -> attempt to enter closing flow
    if (!checked) {
      if (!(await validateCanCloseDay())) return;

      // Reset/preload defaults
      finishDay.totalSales = Number(finishDay.totalSales || 0) || 0;
      finishDay.totalSalesEfectivo =
        Number(finishDay.totalSalesEfectivo || 0) || 0;
      finishDay.totalSalesTarjeta =
        Number(finishDay.totalSalesTarjeta || 0) || 0;
      finishDay.totalSalesCredito =
        Number(finishDay.totalSalesCredito || 0) || 0;
      finishDay.type = finishDay.type || '%';

      await preloadFinishDayFromBackups();

      closingIntent.value = true;
      dayState.value = 'closing';
      return;
    }

    // If user toggles ON -> reopen the day
    if (dayState.value === 'closing') dayState.value = 'open';

    try {
      await persistFinishDayReopenState();
      await persistBudgetViewBackup();
    } catch (_e) {
      /* noop */
    }

    await removeLocalClosedFlag();

    dayState.value = 'open';
  } catch (err) {
    console.error('onExecutionToggle error:', err);
  }
}

function addIngreso(
  params: {
    name?: string;
    amount?: number;
    entryType?: 'ingreso' | 'egreso';
  } = {}
) {
  // Prevent creation when the day is closed
  if (dayState.value === 'closed') {
    return;
  }

  const { name, amount, entryType } = params;
  const n = name ?? newIngreso.name;
  const a = amount ?? newIngreso.amount;
  const et =
    entryType ?? (newIngreso.entryType as 'ingreso' | 'egreso') ?? 'ingreso';
  if (!n) return;
  entries.push({
    id: Date.now() + Math.random(),
    name: n,
    amount: Number(a) || 0,
    date: formatLocalDate(selectedDate.value),
    paymentType: (newIngreso.paymentType === 'digital' ? 'digital' : 'cash') as
      | 'cash'
      | 'digital',
    entryType: et,
    createdAt: Date.now(),
  });
  newIngreso.name = '';
  newIngreso.amount = 0;
  newIngreso.paymentType = 'cash';
  newIngreso.entryType = 'ingreso';
}

function addIngresoField(entryType: 'ingreso' | 'egreso' = 'ingreso') {
  // Prevent creation when the day is closed
  if (dayState.value === 'closed') {
    // silently ignore when day is closed (UI buttons are disabled in this state)
    return;
  }

  // Add empty income field
  entries.push({
    id: Date.now() + Math.random(),
    name: '',
    amount: 0,
    date: formatLocalDate(selectedDate.value),
    // default payment type for new empty field
    paymentType: 'cash',
    entryType: entryType,
    createdAt: Date.now(),
  } as Income);
}

function updateIngresoAmount(params: { value: any; index: number }) {
  const { value, index } = params;
  entries[index].amount = Number(value) || 0;
}

async function removeIngreso(params: { id: string | number } | any) {
  const id = params && params.id !== undefined ? params.id : params;
  const idx = entries.findIndex((i: any) => i.id === id);
  if (idx >= 0) {
    entries.splice(idx, 1);
    // wait for Vue update; watcher auto-saves
    try {
      await nextTick();
      console.log(
        'removeIngreso: ingreso eliminado, auto-guardado por watcher',
        id
      );
    } catch (e) {
      console.error(
        'removeIngreso: error en nextTick después de eliminar ingreso',
        e
      );
    }
  }
}

// Handler called from the options popover to delete an ingreso and close the popover
async function onDeleteIngreso(id: string | number, ev?: any) {
  try {
    await removeIngreso(id);
    console.debug('onDeleteIngreso removed id=', id);
  } catch (e) {
    console.error('onDeleteIngreso error:', e);
  }

  // Try to close the popover that contains the clicked button
  try {
    // First try using the event's closest popover (works when the event is the original click)
    const popoverEl =
      ev?.currentTarget?.closest && ev.currentTarget.closest('ion-popover');
    if (popoverEl && typeof popoverEl.dismiss === 'function') {
      popoverEl.dismiss();
      return;
    }
  } catch (_e) {
    /* noop */
  }

  // Fallback: find the popover by its trigger attribute using the known options button id
  try {
    const selector = `ion-popover[trigger="options-btn-${String(id)}"]`;
    const popoverFallback = document.querySelector(selector) as any;
    if (popoverFallback && typeof popoverFallback.dismiss === 'function') {
      popoverFallback.dismiss();
      return;
    }

    // As a last resort, dismiss any open ion-popover (be conservative)
    const anyOpen = document.querySelector('ion-popover[is-open]') as any;
    if (anyOpen && typeof anyOpen.dismiss === 'function') anyOpen.dismiss();
  } catch (_e) {
    /* noop */
  }
}

function handleUpdateIngreso(payload: {
  id: string | number;
  changes: Record<string, any>;
}) {
  try {
    const { id, changes } = payload || ({} as any);
    if (id == null || !changes) return;
    const ingreso = entries.find((x: any) => x.id === id);
    if (!ingreso) return;
    // Apply known fields safely
    if (Object.prototype.hasOwnProperty.call(changes, 'amount')) {
      ingreso.amount = Number(changes.amount) || 0;
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'paymentType')) {
      ingreso.paymentType =
        String(changes.paymentType) === 'digital' ? 'digital' : 'cash';
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'name')) {
      ingreso.name = String(changes.name || '');
    }
    // ensure reactivity propagation
    nextTick(() => {});
  } catch (e) {
    console.error('handleUpdateIngreso error', e);
  }
}

// Handler called when child requests to add one or more egresos derived from a provider
function handleAddEgresosFromChild(egresos: any[]) {
  try {
    // Prevent creation when the day is closed
    if (dayState.value === 'closed') {
      try {
        toast.message =
          'El día está finalizado. Reabre el día para poder editar.';
        toast.open = true;
      } catch (_e) {}
      return;
    }

    if (!Array.isArray(egresos) || !egresos.length) return;

    // If incoming egresos share a common group id, preserve it when adding
    const incomingGroupId = egresos[0] && egresos[0]._fromProviderGroupId;
    const incomingProviderName = egresos[0] && egresos[0]._providerName;

    for (const e of egresos) {
      // Ensure required fields and normalize
      const item = {
        id: e.id ?? Date.now() + Math.random(),
        name: String(e.name || ''),
        amount: Number(e.amount || 0) || 0,
        date: String(e.date || selectedDate.value),
        paymentType: e.paymentType === 'digital' ? 'digital' : 'cash',
        entryType: 'egreso' as const,
        createdAt: e.createdAt ?? Date.now(),
      } as any;

      // Preserve grouping metadata when present
      if (e && e._fromProviderGroupId)
        item._fromProviderGroupId = e._fromProviderGroupId;
      else if (incomingGroupId) item._fromProviderGroupId = incomingGroupId;
      if (e && e._providerName) item._providerName = e._providerName;
      else if (incomingProviderName) item._providerName = incomingProviderName;

      entries.push(item);
    }
    // Optionally focus or scroll - ensure Vue processes reactive updates
    nextTick(() => {});
  } catch (err) {
    console.error('handleAddEgresosFromChild error', err);
  }
}

function onOptionsPopoverDidDismiss() {
  // reserved for future state sync if needed
}

// Handler to delete all egresos that belong to a provider group
function handleDeleteEgresosGroup(groupId: string | number) {
  try {
    if (!groupId) return;
    // remove entries that have the matching group id
    for (let i = entries.length - 1; i >= 0; i--) {
      const it: any = entries[i];
      if (it && it._fromProviderGroupId === groupId) {
        entries.splice(i, 1);
      }
    }
    nextTick(() => {});
  } catch (e) {
    console.error('handleDeleteEgresosGroup error', e);
  }
}

// Clear day handlers (previously defined elsewhere)
function confirmClearDay() {
  try {
    clearDayConfirm.open = true;
  } catch (_e) {
    /* noop */
  }
}

function onClearDayDismiss() {
  try {
    clearDayConfirm.open = false;
  } catch (_e) {
    /* noop */
  }
}

function performClearDay() {
  try {
    proveedores.splice(0, proveedores.length);
    entries.splice(0, entries.length);
    Object.assign(newIngreso, {
      name: '',
      amount: 0,
      date: selectedDate.value,
    });
    Object.assign(newProveedor, {
      name: '',
      estimated: 0,
      dollar: 0,
      notes: '',
    });
    clearDayConfirm.open = false;
  } catch (e) {
    console.error('performClearDay error:', e);
  }
}

function acceptCloseValidation() {
  try {
    closeValidation.open = false;
    closeValidation.message = '';
  } catch (_e) {
    /* noop */
  }
}

async function removeProveedor(params: { id?: string | number } | any) {
  const id = params && params.id !== undefined ? params.id : params;
  const idx = proveedores.findIndex((p: any) => p.id === id);
  if (idx >= 0) {
    proveedores.splice(idx, 1);
    // esperar a que Vue actualice el DOM/reactividad; el auto-guardado lo maneja el watcher debounced
    try {
      await nextTick();
      console.log(
        'removeProveedor: proveedor eliminado, auto-guardado por watcher',
        id
      );
    } catch (e) {
      console.error(
        'removeProveedor: error en nextTick después de eliminar proveedor',
        e
      );
    }
  }
}

// Show confirmation alert before actually removing a provider
function confirmRemoveProveedor(
  params: { id?: string | number; name?: string } | any
) {
  try {
    // Support both: confirmRemoveProveedor(id, name) (old) and confirmRemoveProveedor({ id, name }) (new)
    const id = params && params.id !== undefined ? params.id : params;
    const name =
      params && params.name !== undefined
        ? params.name
        : typeof params === 'object' && params && params.name
          ? params.name
          : '';
    deleteConfirm.providerId = id;
    deleteConfirm.providerName = name || '';
    deleteConfirm.open = true;
  } catch (_e) {
    /* noop */
  }
}

// Called when the user confirms deletion in the alert
async function removeProveedorConfirmed() {
  try {
    const pid = deleteConfirm.providerId;
    // close the alert immediately
    deleteConfirm.open = false;
    // perform removal if we have an id
    if (pid != null) {
      await removeProveedor(pid);
    }
  } catch (e) {
    console.error('removeProveedorConfirmed error:', e);
  } finally {
    // reset state
    deleteConfirm.providerId = null;
    deleteConfirm.providerName = '';
    deleteConfirm.open = false;
  }
}

// Helper to provide the alert buttons expected by IonAlert
function getAlertButtons() {
  return [
    {
      text: 'Cancelar',
      role: 'cancel',
      cssClass: 'secondary',
      handler: () => {
        // simply close the alert and clear selection
        deleteConfirm.open = false;
        deleteConfirm.providerId = null;
        deleteConfirm.providerName = '';
      },
    },
    {
      text: 'Eliminar',
      cssClass: 'danger',
      handler: () => {
        // call the confirmed removal flow
        // Note: IonAlert will dismiss the dialog before handler runs in many platforms,
        // so we don't rely on the did-dismiss event to perform the action.
        void removeProveedorConfirmed();
      },
    },
  ];
}

// Handler for the alert did-dismiss event to ensure state is clean
function onDeleteAlertDidDismiss() {
  try {
    deleteConfirm.open = false;
    // keep providerId/providerName so caller can inspect if needed, but clear to avoid leaks
    deleteConfirm.providerId = null;
    deleteConfirm.providerName = '';
  } catch (_e) {
    /* noop */
  }
}

// Handler for selecting the entry type from the popover (Ingreso / Egreso)
function onSelectEntryType(type: 'ingreso' | 'egreso', ev?: any) {
  try {
    // Close the popover
    popovers.addEntryType.open = false;

    if (type === 'ingreso') {
      // Add a new ingreso field and focus behavior
      addIngresoField('ingreso');
      // Optionally focus the last created input (best-effort)
      nextTick(() => {
        try {
          // nothing specific to focus here since ingresos list items use ion-inputs
        } catch (_e) {
          /* noop */
        }
      });
    } else if (type === 'egreso') {
      // Create an egreso entry (same array but mark as egreso)
      addIngresoField('egreso');
      nextTick(() => {});
    }

    // try to dismiss the native popover element containing the clicked button
    try {
      const popoverEl =
        ev?.currentTarget?.closest && ev.currentTarget.closest('ion-popover');
      if (popoverEl && typeof popoverEl.dismiss === 'function') {
        popoverEl.dismiss();
      }
    } catch (_e) {
      /* noop */
    }
  } catch (err) {
    console.error('onSelectEntryType error:', err);
  }
}

function updateNewIngreso(params: { name?: string; amount?: number } = {}) {
  const { name, amount } = params;
  if (name !== undefined) newIngreso.name = name;
  if (amount !== undefined) newIngreso.amount = amount;
}

function formatCurrency(params: { v: number }) {
  const { v } = params;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(v || 0);
}

function formatTime(ms?: number) {
  try {
    if (!ms) return '';
    return format(new Date(Number(ms)), 'p', { locale: esLocale });
  } catch (_e) {
    return '';
  }
}

function nonNegative(v: any) {
  try {
    return Math.max(0, Number(v) || 0);
  } catch (_e) {
    return 0;
  }
}

// template-friendly wrappers (avoid implicit any in template lambdas)
function onIngresoIonInput(params: { event: any; index: number }) {
  const { event, index } = params;
  updateIngresoAmount({ value: event?.detail?.value, index });
}

function onNewIngresoNameInput(params: { e: any }) {
  const { e } = params;
  updateNewIngreso({ name: e?.detail?.value || '' });
}

function onNewIngresoAmountInput(params: { e: any }) {
  const { e } = params;
  updateNewIngreso({ amount: Number(e?.detail?.value) || 0 });
}

function addProveedor(
  params: {
    name?: string;
    estimated?: number;
    dollar?: number;
    notes?: string;
  } = {}
) {
  // Prevent creation when the day is closed
  if (dayState.value === 'closed') {
    try {
      toast.message =
        'El día está finalizado. Reabre el día para poder editar.';
      toast.open = true;
    } catch (_e) {
      /* noop */
    }
    return;
  }

  const { name, estimated, dollar, notes } = params;
  const n = name ?? newProveedor.name;
  const e = estimated ?? newProveedor.estimated;
  const d = dollar ?? newProveedor.dollar;
  const nt = notes ?? newProveedor.notes;
  if (!n) return;

  // Prevent adding duplicate providers: normalize and compare against existing names
  try {
    const normalized = normalizeName(String(n));
    const exists = proveedores.some(
      (p: any) => normalizeName(p.name) === normalized
    );
    if (exists) {
      // Show a toast informing the user and avoid adding the duplicate
      try {
        toast.message = `El proveedor «${n}» ya existe`;
        toast.open = true;
      } catch (_e) {
        /* noop */
      }
      return;
    }
  } catch (_e) {
    /* noop */
  }

  // create with id and mark as new for animation
  const newItem = {
    id: Date.now() + Math.random(),
    date: formatLocalDate(selectedDate.value),
    name: n,
    estimated: Number(e) || 0,
    dollar: Number(d) || 0,
    // Initialize payment fields so they are present in backups and reactive
    efectivo: 0,
    tarjeta: 0,
    credito: 0,
    notes: nt || '',
    visited: false,
    _justAdded: true,
  } as any;
  proveedores.push(newItem);
  // Scroll the not-visited list to the end so the new provider is visible
  try {
    nextTick(() => scrollListToEnd(notVisitedList));
  } catch (_e) {
    /* noop */
  }

  // remove new-mark after animation
  setTimeout(() => (newItem._justAdded = false), 400);
  newProveedor.name = '';
  newProveedor.estimated = 0;
  newProveedor.dollar = 0;
  newProveedor.notes = '';
}

function valueToConsider(p: any) {
  // Primary: use explicit payment inputs (efectivo + tarjeta + credito) if any provided
  const efectivo = Number(p.efectivo || 0);
  const tarjeta = Number(p.tarjeta || 0);
  const credito = Number(p.credito || 0);
  const sumPayments = efectivo + tarjeta + credito;
  if (sumPayments > 0) return sumPayments;
  // Otherwise fallback to dollar or estimated (existing behavior)
  const d = Number(p.dollar || 0);
  const e = Number(p.estimated || 0);
  return d > 0 ? d : e;
}

// Helper that excludes credito (used for estimation-only sums)
function valueToConsiderExcludingCredito(p: any) {
  try {
    const efectivo = Number(p.efectivo || 0);
    const tarjeta = Number(p.tarjeta || 0);
    const sum = efectivo + tarjeta;
    if (sum > 0) return sum;
    const d = Number(p.dollar || 0);
    const e = Number(p.estimated || 0);
    return d > 0 ? d : e;
  } catch (_e) {
    return 0;
  }
}

/**
 * Decide si el ion-label que muestra el total debería usar el color "primary".
 * Regla aplicada:
 *  - Si hay valor en efectivo o en tarjeta (efectivo>0 || tarjeta>0) -> true
 *  - Si el único pago presente es crédito -> false
 *  - No se considera "primary" cuando se cae al fallback (dollar/estimated)
 */
function isPaymentPrimary(p: any) {
  try {
    const efectivo = Number(p?.efectivo || 0);
    const tarjeta = Number(p?.tarjeta || 0);
    return efectivo > 0 || tarjeta > 0;
  } catch (_e) {
    return false;
  }
}

// Handler invoked from the ion-checkbox @ionChange in the template.
// We set the provider visited flag based on the event payload and log the change
// to help debug why a provider might disappear when toggled.
// Normalize handler signature: accept either (provider, event) or a single { provider, event } object
function onVisitedChanged(params: any) {
  try {
    // Prevent toggling visited state when the day is closed
    if (dayState.value === 'closed') {
      try {
        // Optional: suppress any UI changes by returning early. Avoid showing toasts.
        return;
      } catch (_e) {
        return;
      }
    }

    // Support both call styles: positional (provider, event) and object { provider, event }
    let provider: any = null;
    let event: any = null;

    if (params && params.provider !== undefined) {
      provider = params.provider;
      event = params.event;
    } else if (arguments.length === 2) {
      // called as onVisitedChanged(provider, event)
      provider = arguments[0];
      event = arguments[1];
    } else {
      // fallback: treat params as provider
      provider = params;
      event = null;
    }

    // Ion's change event may expose the checked value in different places
    const checked = !!(
      event &&
      (event.detail?.checked ?? event.detail?.value ?? event.target?.checked)
    );

    if (provider && provider.id != null) {
      // IMPORTANT: Find the original provider in the reactive array by id.
      // The enriched computed properties create copies, so updating the copy
      // won't trigger reactivity. We must update the original object.
      const originalProvider = proveedores.find(
        (p: any) => p.id === provider.id
      );
      if (originalProvider) {
        originalProvider.visited = checked;
        console.log('onVisitedChanged', {
          id: originalProvider.id,
          name: originalProvider.name,
          visited: originalProvider.visited,
        });
      } else {
        console.warn('onVisitedChanged: provider not found in proveedores', {
          id: provider.id,
        });
      }
    }

    // ensure Vue processes reactive updates (no-op nextTick but useful when debugging)
    nextTick(() => {});
  } catch (e) {
    console.error('onVisitedChanged error:', e);
  }
}

// Enter edit mode for a provider and focus its name input
function startEditing(p: any) {
  try {
    p._editing = true;
    // wait for DOM update and focus the input
    nextTick(() => {
      const el = nameInputRefs[p.id];
      try {
        if (hasSetFocus(el)) {
          el.setFocus();
        } else if (has$elSetFocus(el)) {
          el.$el.setFocus();
        } else if (hasFocusMethod(el)) {
          el.focus();
        }
      } catch (_e) {
        /* noop */
      }
    });
  } catch (_e) {
    /* noop */
  }
}

// Exit edit mode for a provider
function stopEditing(p: any) {
  try {
    p._editing = false;
  } catch (_e) {
    /* noop */
  }
}

// Parent handler for ProviderCard emitted updates: apply field changes to the corresponding provider
function handleUpdateProvider(payload: {
  id: string | number;
  field: string;
  value: any;
}) {
  try {
    const { id, field, value } = payload || ({} as any);
    // Debug logs to trace updates from ProviderCardComponent
    console.log('handleUpdateProvider payload', { payload });
    const prov = proveedores.find((x: any) => x.id === id);
    console.log('handleUpdateProvider found provider before update', prov, {
      id,
      field,
      value,
    });
    if (!prov) return;
    // Apply the value for known fields only to avoid accidental injection
    // Only allow specific fields to be updated; use a typed union to index Provider safely
    const allowedFields = ['name', 'efectivo', 'tarjeta', 'credito'] as const;
    type AllowedField = (typeof allowedFields)[number];
    if (allowedFields.includes(field as AllowedField)) {
      const f = field as AllowedField;
      // Coerce numeric fields when appropriate
      if (f === 'efectivo' || f === 'tarjeta' || f === 'credito') {
        prov[f] = Number(value) || 0;
        console.log(
          'handleUpdateProvider updated numeric field',
          f,
          prov[f],
          prov
        );
      } else {
        // ensure name is a string
        const newName = String(value ?? '') as any;
        prov[f] = newName;
        console.log('handleUpdateProvider updated name', prov[f], prov);

        // Preserve existing _supplierKey. If none exists, try to initialize it based on the new name
        // only when the normalized name maps to known suppliersProducts. This prevents breaking
        // the provider->products association when the user edits the visible name.
        try {
          if (!prov._supplierKey) {
            const maybeKey = normalizeName(newName || prov.name || '');
            if (
              maybeKey &&
              suppliersProducts[maybeKey] &&
              suppliersProducts[maybeKey].length
            ) {
              prov._supplierKey = maybeKey;
            }
          }
        } catch (_e) {
          /* noop */
        }
      }
    }
  } catch (e) {
    console.error('handleUpdateProvider error', e);
  }
}

// New wrapper so template uses a named handler (avoids inline expression edge-cases)
function onChildUpdateProvider(payload: {
  id: string | number;
  field: string;
  value: any;
}) {
  try {
    console.log('onChildUpdateProvider wrapper', payload);
    handleUpdateProvider(payload);
  } catch (e) {
    console.error('onChildUpdateProvider error', e);
  }
}

// Parent handler to register name input refs emitted by ProviderCard (avoids mutating child props)
function handleRegisterNameInput(payload: { id: string | number; el: any }) {
  try {
    const { id, el } = payload || ({} as any);
    if (id == null) return;
    nameInputRefs[id] = el || null;
  } catch (e) {
    console.error('handleRegisterNameInput error', e);
  }
}

// Add empty provider card
function addBlankProvider() {
  // Prevent creation when the day is closed
  if (dayState.value === 'closed') {
    try {
      toast.message =
        'El día está finalizado. Reabre el día para poder editar.';
      toast.open = true;
    } catch (_e) {
      /* noop */
    }
    return;
  }

  // Prevent creating another blank provider if one already exists
  try {
    const existingBlank = proveedores.find(
      (p: any) => (p.name ?? '').toString().trim() === ''
    );
    if (existingBlank) {
      try {
        toast.message = 'El nombre del proveedor no puede estar vacío';
        toast.open = true;
        nextTick(() => {
          const el = nameInputRefs[existingBlank.id];
          try {
            if (hasSetFocus(el)) el.setFocus();
            else if (has$elSetFocus(el)) el.$el.setFocus();
            else if (hasFocusMethod(el)) el.focus();
          } catch (_e) {
            /* noop */
          }
        });
      } catch (_e) {
        /* noop */
      }
      return;
    }
  } catch (_e) {
    /* noop */
  }

  const newItem = {
    id: Date.now() + Math.random(),
    date: formatLocalDate(selectedDate.value),
    name: '',
    estimated: 0,
    dollar: 0,
    // Initialize payment fields so they exist and are reactive
    efectivo: 0,
    tarjeta: 0,
    credito: 0,
    notes: '',
    visited: false,
    _justAdded: true,
    _editing: true,
  } as any;
  proveedores.push(newItem);
  // wait for render and focus input
  nextTick(() => {
    // ensure the not-visited list scrolls so the new provider is visible
    try {
      scrollListToEnd(notVisitedList);
    } catch (_e) {
      /* noop */
    }

    const el = nameInputRefs[newItem.id];
    try {
      if (hasSetFocus(el)) {
        el.setFocus();
      } else if (has$elSetFocus(el)) {
        el.$el.setFocus();
      } else if (hasFocusMethod(el)) {
        el.focus();
      }
    } catch (_e) {
      /* noop */
    }
  });
  setTimeout(() => (newItem._justAdded = false), 400);
}

// Add empty provider card and mark it as visited (for the "Asistio" column)
function addBlankProviderVisited() {
  // Prevent creating another blank provider if one already exists
  try {
    const existingBlank = proveedores.find(
      (p: any) => (p.name ?? '').toString().trim() === ''
    );
    if (existingBlank) {
      try {
        toast.message = 'El nombre del proveedor no puede estar vacío';
        toast.open = true;
        nextTick(() => {
          const el = nameInputRefs[existingBlank.id];
          try {
            if (hasSetFocus(el)) el.setFocus();
            else if (has$elSetFocus(el)) el.$el.setFocus();
            else if (hasFocusMethod(el)) el.focus();
          } catch (_e) {
            /* noop */
          }
        });
      } catch (_e) {
        /* noop */
      }
      return;
    }
  } catch (_e) {
    /* noop */
  }

  const newItem = {
    id: Date.now() + Math.random(),
    date: formatLocalDate(selectedDate.value),
    name: '',
    estimated: 0,
    dollar: 0,
    // Initialize payment fields so they exist and are reactive
    efectivo: 0,
    tarjeta: 0,
    credito: 0,
    notes: '',
    visited: true,
    _justAdded: true,
    _editing: true,
  } as any;
  proveedores.push(newItem);
  // wait for render and focus input
  nextTick(() => {
    // ensure the visited list scrolls so the new provider is visible
    try {
      scrollListToEnd(visitedList);
    } catch (_e) {
      /* noop */
    }

    const el = nameInputRefs[newItem.id];
    try {
      if (hasSetFocus(el)) {
        el.setFocus();
      } else if (has$elSetFocus(el)) {
        el.$el.setFocus();
      } else if (hasFocusMethod(el)) {
        el.focus();
      }
    } catch (_e) {
      /* noop */
    }
  });
  setTimeout(() => (newItem._justAdded = false), 400);
}

// Collect component data and ask controller to save it
async function onBackupClick() {
  try {
    const payload = {
      ingresos: JSON.parse(JSON.stringify(entries)),
      entries: JSON.parse(JSON.stringify(entries)),
      proveedores: JSON.parse(JSON.stringify(proveedores)),
      newIngreso: { ...newIngreso },
      newProveedor: { ...newProveedor },
      selectedDate: selectedDate.value,
      totals: {
        totalIngresos: totalIngresos.value,
        totalProviders: totalProviders.value,
        totalVisitedProviders: totalVisitedProviders.value,
      },
    };

    // console.log('onBackupClick: payload summary', {
    //   selectedDate: payload.selectedDate,
    //   ingresosCount: payload.entries.length,
    // });

    const payloadToSave = {
      component: 'BudgetView',
      data: payload,
      createdAt: Date.now(),
    };

    try {
      const id = await backupController.saveBackup({ entry: payloadToSave });
      // console.log('Backup guardado id=', id);
    } catch (err) {
      console.error('Error al guardar backup:', err);
    }
  } catch (err) {
    console.error('Error al preparar backup:', err);
  }
}

// debug removed

// Auto-save (debounced)
function debounce<T extends (...args: any[]) => any>(fn: T, wait = 800) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t as any);
    t = setTimeout(() => {
      t = null;
      try {
        fn(...args);
      } catch (_e) {
        /* noop */
      }
    }, wait);
  };
}

// autoSave usa onBackupClick internamente (debounced)
const autoSave = debounce(async () => {
  try {
    await onBackupClick();
  } catch (e) {
    console.error('autoSave error:', e);
  }
}, 800);

async function loadDataForDate(dateISO: string) {
  try {
    const all = ((await dixieController.listBackups()) as any[]) || [];
    const target = String(dateISO || '').slice(0, 10);

    // Normalize a date string to the local YYYY-MM-DD when possible
    const normalizeDateString = (s: string) => {
      try {
        return formatLocalDate(parseLocalDate(String(s)));
      } catch (_e) {
        return String(s || '').slice(0, 10);
      }
    };

    const targetNormalized = normalizeDateString(target);

    // console.log(
    //   'loadDataForDate: target=',
    //   target,
    //   'normalized=',
    //   targetNormalized
    // );

    // Helper to pick latest entry for a component and date (using normalized selectedDate)
    const latestFor = (componentName: string) =>
      (all || [])
        .filter(x => {
          if (!x || String(x.component || '') !== componentName || !x.data)
            return false;
          const entryDateRaw = String((x.data as any).selectedDate || '');
          const entryNormalized = normalizeDateString(entryDateRaw);
          return entryNormalized === targetNormalized;
        })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;

    const latestBudgetView = latestFor('BudgetView');
    const latestFinishDay = latestFor('BudgetFinishDay');

    // console.log(
    //   'loadDataForDate: backupsCount=',
    //   all.length,
    //   'latestBudgetView=',
    //   latestBudgetView
    //     ? { id: latestBudgetView.id, createdAt: latestBudgetView.createdAt }
    //     : null,
    //   'latestFinishDay=',
    //   latestFinishDay
    //     ? { id: latestFinishDay.id, createdAt: latestFinishDay.createdAt }
    //     : null
    // );

    if (latestBudgetView && latestBudgetView.data) {
      const d = latestBudgetView.data as any;

      entries.splice(
        0,
        entries.length,
        ...(d.ingresos || []).map((i: any) => ({
          id: i.id ?? Date.now() + Math.random(),
          paymentType: i.paymentType === 'digital' ? 'digital' : 'cash',
          createdAt: i.createdAt ?? Date.now(),
          ...i,
        }))
      );

      const normalizedProviders = (d.proveedores || []).map((p: any) => {
        const key = normalizeName(p.name ?? '');
        return {
          id: p.id ?? Date.now() + Math.random(),
          name: p.name ?? '',
          date: p.date ?? dateISO,
          estimated: Number(p.estimated || 0),
          dollar: Number(p.dollar || 0),
          _dbName: p._dbName ?? p.name ?? '',
          efectivo: Number(p.efectivo || 0),
          tarjeta: Number(p.tarjeta || 0),
          credito: Number(p.credito || 0),
          notes: p.notes || '',
          visited: !!p.visited,
          _fromTemplate: !!p._fromTemplate,
          _justAdded: !!p._justAdded,
          _supplierKey: key || undefined,
          _editing: false,
        };
      });

      proveedores.splice(0, proveedores.length, ...normalizedProviders);

      Object.assign(
        newIngreso,
        d.newIngreso || { name: '', amount: 0, date: dateISO }
      );
      Object.assign(
        newProveedor,
        d.newProveedor || { name: '', estimated: 0, dollar: 0, notes: '' }
      );

      // console.log('Datos cargados para', dateISO, latestBudgetView);

      // dayClosed preference: BudgetFinishDay (most recent) wins, then BudgetView.dayClosed
      if (latestFinishDay && latestFinishDay.data) {
        const fd = (latestFinishDay.data as any) || {};
        dayState.value = fd.closed ? 'closed' : 'open';

        // Also restore finishDay fields from the latest finish-day backup so the
        // inline form is populated on page reload when the day is closed.
        try {
          finishDay.totalSalesEfectivo =
            Number(fd.totalSalesEfectivo ?? fd.totalSales ?? 0) || 0;
          finishDay.totalSalesTarjeta = Number(fd.totalSalesTarjeta ?? 0) || 0;
          finishDay.totalSalesCredito = Number(fd.totalSalesCredito ?? 0) || 0;
          finishDay.totalSales =
            Number(
              fd.totalSales ||
                finishDay.totalSalesEfectivo +
                  finishDay.totalSalesTarjeta +
                  finishDay.totalSalesCredito
            ) || 0;
          finishDay.type = String(fd.type || finishDay.type || '%');
          finishDay.margin = Number(fd.margin || 0) || 0;
        } catch (_e) {
          /* noop */
        }
      } else if (d && d.dayClosed !== undefined) {
        dayState.value = d.dayClosed ? 'closed' : 'open';
      } else {
        // fallback to localStorage flag
        try {
          const key = `budget:closed:${targetNormalized}`;
          const ls = localStorage.getItem(key);
          // console.log('loadDataForDate: localStorage flag', key, ls);
          dayState.value = ls === '1' ? 'closed' : 'open';
        } catch (_e) {
          dayState.value = 'open';
        }
      }

      return;
    }

    // No BudgetView found: initialize empty state and determine closed status from finish-day or localStorage
    entries.splice(0, entries.length);
    proveedores.splice(0, proveedores.length);
    Object.assign(newIngreso, { name: '', amount: 0, date: dateISO });
    Object.assign(newProveedor, {
      name: '',
      estimated: 0,
      dollar: 0,
      notes: '',
    });
    console.log('No se encontró backup para', dateISO);

    if (latestFinishDay && latestFinishDay.data) {
      const fd = (latestFinishDay.data as any) || {};
      dayState.value = fd.closed ? 'closed' : 'open';
      console.log(
        'loadDataForDate: using latestFinishDay.closed=',
        dayState.value
      );

      // restore finishDay values so the form fields show after reload
      try {
        finishDay.totalSalesEfectivo =
          Number(fd.totalSalesEfectivo ?? fd.totalSales ?? 0) || 0;
        finishDay.totalSalesTarjeta = Number(fd.totalSalesTarjeta ?? 0) || 0;
        finishDay.totalSalesCredito = Number(fd.totalSalesCredito ?? 0) || 0;
        finishDay.totalSales =
          Number(
            fd.totalSales ||
              finishDay.totalSalesEfectivo +
                finishDay.totalSalesTarjeta +
                finishDay.totalSalesCredito
          ) || 0;
        finishDay.type = String(fd.type || finishDay.type || '%');
        finishDay.margin = Number(fd.margin || 0) || 0;
      } catch (_e) {
        /* noop */
      }
    } else {
      try {
        const key = `budget:closed:${targetNormalized}`;
        const ls = localStorage.getItem(key);
        console.log(
          'loadDataForDate: no backups found, localStorage flag',
          key,
          ls
        );
        dayState.value = ls === '1' ? 'closed' : 'open';
      } catch (_e) {
        dayState.value = 'open';
      }
    }
  } catch (err) {
    console.error('Error cargando datos para fecha', dateISO, err);
  }
}

function openDatePopover(params: { event: any }) {
  const { event } = params;
  // Assign event then open popover
  console.log('openDatePopover: event=', event);
  popovers.date.event = event;
  setTimeout(() => {
    popovers.date.open = true;
    console.log('openDatePopover: popover opened, event=', popovers.date.event);
  }, 50);
}

function onPopoverDidDismiss() {
  console.log('onPopoverDidDismiss');
  popovers.date.open = false;
  popovers.date.event = null;
}

function resetToToday() {
  try {
    // set selectedDate to today in yyyy-mm-dd format using local date (avoid UTC offset)
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    selectedDate.value = `${y}-${m}-${day}`;

    // close the popover and reload data for the selected date
    popovers.date.open = false;
    void loadDataForDate(selectedDate.value);
  } catch (_e) {
    /* noop */
  }
}

function changeDate(params: { days?: number } | number) {
  try {
    // Support both old signature changeDate(number) and new changeDate({ days })
    let days = 0;
    if (params == null) {
      days = 0;
    } else if (typeof params === 'number') {
      days = Number(params || 0);
    } else {
      days = Number((params as any).days || 0);
    }

    // Parse current selectedDate using parseISO; fallback to today
    let current = new Date();
    try {
      const parsed = parseLocalDate(String(selectedDate.value));
      if (!isNaN(parsed.getTime())) current = parsed;
    } catch (_e) {
      /* noop */
    }

    // Advance or retreat by the requested number of days
    current.setDate(current.getDate() + Number(days || 0));
    // store as local date string (YYYY-MM-DD)
    selectedDate.value = formatLocalDate(current);
  } catch (_e) {
    /* noop */
  }
}

function handlePointerDown(e: PointerEvent | TouchEvent) {
  try {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const card = target.closest('ion-card.shadow1') as HTMLElement | null;
    if (card) {
      card.classList.add('touch-active');
    }
  } catch (_e) {
    /* noop */
  }
}

function handlePointerUp(e: PointerEvent | TouchEvent) {
  try {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const card = target.closest('ion-card.shadow1') as HTMLElement | null;
    if (card) {
      // remove after a short delay so the user sees the feedback
      setTimeout(() => card.classList.remove('touch-active'), 250);
    }
  } catch (_e) {
    /* noop */
  }
}

function normalizeName(name: string | undefined | null) {
  if (!name) return '';
  try {
    // trim, lowercase and remove common diacritics for more robust matching
    return String(name)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ');
  } catch (_e) {
    return String(name).trim().toLowerCase();
  }
}

// Load suppliers products map by loading suppliers and using their products[] field
async function loadSuppliersProducts() {
  try {
    // Prefer the explicit listSuppliers method which returns suppliers with products
    let suppliersList: any[] | null = null;

    if (typeof (suppliersController as any).listSuppliers === 'function') {
      try {
        const res = await (suppliersController as any).listSuppliers();
        if (Array.isArray(res)) suppliersList = res;
      } catch (_e) {
        // ignore and try fallback below
      }
    }

    // Fallback: try a few other method names that may return suppliers
    if (!Array.isArray(suppliersList)) {
      const candidates = ['list', 'listAll', 'getAll', 'getSuppliers'];
      for (const name of candidates) {
        const fn = (suppliersController as any)[name];
        if (typeof fn === 'function') {
          try {
            const res = await fn();
            if (Array.isArray(res)) {
              suppliersList = res;
              break;
            }
          } catch (_e) {
            // ignore and try next
          }
        }
      }
    }

    if (!Array.isArray(suppliersList)) {
      // Nothing we can do; bail out gracefully
      return;
    }

    // Clear existing maps
    for (const k of Object.keys(suppliersProducts)) delete suppliersProducts[k];
    for (const k of Object.keys(suppliersNames)) delete suppliersNames[k];

    // Build a map of normalized supplier name -> products[] and normalized->original name
    for (const s of suppliersList) {
      const rawName = s?.name || s?.provider || s?.supplierName || '';
      if (!rawName) continue;
      const key = normalizeName(rawName);
      if (!key) continue;
      suppliersProducts[key] = Array.isArray(s.products)
        ? s.products.slice()
        : [];
      // keep original raw name so the UI can show the DB supplier name as placeholder
      suppliersNames[key] = rawName;
    }

    // Debug: log loaded suppliersProducts summary to help diagnose mismatches
    try {
      // console.log(
      //   'loadSuppliersProducts: suppliersList.length=',
      //   suppliersList.length
      // );
      // console.log(
      //   'loadSuppliersProducts: loadedKeys=',
      //   Object.keys(suppliersProducts).length,
      //   Object.keys(suppliersProducts).slice(0, 10)
      // );
    } catch (_e) {
      /* noop */
    }
  } catch (err) {
    console.error('loadSuppliersProducts error:', err);
  }
}

function hasProductsFor(params: { provider?: any } | any) {
  try {
    // Support both named param: { provider } and positional: provider
    const p =
      params && params.provider !== undefined ? params.provider : params;

    // Prefer an explicit supplier key persisted on the provider so product
    // association survives name edits. Fall back to normalizing the provider
    // name only when no explicit key is available.
    const rawKey = p && p._supplierKey ? String(p._supplierKey) : p?.name || '';

    // Build a set of candidate lookup keys (original, normalized, and normalized _supplierKey)
    const candidates: string[] = [];
    if (p && p._supplierKey) candidates.push(String(p._supplierKey));
    try {
      const normKey = normalizeName(String(rawKey || ''));
      if (normKey) candidates.push(normKey);
    } catch (_e) {
      // ignore normalize failures
    }

    // Debug: log lookup candidates and whether suppliersProducts has any
    try {
      console.log('hasProductsFor: provider=', {
        id: p?.id,
        name: p?.name,
        _supplierKey: p?._supplierKey,
      });
      // console.log('hasProductsFor: lookupCandidates=', candidates);
    } catch (_e) {
      /* noop */
    }

    // Direct lookup using candidates
    for (const c of candidates) {
      if (!c) continue;
      if (Array.isArray(suppliersProducts[c]) && suppliersProducts[c].length) {
        console.log('hasProductsFor: matched candidate=', c);
        return true;
      }
    }

    // Last resort: fuzzy match normalized provider name against known supplier keys
    const normalizedLookup = normalizeName(String(rawKey || ''));
    if (normalizedLookup) {
      for (const key of Object.keys(suppliersProducts)) {
        if (!key) continue;
        if (
          key.includes(normalizedLookup) ||
          normalizedLookup.includes(key) ||
          key.startsWith(normalizedLookup) ||
          normalizedLookup.startsWith(key)
        ) {
          console.log('hasProductsFor: fuzzy matched', {
            normalizedLookup,
            key,
          });
          return !!(
            Array.isArray(suppliersProducts[key]) &&
            suppliersProducts[key].length
          );
        }
      }
    }

    // Nothing found
    try {
      console.log('hasProductsFor: no products found for provider', {
        id: p?.id,
        name: p?.name,
        candidates,
      });
    } catch (_e) {
      /* noop */
    }

    return false;
  } catch (_e) {
    return false;
  }
}

async function openProductsPopover(params: { provider: any; event: any }) {
  const { provider, event } = params;
  try {
    // Save the event and provider id so the modal knows which provider we're editing
    modals.products.event = event;
    modals.products.providerId = provider?.id ?? null;
    modals.products.title = provider?.name || '';
    // Load products for provider. Prefer persisted supplier key when available so name edits
    // don't break product association.
    const prodKey =
      provider && provider._supplierKey
        ? String(provider._supplierKey)
        : normalizeName(provider?.name || '');
    const prods = suppliersProducts[prodKey] || [];
    modals.products.products = prods;

    // Initialize quantities map for the currently shown products (keep existing values if present)
    for (let idx = 0; idx < prods.length; idx++) {
      const prod = prods[idx];
      const key = prod?.id ?? idx;
      if (modals.products.quantities[key] === undefined) {
        modals.products.quantities[key] = 0;
      }
    }

    // Try to preload previously saved quantities for this provider+date
    try {
      const all = (await dixieController.listBackups()) as any[];
      const target = (selectedDate.value || '').slice(0, 10);
      const matches = (all || [])
        .filter(
          b =>
            b &&
            b.component === 'BudgetProducts' &&
            b.data &&
            b.data.selectedDate &&
            (b.data.selectedDate as string).slice(0, 10) === target &&
            b.data.providerId === provider?.id
        )
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (matches.length) {
        const latest = matches[0];
        const savedQuantities =
          (latest.data && (latest.data.quantities || {})) || {};
        // Assign saved quantities for keys present in current product list
        for (let idx = 0; idx < prods.length; idx++) {
          const prod = prods[idx];
          const key = prod?.id ?? idx;
          if (savedQuantities[key] !== undefined) {
            modals.products.quantities[key] = Number(savedQuantities[key] || 0);
          }
        }
      }
    } catch (_e) {
      /* ignore preload errors */
    }

    setTimeout(() => (modals.products.open = true), 50);
  } catch (err) {
    console.error('openProductsPopover error:', err);
  }
}

// Modal dismiss handler (kept separate to make intent explicit and satisfy template bindings)
function onProductsModalDidDismiss() {
  modals.products.open = false;
  modals.products.event = null;
  modals.products.products = [];
  modals.products.quantities = {};
  modals.products.title = '';
}

// Handler called from the ProductsModalComponent's @save event. Receives the quantities payload
// and applies them to the modal state, then delegates to saveProductsModal to compute and persist.
async function handleProductsModalSave(payload: {
  quantities: Record<string | number, number>;
}) {
  try {
    // Merge/replace modal quantities with the ones received from the modal component
    modals.products.quantities = {
      ...(payload && payload.quantities ? payload.quantities : {}),
    } as Record<string | number, number>;
    // Let the existing save logic compute totals, assign provider estimated and persist selections
    await saveProductsModal();
  } catch (err) {
    console.error('handleProductsModalSave error:', err);
  }
}

// Small helpers for saveProductsModal (kept inside // functions)
function computeTotalEstimate(
  prods: any[],
  quantities: Record<string | number, number>
) {
  let total = 0;
  const list = prods || [];
  const qmap = quantities || {};
  for (let idx = 0; idx < list.length; idx++) {
    const prod = list[idx];
    const key = prod?.id ?? idx;
    const q = Number(qmap[key] || 0);
    const price = Number(prod?.price ?? prod?.amount ?? 0) || 0;
    if (q > 0 && price > 0) total += price * q;
  }
  return total;
}

async function persistProductsSelection(
  pid: string | number | null,
  quantities: Record<string | number, number>
) {
  try {
    const payloadToSave = {
      component: 'BudgetProducts',
      data: {
        providerId: pid,
        selectedDate: selectedDate.value,
        quantities: JSON.parse(JSON.stringify(quantities || {})),
      },
      createdAt: Date.now(),
    };
    const id = await dixieController.addEntry({ entry: payloadToSave });
    console.log('saveProductsModal: saved products selection id=', id);
  } catch (e) {
    console.error('saveProductsModal: error saving products selection', e);
  }
}

async function assignEstimateToProvider(
  pid: string | number | null,
  totalEstimate: number
) {
  if (pid == null) {
    console.warn('saveProductsModal: no providerId set');
    return;
  }
  const prov = proveedores.find((p: any) => p.id === pid);
  if (!prov) {
    console.warn('saveProductsModal: provider not found', pid);
    return;
  }

  try {
    const currentEfectivo = Number(prov.efectivo || 0);
    const currentTarjeta = Number(prov.tarjeta || 0);
    // Only store directly when BOTH efectivo AND tarjeta are empty (0). Otherwise ask the user.
    if (currentEfectivo === 0 && currentTarjeta === 0) {
      prov.efectivo = Number(totalEstimate) || 0;
      console.log(
        'saveProductsModal: set provider efectivo (direct)',
        pid,
        prov.efectivo
      );
      return;
    }

    // At least one field already has a value -> ask user whether to overwrite
    let overwrite = false;
    try {
      overwrite = await askOverwriteConfirm({
        providerId: pid,
        providerName: prov.name || '',
        total: Number(totalEstimate) || 0,
      });
    } catch (_e) {
      overwrite = false;
    }
    if (overwrite) {
      prov.efectivo = Number(totalEstimate) || 0;
      console.log(
        'saveProductsModal: overwritten provider efectivo',
        pid,
        prov.efectivo
      );
    } else {
      console.log(
        'saveProductsModal: kept existing provider efectivo/tarjeta values',
        pid,
        { efectivo: prov.efectivo, tarjeta: prov.tarjeta }
      );
    }
  } catch (_e) {
    // Fallback: assign computed value
    prov.efectivo = Number(totalEstimate) || 0;
  }
}

// Save handler for the products modal: compute total (price * quantity) and assign it to the provider's efectivo value.
async function saveProductsModal() {
  try {
    const quantities = modals.products.quantities || {};
    const prods = modals.products.products || [];

    // 1) compute total estimate
    const totalEstimate = computeTotalEstimate(prods, quantities);

    // 2) assign to provider (if any) - helper handles prompts and fallbacks
    const pid = modals.products.providerId ?? null;
    await assignEstimateToProvider(pid, totalEstimate);

    // 3) persist quantities selection (best-effort)
    await persistProductsSelection(pid, quantities);
  } catch (err) {
    console.error('saveProductsModal error:', err);
  } finally {
    // Close and clear modal state
    modals.products.open = false;
    modals.products.event = null;
    modals.products.products = [];
    modals.products.quantities = {};
    modals.products.providerId = null;
    modals.products.title = '';
  }
}

function hasSetFocus(x: unknown): x is { setFocus: () => void } {
  return !!x && typeof (x as any).setFocus === 'function';
}

function has$elSetFocus(x: unknown): x is { $el: { setFocus: () => void } } {
  return (
    !!x && !!(x as any).$el && typeof (x as any).$el.setFocus === 'function'
  );
}

function hasFocusMethod(x: unknown): x is { focus: () => void } {
  return !!x && typeof (x as any).focus === 'function';
}

// Notes modal: open, save and dismiss handlers
async function openNotesModal(p: any) {
  try {
    // Support multiple call styles:
    // - openNotesModal(provider)
    // - openNotesModal({ providerId })
    // - openNotesModal(providerId)
    // - openNotesModal({ id, notes })
    // - openNotesModal(undefined) -> gracefully open empty modal

    let providerId: string | number | null = null;
    let initialContent = '';

    if (p == null) {
      // nothing provided
      providerId = null;
    } else if (typeof p === 'object') {
      // object could be provider, or an event wrapper, normalize
      // try common shapes
      providerId = p?.id ?? p?.providerId ?? null;
      initialContent = p?.notes ?? '';
      // if the caller passed { provider } shape
      if (!providerId && p.provider && (p.provider.id || p.providerId)) {
        providerId = p.provider.id ?? p.provider.providerId ?? null;
        initialContent = p.provider.notes ?? initialContent;
      }
    } else if (typeof p === 'string' || typeof p === 'number') {
      providerId = p as any;
    }

    // Normalize numeric string ids to numbers when possible
    if (typeof providerId === 'string' && !isNaN(Number(providerId))) {
      providerId = Number(providerId) as any;
    }

    modals.notes.providerId = providerId;

    // prefer in-memory note but allow persisted note to override
    modals.notes.content = initialContent || '';

    // Only try to load persisted note when we have a valid provider id
    if (modals.notes.providerId != null) {
      try {
        const all = (await dixieController.listBackups()) as any[];
        const target = (selectedDate.value || '').slice(0, 10);
        const matches = (all || [])
          .filter(
            b =>
              b &&
              b.component === 'BudgetNotes' &&
              b.data &&
              b.data.selectedDate &&
              (b.data.selectedDate as string).slice(0, 10) === target &&
              b.data.providerId === modals.notes.providerId
          )
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (matches.length) {
          const latest = matches[0];
          modals.notes.content =
            latest.data && latest.data.content
              ? String(latest.data.content)
              : modals.notes.content;
        }
      } catch (_e) {
        /* noop */
      }
    }

    setTimeout(() => (modals.notes.open = true), 50);
  } catch (err) {
    console.error('openNotesModal error:', err);
  }
}

async function saveNotes() {
  try {
    const pid = modals.notes.providerId;
    const content = String(modals.notes.content ?? '');

    console.log('saveNotes: start', {
      pid,
      content,
      selectedDate: selectedDate.value,
    });

    if (pid == null) {
      console.warn('saveNotes: no providerId set');
      // keep modal open so user can retry/inspect
      return;
    }

    // Update in-memory provider notes immediately so the UI reflects the change
    const prov = proveedores.find((p: any) => p.id === pid);
    if (prov) prov.notes = content;

    // Normalize providerId to avoid string/number mismatch when querying later
    const normalizedPid: number | string =
      typeof pid === 'string' && !isNaN(Number(pid)) ? Number(pid) : pid;

    // Build payload to persist
    const payloadToSave = {
      component: 'BudgetNotes',
      data: {
        providerId: normalizedPid,
        selectedDate: selectedDate.value,
        content,
      },
      createdAt: Date.now(),
    } as any;

    // Try addEntry first; if it fails, try putEntry as a fallback (some environments
    // may reject add() due to constraints while put() can succeed)
    let savedId: any = null;

    try {
      savedId = await dixieController.addEntry(payloadToSave);
      console.log('saveNotes: addEntry succeeded', {
        savedId,
        pid: normalizedPid,
      });
    } catch (addErr) {
      console.warn(
        'saveNotes: addEntry failed, attempting putEntry as fallback',
        addErr
      );
      try {
        savedId = await dixieController.putEntry({ entry: payloadToSave });
        console.log('saveNotes: putEntry succeeded as fallback', {
          savedId,
          pid: normalizedPid,
        });
      } catch (putErr) {
        console.error('saveNotes: putEntry also failed', putErr, {
          payloadToSave,
        });
      }
    }

    if (savedId == null) {
      // Persist failed: keep modal open and inform via console (optionally show a toast)
      console.warn(
        'saveNotes: failed to persist note for provider',
        normalizedPid
      );
      return;
    }

    // Success: close modal and clear providerId
    modals.notes.open = false;
    modals.notes.providerId = null;
    console.log(
      'saveNotes: note saved for provider',
      normalizedPid,
      'id=',
      savedId
    );
  } catch (err) {
    console.error('saveNotes error:', err);
  }
}

function onNotesModalDidDismiss() {
  try {
    modals.notes.open = false;
    modals.notes.providerId = null;
    // keep modals.notes.content so the in-memory provider keeps it until explicitly changed
  } catch (_e) {
    /* noop */
  }
}

// Helper: attempt to load suppliers list from suppliersController (various method names)
async function loadSuppliersListForTemplates(): Promise<any[]> {
  try {
    let suppliersList: any[] = [];
    if (typeof (suppliersController as any).listSuppliers === 'function') {
      try {
        const res = await (suppliersController as any).listSuppliers();
        if (Array.isArray(res)) return res;
      } catch (_e) {
        /* noop */
      }
    }

    const candidates = ['list', 'listAll', 'getAll', 'getSuppliers'];
    for (const name of candidates) {
      const fn = (suppliersController as any)[name];
      if (typeof fn === 'function') {
        try {
          const r = await fn();
          if (Array.isArray(r)) return r;
        } catch (_e) {
          /* noop */
        }
      }
    }
    return suppliersList;
  } catch (_e) {
    return [];
  }
}

// Helper: handle conflict result from buildAndSaveTemplateApplication
function handleTemplateConflict(result: any, tmpl: any, dateISO: string) {
  try {
    try {
      const parsedDate = parseLocalDate(String(dateISO));
      applyConflictMessage.value = `Ya existen proveedores guardados para ${format(parsedDate, "d 'de' MMMM 'de' yyyy", { locale: esLocale })}. ¿Deseas combinar el template con los proveedores existentes o sobrescribirlos?`;
    } catch (_e) {
      applyConflictMessage.value = `Ya existen proveedores guardados para la fecha seleccionada. ¿Deseas combinar el template con los proveedores existentes o sobrescribirlos?`;
    }
    pendingApplyPayload.value = result.payloadToSave;
    pendingApplyTemplate.value = tmpl;
    showApplyConflictModal.value = true;
  } catch (err) {
    console.error('handleTemplateConflict error', err);
  }
}

// Helper: navigate to Budget view or reload data for current route
async function navigateToBudget(dateISO: string) {
  try {
    try {
      localStorage.setItem(STORAGE_KEY, String(dateISO));
    } catch (_e) {
      /* noop */
    }

    try {
      if ((route.name || '') === 'Budget') {
        selectedDate.value = dateISO;
        await loadDataForDate(dateISO);
      } else {
        (await import('vue-router')).useRouter()?.push({
          name: 'Budget',
          query: { refresh: String(Date.now()), date: dateISO },
        });
      }
    } catch (_e) {
      // fallback
      window.location.href =
        '#/budget?refresh=' +
        String(Date.now()) +
        '&date=' +
        encodeURIComponent(dateISO);
    }
  } catch (err) {
    console.error('navigateToBudget error', err);
  }
}

function onApplyConflictDismiss() {
  try {
    showApplyConflictModal.value = false;
    pendingApplyPayload.value = null;
  } catch (_e) {
    /* noop */
  }
}

async function handleApplyConflictCombine() {
  try {
    const payloadToSave = pendingApplyPayload.value;
    if (!payloadToSave) return onApplyConflictDismiss();

    const dateISO = payloadToSave.data?.selectedDate;
    // Load suppliers list to resolve names synchronously
    let suppliersList: any[] = [];
    try {
      const resList =
        typeof (suppliersController as any).listSuppliers === 'function'
          ? await (suppliersController as any).listSuppliers()
          : null;
      if (Array.isArray(resList)) suppliersList = resList;
    } catch (_e) {
      try {
        const candidates = ['list', 'listAll', 'getAll', 'getSuppliers'];
        for (const name of candidates) {
          const fn = (suppliersController as any)[name];
          if (typeof fn === 'function') {
            try {
              const r = await fn();
              if (Array.isArray(r)) {
                suppliersList = r;
                break;
              }
            } catch (_ee) {
              /* noop */
            }
          }
        }
      } catch (_ee) {
        /* noop */
      }
    }

    const res = await buildAndSaveTemplateApplication(
      pendingApplyTemplate.value || null,
      dateISO,
      (id: any) => {
        try {
          const found = suppliersList.find((s: any) => s && s.id === id);
          return found ? found.name : null;
        } catch (_e) {
          return null;
        }
      },
      {
        conflictStrategy: 'combine',
        prebuiltPayload: pendingApplyPayload.value,
      }
    );

    if (res && res.success) {
      try {
        localStorage.setItem(STORAGE_KEY, String(dateISO));
      } catch (_e) {
        /* noop */
      }

      showApplyConflictModal.value = false;
      pendingApplyPayload.value = null;

      selectedDate.value = dateISO;
      await loadDataForDate(dateISO);
      return;
    }

    console.error('handleApplyConflictCombine: unexpected result', res);
  } catch (e) {
    console.error('handleApplyConflictCombine error', e);
  }
}

async function handleApplyConflictOverwrite() {
  try {
    const payloadToSave = pendingApplyPayload.value;
    if (!payloadToSave) return onApplyConflictDismiss();

    const dateISO = payloadToSave.data?.selectedDate;
    // Load suppliers list to resolve names synchronously
    let suppliersList: any[] = [];
    try {
      const resList =
        typeof (suppliersController as any).listSuppliers === 'function'
          ? await (suppliersController as any).listSuppliers()
          : null;
      if (Array.isArray(resList)) suppliersList = resList;
    } catch (_e) {
      try {
        const candidates = ['list', 'listAll', 'getAll', 'getSuppliers'];
        for (const name of candidates) {
          const fn = (suppliersController as any)[name];
          if (typeof fn === 'function') {
            try {
              const r = await fn();
              if (Array.isArray(r)) {
                suppliersList = r;
                break;
              }
            } catch (_ee) {
              /* noop */
            }
          }
        }
      } catch (_ee) {
        /* noop */
      }
    }

    const res = await buildAndSaveTemplateApplication(
      pendingApplyTemplate.value || null,
      dateISO,
      (id: any) => {
        try {
          const found = suppliersList.find((s: any) => s && s.id === id);
          return found ? found.name : null;
        } catch (_e) {
          return null;
        }
      },
      {
        conflictStrategy: 'overwrite',
        prebuiltPayload: pendingApplyPayload.value,
      }
    );

    if (res && res.success) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          String(payloadToSave.data?.selectedDate)
        );
      } catch (_e) {
        /* noop */
      }

      showApplyConflictModal.value = false;
      pendingApplyPayload.value = null;

      selectedDate.value = dateISO;
      await loadDataForDate(dateISO);
      return;
    }

    console.error('handleApplyConflictOverwrite: unexpected result', res);
  } catch (e) {
    console.error('handleApplyConflictOverwrite error', e);
  }
}

// Helpers for onMoveProvider refactor
function _normalizeToDateISO(date: Date | string): string {
  try {
    if (date instanceof Date) return formatLocalDate(date);
    if (typeof date === 'string') {
      const s =
        String(date).length >= 10 ? String(date).slice(0, 10) : String(date);
      const d = parseLocalDate(s);
      if (!isNaN(d.getTime())) return formatLocalDate(d);
      const fallback = new Date(String(date));
      if (!isNaN(fallback.getTime())) return formatLocalDate(fallback);
    }
    const d2 = new Date(String(date));
    return !isNaN(d2.getTime()) ? formatLocalDate(d2) : String(date);
  } catch (_e) {
    return String(date);
  }
}

function _removeProviderFromList(providerId: string | number) {
  try {
    const idx = proveedores.findIndex((p: Provider) => p.id === providerId);
    if (idx >= 0) proveedores.splice(idx, 1);
  } catch (_e) {
    /* noop */
  }
}

function _buildMoveBackupPayload(provider: Provider, dateISO: string) {
  const provCopy: Provider = { ...provider, date: dateISO };
  return {
    component: 'BudgetView',
    data: {
      ingresos: [],
      entries: [],
      proveedores: [provCopy],
      newIngreso: { name: '', amount: 0, date: formatLocalDate(dateISO) },
      newProveedor: { name: '', estimated: 0, dollar: 0, notes: '' },
      selectedDate: formatLocalDate(dateISO),
      totals: {
        totalIngresos: 0,
        totalProviders: Number(provCopy.dollar || provCopy.estimated || 0) || 0,
        totalVisitedProviders: provCopy.visited
          ? Number(provCopy.dollar || provCopy.estimated || 0) || 0
          : 0,
      },
    },
    createdAt: Date.now(),
  };
}

async function _persistBackupAndNotify(
  provider: Provider,
  backupPayload: any,
  dateISO: string
) {
  try {
    await backupController.saveBackup({ entry: backupPayload });
    try {
      let prettyDate = dateISO;
      try {
        const parsed = new Date(dateISO);
        if (!isNaN(parsed.getTime())) {
          prettyDate = format(parsed, "d 'de' MMMM 'de' yyyy", {
            locale: esLocale,
          });
        }
      } catch (_e) {
        /* noop */
      }
      toast.message = `Proveedor «${provider.name || ''}» movido a ${prettyDate}`;
      toast.open = true;
    } catch (_e) {
      /* noop */
    }
  } catch (saveErr) {
    console.error('onMoveProvider: error saving backup', saveErr);
  }
}

async function onMoveProvider(
  params: { provider?: Provider; date?: Date | string } = {}
) {
  const { provider, date } = params;

  if (!provider || !date) return;

  try {
    const dateISO = _normalizeToDateISO(date as any);

    // Remove from current list (best-effort)
    try {
      _removeProviderFromList(provider.id as any);
    } catch (_e) {
      /* noop */
    }

    // Build and persist a minimal backup for the destination date
    try {
      const payload = _buildMoveBackupPayload(provider as Provider, dateISO);
      await _persistBackupAndNotify(provider as Provider, payload, dateISO);
    } catch (_e) {
      console.error('onMoveProvider: build/persist error', _e);
    }
  } catch (err) {
    console.error('onMoveProvider error:', err);
  }
}

/**
 * Open the "Finalizar dia" modal and preload previously saved finish-day values if present
 */
async function openFinishDayModal() {
  // Kept for compatibility: open the inline finish-day form
  try {
    finishDay.totalSales = Number(finishDay.totalSales || 0) || 0;
    finishDay.totalSalesEfectivo =
      Number(finishDay.totalSalesEfectivo || 0) || 0;
    finishDay.totalSalesTarjeta = Number(finishDay.totalSalesTarjeta || 0) || 0;
    finishDay.totalSalesCredito = Number(finishDay.totalSalesCredito || 0) || 0;
    finishDay.type = finishDay.type || '%';

    // try to preload previously saved values
    try {
      const all = (await dixieController.listBackups()) as any[];
      const target = (selectedDate.value || '').slice(0, 10);
      const matches = (all || [])
        .filter(
          b =>
            b &&
            b.component === 'BudgetFinishDay' &&
            b.data &&
            b.data.selectedDate &&
            (b.data.selectedDate as string).slice(0, 10) === target
        )
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (matches.length) {
        const latest = matches[0];
        const d = latest.data || {};
        finishDay.totalSalesEfectivo =
          Number(d.totalSalesEfectivo ?? d.totalSales ?? 0) || 0;
        finishDay.totalSalesTarjeta = Number(d.totalSalesTarjeta ?? 0) || 0;
        finishDay.totalSalesCredito = Number(d.totalSalesCredito ?? 0) || 0;
        finishDay.totalSales =
          Number(
            d.totalSales ||
              finishDay.totalSalesEfectivo +
                finishDay.totalSalesTarjeta +
                finishDay.totalSalesCredito
          ) || 0;
        finishDay.type = String(d.type || finishDay.type || '%');
        finishDay.margin = Number(d.margin || 0) || 0;
      }
    } catch (_e) {
      /* noop */
    }

    // Show the inline finish form by setting dayState to 'closing'
    dayState.value = 'closing';
  } catch (err) {
    console.error('openFinishDayModal error:', err);
  }
}

/**
 * Persist the finish day data to the local storage (dixieController) and close the modal
 */
// Helpers for saveFinishDay refactor
function _validateFinishTotal(total: number) {
  if (!isFinite(total)) {
    toast.message = 'Total ventas no es válido';
    toast.open = true;
    return false;
  }
  return true;
}

function _buildFinishDayPayload() {
  const total = Number(finishDay.totalSales || 0) || 0;
  const payloadToSave = {
    component: 'BudgetFinishDay',
    data: {
      selectedDate: formatLocalDate(selectedDate.value),
      totalSalesEfectivo:
        Number(finishDay.totalSalesEfectivo || finishDay.totalSales || 0) || 0,
      totalSalesTarjeta: Number(finishDay.totalSalesTarjeta || 0) || 0,
      totalSalesCredito: Number(finishDay.totalSalesCredito || 0) || 0,
      totalSales:
        Number(finishDay.totalSalesEfectivo || 0) +
          Number(finishDay.totalSalesTarjeta || 0) +
          Number(finishDay.totalSalesCredito || 0) ||
        Number(total || 0) ||
        0,
      type: String(finishDay.type || '%'),
      margin: Number(finishDay.margin || 0) || 0,
      closed: true,
    },
    createdAt: Date.now(),
  };
  return { total, payloadToSave };
}

async function _persistFinishDayPayload(payloadToSave: any) {
  try {
    let savedId: any = null;
    try {
      const all = (await dixieController.listBackups()) as any[];
      const target = String(selectedDate.value || '').slice(0, 10);
      const existing = (all || [])
        .filter(
          b =>
            b &&
            b.component === 'BudgetFinishDay' &&
            b.data &&
            (b.data as any).selectedDate &&
            String((b.data as any).selectedDate).slice(0, 10) === target
        )
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

      if (existing && existing.id != null) {
        (payloadToSave as any).id = existing.id;
        savedId = await dixieController.putEntry({ entry: payloadToSave });
      } else {
        savedId = await dixieController.addEntry({ entry: payloadToSave });
      }
    } catch (errPutAdd) {
      try {
        savedId = await dixieController.putEntry({ entry: payloadToSave });
      } catch (_e) {
        try {
          savedId = await dixieController.addEntry({ entry: payloadToSave });
        } catch (__e) {
          console.error('saveFinishDay persist error', __e);
        }
      }
    }

    if (savedId == null) {
      try {
        await backupController.saveBackup({ entry: payloadToSave });
      } catch (backupErr) {
        console.error('saveFinishDay: fallback backup save failed', backupErr);
      }
    }

    return savedId;
  } catch (e) {
    console.error('saveFinishDay error saving', e);
    throw e;
  }
}

async function _persistBudgetViewDayClosedSnapshot() {
  try {
    const backupPayload = {
      component: 'BudgetView',
      data: {
        selectedDate: formatLocalDate(selectedDate.value),
        ingresos: entries || [],
        entries: entries || [],
        proveedores: proveedores || [],
        newIngreso: newIngreso || {
          name: '',
          amount: 0,
          date: formatLocalDate(selectedDate.value),
        },
        newProveedor: newProveedor || {
          name: '',
          estimated: 0,
          dollar: 0,
          notes: '',
        },
        totals: {
          totalIngresos: Number(totalIngresos.value || 0) || 0,
          totalProviders: Number(totalProviders.value || 0) || 0,
          totalVisitedProviders: Number(totalVisitedProviders.value || 0) || 0,
        },
      },
      createdAt: Date.now(),
    };

    try {
      await dixieController.addEntry({ entry: backupPayload });
    } catch (addErr) {
      try {
        await dixieController.putEntry({ entry: backupPayload });
      } catch (putErr) {
        try {
          await backupController.saveBackup({ entry: backupPayload });
        } catch (_e) {
          /* noop */
        }
      }
    }
  } catch (_e) {
    /* noop */
  }
}

async function saveFinishDay() {
  try {
    const { total, payloadToSave } = _buildFinishDayPayload();

    if (!_validateFinishTotal(total)) return;

    try {
      await _persistFinishDayPayload(payloadToSave);
    } catch (e) {
      toast.message = 'Error al guardar';
      toast.open = true;
      return;
    }

    // Success UX
    toast.message = 'Datos guardados';
    toast.open = true;

    try {
      dayState.value = 'closed';
      closingIntent.value = false;
    } catch (_e) {
      /* noop */
    }

    try {
      const key = `budget:closed:${String(selectedDate.value || '').slice(0, 10)}`;
      localStorage.setItem(key, '1');
    } catch (_e) {
      /* noop */
    }

    // Persist a minimal BudgetView snapshot marking dayClosed
    await _persistBudgetViewDayClosedSnapshot();
  } catch (err) {
    console.error('saveFinishDay error:', err);
    toast.message = 'Error inesperado';
    toast.open = true;
  }
}

/**
 * Scroll the given list ref (or element) to its end. Uses nextTick to ensure DOM updated.
 */
function scrollListToEnd(
  listRef?: { value: HTMLElement | null } | HTMLElement | null
) {
  try {
    nextTick(() => {
      let el: HTMLElement | null = null;
      if (!listRef) {
        el = null;
      } else if ((listRef as any).value !== undefined) {
        el = (listRef as any).value as HTMLElement | null;
      } else if (listRef instanceof HTMLElement) {
        el = listRef as HTMLElement;
      }
      if (!el) return;
      try {
        // try smooth scroll when available
        (el as any).scrollTo?.({ top: el.scrollHeight, behavior: 'smooth' });
        // fallback
        el.scrollTop = el.scrollHeight;
      } catch (_e) {
        /* noop */
      }
    });
  } catch (_e) {
    /* noop */
  }
}

/**
 * askOverwriteConfirm: Promise-based helper that opens the overwriteConfirm ion-alert
 * and resolves to true when the user confirms or false when cancels/dismisses.
 * Params are optional and used to populate the alert message for better UX.
 */
function askOverwriteConfirm(
  params: {
    providerId?: string | number | null;
    providerName?: string;
    total?: number;
  } = {}
) {
  return new Promise<boolean>(resolve => {
    try {
      overwriteConfirm.providerId = params.providerId ?? null;
      overwriteConfirm.providerName = params.providerName ?? '';
      overwriteConfirm.total = Number(params.total || 0) || 0;

      // Provide a resolver that will be called by the alert button handlers
      overwriteConfirm._resolve = (val: boolean) => {
        try {
          resolve(Boolean(val));
        } catch (_e) {
          try {
            resolve(false);
          } catch (__) {
            /* noop */
          }
        }
        overwriteConfirm._resolve = null;
      };

      overwriteConfirm.open = true;
    } catch (_e) {
      // In case of any error, resolve as false to avoid accidental overwrites
      try {
        resolve(false);
      } catch (__) {
        /* noop */
      }
      overwriteConfirm._resolve = null;
      overwriteConfirm.open = false;
    }
  });
}
</script>

<style scoped>
.centered-popover {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
.centered-popover ion-datetime {
  width: 100%;
  max-width: 320px;
}
ion-card {
  margin-bottom: 16px;
  border: 1px solid transparent;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

/* Hide delete buttons for income rows by default (remove from layout) */
.income-item .hover-only {
  display: none;
}

/* Show on hover for pointer devices */
@media (hover: hover) and (pointer: fine) {
  .income-item:hover .hover-only {
    display: inline-flex;
  }
}

/* Also show when any child has focus (keyboard accessibility) */
.income-item:focus-within .hover-only,
.income-item .hover-only:focus {
  display: inline-flex;
}

.providers-list ion-card.shadow2:active {
  border-color: var(--ion-color-primary, #3880ff);
  box-shadow: 0 6px 18px rgba(56, 128, 255, 0.06);
}

/* Mostrar borde solo mientras el puntero está encima en escritorio (puntero fino) */
@media (hover: hover) and (pointer: fine) {
  .providers-list ion-card.shadow2:hover {
    border-color: var(--ion-color-primary, #3880ff);
    box-shadow: 0 6px 18px rgba(56, 128, 255, 0.06);
  }
}

/* Mostrar borde cuando el elemento recibe foco por teclado (accesibilidad) */
.providers-list ion-card.shadow2:focus-visible {
  border-color: var(--ion-color-primary, #3880ff);
  box-shadow: 0 6px 18px rgba(56, 128, 255, 0.06);
}
.header {
  font-weight: bold;
  padding-bottom: 8px;
}
.provider-row {
  align-items: center;
}
.col-name {
  font-weight: 600;
}

/* Estilos para cards por proveedor */
.provider-card {
  margin-bottom: 12px;
}

.provider-card ion-card-title {
  font-size: 1rem;
  font-weight: 600;
}

/* Minimal provider card look */
.provider-card.minimal {
  border-radius: 10px;
  padding: 8px 0;
  background: var(--ion-background-color, #fff);
  box-shadow: none;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

/* .provider-title { */
/*   font-size: 0.96rem; */
/*   font-weight: 600; */
/*   padding: 6px 12px; */
/* } */

.provider-content {
  padding: 8px 12px 12px 12px;
}

.provider-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.provider-value {
  font-weight: 700;
  color: var(--ion-color-primary, #222);
  font-size: 1rem;
}

.provider-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tiny-label {
  font-size: 0.8rem;
  opacity: 0.8;
}

.icon-btn {
  color: var(--ion-color-danger, #d9534f);
}

.provider-row-fields {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.compact-field {
  flex: 1 1 50%;
  display: flex;
  flex-direction: column;
}

.num-input.small {
  width: 100%;
  min-width: 80px;
}

.provider-notes {
  margin-top: 8px;
}

.notes-text {
  color: var(--ion-text-color, #666);
  font-size: 0.82rem;
  display: block;
  max-height: 3.6em;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Hacer que los inputs numéricos ocupen todo el ancho y alineen a la derecha */
.num-input {
  width: 100%;
}

.num-input ::slotted(input),
.num-input input {
  text-align: right;
}

/* estilos para el contenedor de proveedores (reemplazo del ion-card exterior) */
.providers-section {
  padding: 0.5rem 0.75rem;
  margin-bottom: 16px;
  border-radius: 8px;
  background: var(--ion-background-color, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.providers-section .section-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.providers-section .section-content {
  padding: 0;
}

.provider-fields {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.provider-name h3 {
  margin: 0;
}

.num-input.small {
  width: 120px;
  min-width: 80px;
}

.notes-input {
  flex: 1 1 150px;
}

/* Card vacía para agregar proveedor (estilo similar a la imagen adjunta) */
.add-provider-card {
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  background: var(--ion-background-color, #fff);
  padding: 12px;
}
.add-card-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
}
.add-card-plus {
  font-size: 48px;
  color: var(--ion-color-primary, #ffec3b);
  line-height: 1;
  user-select: none;
}

/* Evitar que el label se parta en dos líneas y forzar disposición vertical en compact fields */
.compact-field ion-label,
.compact-field label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
  font-size: 0.88rem;
}

/* Alineado derecho para inputs numéricos dentro de compact-field */
.compact-field ion-input ::slotted(input),
.compact-field ion-input input {
  text-align: right;
}

.provider-value {
  word-break: break-word;
}

/* Evitar márgenes/paddings extra que desplacen visualmente el encabezado de la lista */
.providers-list-body {
  margin-top: 0;
  padding-top: 0;
  /* Limitar altura y permitir scroll interno para que solo esta sección haga scroll */
  /* ahora dejamos que ocupe el alto disponible y sea scrollable internamente */
  max-height: none;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

/* Hacer que el ion-list de proveedores ocupe la altura visible máxima */
.providers-list {
  display: flex;
  flex-direction: column;
  /* Restar altura aproximada del header/toolbar + padding; ajustar si es necesario */
  height: calc(100vh - 110px);
}

.providers-list .providers-list-body {
  /* ocupar el espacio restante dentro del ion-list y permitir scroll interno */
  flex: 1 1 auto;
  min-height: 0; /* importante para que el scroll funcione dentro de flex */
}

/* Normalizar margen superior de cards dentro de ion-list */
.providers-list ion-card,
ion-list > ion-card {
  margin-top: 0;
}

ion-list.main {
  box-shadow: rgba(0, 0, 0, 0.05) 0px 0px 0px 1px;
}

/* Animación al agregar un proveedor: fade + scale desde abajo */
.provider-just-added {
  animation: provider-enter 360ms ease forwards;
}

@keyframes provider-enter {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Mobile / touch: mostrar borde cuando la card recibe foco interno (inputs) o cuando
   se agrega la clase .touch-active por los handlers de pointer. Esto asegura que
   en móvil la card se active al tocar cualquiera de sus elementos. */
@media (hover: none) and (pointer: coarse) {
  .providers-list ion-card.shadow1:focus-within,
  .providers-list ion-card.shadow1.touch-active {
    border-color: var(--ion-color-primary, #3880ff);
    box-shadow: 0 6px 18px rgba(56, 128, 255, 0.06);
  }
}

/* Force empty ingreso row to match input rows height and alignment */
.ingreso-empty {
  min-height: 44px; /* same as ion-item default touch height */
  display: flex;
  align-items: center;
  padding-left: 16px; /* match ion-item content padding */
  padding-right: 16px;
  box-sizing: border-box;
}

.ingreso-empty ion-label {
  width: 100%;
  white-space: normal;
}
</style>
