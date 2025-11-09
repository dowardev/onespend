<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Presupuesto({{ selectedDate }})</ion-title>

        <ion-buttons slot="end">
          <ion-button
            title="Seleccionar fecha"
            @click="openDatePopover({ event: $event })"
          >
            <ion-icon :icon="calendarOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row>
          <!-- Left: summary + incomes -->
          <ion-col size="12" size-md="5" size-lg="4">
            <ion-list class="main">
              <ion-list-header>
                <ion-label> Presupuesto </ion-label>
              </ion-list-header>

              <div>
                <ion-card class="shadow1">
                  <ion-card-header>
                    <ion-card-title
                      >Ingresos ({{
                        formatCurrency({ v: totalIngresos })
                      }})</ion-card-title
                    >
                  </ion-card-header>

                  <ion-card-content>
                    <ion-grid>
                      <ion-row>
                        <ion-col>
                          <ion-item v-for="inc in ingresos" :key="inc.id">
                            <ion-input
                              v-model="inc.name"
                              placeholder="Nombre"
                            ></ion-input>

                            <ion-input
                              slot="end"
                              v-model.number="inc.amount"
                              type="number"
                              class="num-input"
                            ></ion-input>

                            <ion-button
                              slot="end"
                              fill="clear"
                              size="small"
                              title="Eliminar ingreso"
                              @click="removeIngreso(inc.id)"
                            >
                              <ion-icon :icon="trashOutline"></ion-icon>
                            </ion-button>
                          </ion-item>

                          <ion-button
                            fill="clear"
                            expand="full"
                            @click="addIngresoField()"
                          >
                            <ion-icon :icon="addOutline"> </ion-icon>
                          </ion-button>
                        </ion-col>
                      </ion-row>
                    </ion-grid>
                  </ion-card-content>
                </ion-card>

                <ion-card class="shadow1">
                  <ion-card-header>
                    <ion-card-title>Resumen</ion-card-title>
                  </ion-card-header>

                  <ion-card-content>
                    <ion-item class="transparent">
                      <ion-label>Presupuesto después de(estimacion)</ion-label>
                      <ion-note slot="end">{{
                        formatCurrency({ v: totalIngresos - totalProviders })
                      }}</ion-note>
                    </ion-item>

                    <ion-item class="transparent">
                      <ion-label>Presupuesto después de(real)</ion-label>
                      <ion-note slot="end">{{
                        formatCurrency({
                          v: totalIngresos - totalVisitedProviders,
                        })
                      }}</ion-note>
                    </ion-item>
                  </ion-card-content>
                </ion-card>
              </div>
            </ion-list>
          </ion-col>

          <!-- Right: providers + unexpected -->
          <ion-col size="12" size-md="7" size-lg="8">
            <ion-list class="providers-list main">
              <ion-list-header>
                <ion-label
                  >Proveedores ({{
                    formatCurrency({ v: totalProviders })
                  }})</ion-label
                >
              </ion-list-header>

              <div ref="providersBodyRef" class="providers-list-body">
                <ion-grid>
                  <ion-row>
                    <ion-col
                      v-for="p in proveedores"
                      :key="p.id"
                      :class="{ 'provider-just-added': p._justAdded }"
                      size="12"
                      size-lg="6"
                    >
                      <ion-card class="shadow1">
                        <ion-card-header>
                          <template v-if="p.name">
                            <ion-card-title class="provider-title">{{
                              p.name
                            }}</ion-card-title>
                          </template>

                          <template v-else>
                            <ion-input
                              :ref="el => (nameInputRefs[p.id] = el)"
                              v-model="p.name"
                              placeholder="Nombre proveedor"
                            ></ion-input>
                          </template>
                        </ion-card-header>

                        <ion-card-content>
                          <div class="provider-top">
                            <div class="provider-value">
                              {{ formatCurrency({ v: valueToConsider(p) }) }}
                            </div>

                            <div class="provider-actions">
                              <ion-item
                                class="transparent"
                                lines="none"
                                button
                                @click="toggleVisited(p)"
                              >
                                <ion-checkbox
                                  slot="start"
                                  v-model="p.visited"
                                  @click.stop
                                ></ion-checkbox>

                                <ion-label class="tiny-label">Visita</ion-label>
                              </ion-item>

                              <ion-button
                                v-if="hasProductsFor(p)"
                                fill="clear"
                                size="small"
                                title="Ver productos"
                                class="icon-btn"
                                @click.stop="
                                  openProductsPopover({
                                    provider: p,
                                    event: $event,
                                  })
                                "
                              >
                                <ion-icon :icon="listOutline"></ion-icon>
                              </ion-button>

                              <ion-button
                                fill="clear"
                                size="small"
                                title="Eliminar proveedor"
                                class="icon-btn"
                                @click.stop="removeProveedor(p.id)"
                              >
                                <ion-icon :icon="trashOutline"></ion-icon>
                              </ion-button>
                            </div>
                          </div>

                          <div class="provider-row-fields">
                            <ion-input
                              v-model.number="p.estimated"
                              label="Estimado"
                              label-placement="floating"
                              type="number"
                              class="num-input small"
                            ></ion-input>

                            <ion-input
                              v-model.number="p.dollar"
                              label="$"
                              label-placement="floating"
                              type="number"
                              class="num-input small"
                            ></ion-input>
                          </div>

                          <div v-if="p.notes" class="provider-notes">
                            <small class="notes-text">{{ p.notes }}</small>
                          </div>
                        </ion-card-content>
                      </ion-card>
                    </ion-col>

                    <!-- Empty card to add new provider -->
                    <ion-col size="12" size-lg="6">
                      <ion-card
                        class="no-shadow add-provider-card"
                        @click="addBlankProvider"
                      >
                        <ion-card-content class="add-card-content">
                          <div class="add-card-plus">+</div>
                        </ion-card-content>
                      </ion-card>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </div>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- popover -->
      <ion-popover
        :is-open="popovers.date.open"
        :event="popovers.date.event"
        :keep-contents-mounted="true"
        @did-dismiss="onPopoverDidDismiss"
      >
        <ion-content>
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
              >Hoy</ion-button
            >
          </ion-item>
        </ion-content>
      </ion-popover>

      <!-- products modal -->
      <ion-modal
        :is-open="popovers.products.open"
        :keep-contents-mounted="true"
        @did-dismiss="onProductsModalDidDismiss"
      >
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ popovers.products.title }}</ion-title>
            <ion-buttons slot="end">
              <ion-button
                fill="clear"
                size="small"
                @click="onProductsModalDidDismiss"
                >Cerrar</ion-button
              >
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list
            v-if="
              popovers.products.products && popovers.products.products.length
            "
          >
            <ion-item
              v-for="(prod, idx) in popovers.products.products"
              :key="prod.id ?? idx"
            >
              <ion-label>
                <h3>
                  {{
                    prod.name || prod.productName || prod.title || 'Producto'
                  }}
                </h3>
                <p v-if="prod.price || prod.amount">
                  {{
                    formatCurrency({
                      v: Number(prod.price || prod.amount || 0),
                    })
                  }}
                </p>
              </ion-label>

              <ion-input
                slot="end"
                v-model.number="popovers.products.quantities[prod.id ?? idx]"
                type="number"
                class="num-input small"
                placeholder="Cantidad"
              ></ion-input>
            </ion-item>
          </ion-list>

          <div v-else class="ion-padding">No hay productos</div>
        </ion-content>

        <ion-footer>
          <ion-toolbar>
            <ion-buttons slot="end">
              <ion-button
                fill="clear"
                size="small"
                @click="onProductsModalDidDismiss"
                >Cancelar</ion-button
              >
              <ion-button color="primary" @click="saveProductsModal"
                >Guardar</ion-button
              >
            </ion-buttons>
          </ion-toolbar>
        </ion-footer>
      </ion-modal>
      <!-- end modal -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonInput,
  IonCheckbox,
  IonButton,
  IonDatetime,
  IonPopover,
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
  calendarOutline,
  trashOutline,
  listOutline,
} from 'ionicons/icons';
import { useRoute } from 'vue-router';

// interface
type Income = {
  id: string | number;
  name: string;
  amount: number;
  date: string;
};

type FocusableRef =
  | Element
  | ComponentPublicInstance
  | {
      setFocus?: () => void;
      $el?: { setFocus?: () => void };
      focus?: () => void;
    };

// Controllers
import dixieController from '../controllers/dixie';
import backupController from '../controllers/backupController';
import suppliersController from '../controllers/suppliersController';

// State
const ingresos = reactive([
  {
    id: Date.now() + Math.random(),
    name: 'Inicio',
    amount: 0,
    date: new Date().toISOString(),
  },
  {
    id: Date.now() + Math.random(),
    name: 'Corte',
    amount: 0,
    date: new Date().toISOString(),
  },
  {
    id: Date.now() + Math.random(),
    name: 'Jesus',
    amount: 0,
    date: new Date().toISOString(),
  },
]) as Income[];
const newIngreso = reactive({
  name: '',
  amount: 0,
  date: new Date().toISOString(),
});
const proveedores = reactive(
  [
    'Agua',
    'Bolsas',
    'Chicharron',
    'Gamesa',
    'Lala',
    'Queso',
    'Semillas',
    'Soñador',
    'Tm20',
    'Tm24',
    'Zaragoza',
  ].map(n => ({
    id: Date.now() + Math.random(),
    name: n,
    date: new Date().toISOString(),
    estimated: 0,
    dollar: 0,
    notes: '',
    visited: false,
    _justAdded: false,
  }))
);
const newProveedor = reactive({ name: '', estimated: 0, dollar: 0, notes: '' });
const nameInputRefs = reactive(
  {} as Record<string | number, FocusableRef | null>
);
const STORAGE_KEY = 'budget:selectedDate';
const selectedDate = ref(new Date().toISOString());
const route = useRoute();
const popovers = reactive({
  date: { open: false, event: null as unknown },
  products: {
    open: false,
    event: null as unknown,
    products: [] as any[],
    // quantities per product id (or index) while modal is open
    quantities: {} as Record<string | number, number>,
    // id of provider for which the modal is open (used when saving quantities)
    providerId: null as string | number | null,
    title: '' as string,
  },
});
const providersBodyRef = ref<HTMLElement | null>(null);

// Map of supplier name -> products loaded from suppliers DB
const suppliersProducts = reactive({} as Record<string, any[]>);

// Lifecycle
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    selectedDate.value = saved;
  }
  // load data for the selected date
  loadDataForDate(selectedDate.value);
  // load suppliers/products map used to decide if a provider has products
  void loadSuppliersProducts();
  // keep references to avoid unused warnings
  void addIngreso;
  void onIngresoIonInput;
  void onNewIngresoNameInput;
  void onNewIngresoAmountInput;
  void addProveedor;
});

onMounted(() => {
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

// Watchers
watch(
  selectedDate,
  newSelectedDate => {
    try {
      localStorage.setItem(STORAGE_KEY, newSelectedDate);
    } catch (error) {
      /* noop */
    }
    loadDataForDate(newSelectedDate);
  },
  { immediate: false }
);

// Watch for query param used to force refresh from other views (TemplatesView pushes ?refresh=timestamp)
watch(
  () => route.query.refresh,
  () => {
    try {
      // Prefer the date provided in the URL query (if any) and update selectedDate accordingly
      const parsedDateFromRouteISO = (function parseIsoDateFromString(
        dateString?: string
      ) {
        if (!dateString) return null;
        const parsedDate = new Date(dateString);
        return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
      })(route.query.date as string | undefined);
      if (parsedDateFromRouteISO) selectedDate.value = parsedDateFromRouteISO;
      loadDataForDate(selectedDate.value);
    } catch (error) {
      /* noop */
    }
  },
  { immediate: true }
);

// Deep watchers to trigger auto-save
watch(
  ingresos,
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

// Computed
const totalIngresos = computed(() =>
  ingresos.reduce((s, i) => s + Number(i.amount || 0), 0)
);
const totalProviders = computed(() =>
  proveedores.reduce((s, p) => s + valueToConsider(p), 0)
);
// Total of providers that have been visited (checked)
const totalVisitedProviders = computed(() =>
  proveedores.reduce((s, p) => s + (p.visited ? valueToConsider(p) : 0), 0)
);

// Methods
function addIngreso(params: { name?: string; amount?: number } = {}) {
  const { name, amount } = params;
  const n = name ?? newIngreso.name;
  const a = amount ?? newIngreso.amount;
  if (!n) return;
  ingresos.push({
    id: Date.now() + Math.random(),
    name: n,
    amount: Number(a) || 0,
    date: selectedDate.value,
  });
  newIngreso.name = '';
  newIngreso.amount = 0;
}

function addIngresoField() {
  // Add empty income field
  ingresos.push({
    id: Date.now() + Math.random(),
    name: '',
    amount: 0,
    date: selectedDate.value,
  });
}

function updateIngresoAmount(params: { value: any; index: number }) {
  const { value, index } = params;
  ingresos[index].amount = Number(value) || 0;
}

async function removeIngreso(id: string | number) {
  const idx = ingresos.findIndex((i: any) => i.id === id);
  if (idx >= 0) {
    ingresos.splice(idx, 1);
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

async function removeProveedor(id: string | number) {
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
  const { name, estimated, dollar, notes } = params;
  const n = name ?? newProveedor.name;
  const e = estimated ?? newProveedor.estimated;
  const d = dollar ?? newProveedor.dollar;
  const nt = notes ?? newProveedor.notes;
  if (!n) return;
  // create with id and mark as new for animation
  const newItem = {
    id: Date.now() + Math.random(),
    date: selectedDate.value,
    name: n,
    estimated: Number(e) || 0,
    dollar: Number(d) || 0,
    notes: nt || '',
    visited: false,
    _justAdded: true,
  } as any;
  proveedores.push(newItem);
  // remove new-mark after animation
  setTimeout(() => (newItem._justAdded = false), 400);
  newProveedor.name = '';
  newProveedor.estimated = 0;
  newProveedor.dollar = 0;
  newProveedor.notes = '';
}

function valueToConsider(p: any) {
  const d = Number(p.dollar || 0);
  const e = Number(p.estimated || 0);
  return d > 0 ? d : e;
}

// Toggle visited flag from item click (template-friendly)
function toggleVisited(p: any) {
  p.visited = !p.visited;
}

// Add empty provider card
function addBlankProvider() {
  const newItem = {
    id: Date.now() + Math.random(),
    date: selectedDate.value,
    name: '',
    estimated: 0,
    dollar: 0,
    notes: '',
    visited: false,
    _justAdded: true,
  } as any;
  proveedores.push(newItem);
  // wait for render and focus input
  nextTick(() => {
    const el = nameInputRefs[newItem.id];
    try {
      if (hasSetFocus(el)) {
        el.setFocus();
      } else if (has$elSetFocus(el)) {
        el.$el.setFocus();
      } else if (hasFocusMethod(el)) {
        el.focus();
      }
    } catch (e) {
      /* noop */
    }
  });
  setTimeout(() => (newItem._justAdded = false), 400);
}

// Collect component data and ask controller to save it
async function onBackupClick() {
  try {
    const payload = {
      ingresos: JSON.parse(JSON.stringify(ingresos)),
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

    console.log('onBackupClick: payload summary', {
      selectedDate: payload.selectedDate,
      ingresosCount: payload.ingresos.length,
    });

    const payloadToSave = {
      component: 'BudgetView',
      data: payload,
      createdAt: Date.now(),
    };

    try {
      const id = await backupController.saveBackup(payloadToSave);
      console.log('Backup guardado id=', id);
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
      } catch (e) {
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
    // Load backups via dixieController
    const all = (await dixieController.listBackups()) as any[];
    let b: any = null;
    if (all && all.length) {
      const target = dateISO.slice(0, 10);
      const matches = all
        .filter(
          x =>
            x &&
            x.component === 'BudgetView' &&
            x.data &&
            x.data.selectedDate &&
            x.data.selectedDate.slice(0, 10) === target
        )
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (matches.length) b = matches[0];
    }

    if (b && b.data) {
      const d = b.data;
      // Replace reactive arrays; ensure stable ids for ingresos
      ingresos.splice(
        0,
        ingresos.length,
        ...(d.ingresos || []).map((i: any) => ({
          id: i.id ?? Date.now() + Math.random(),
          ...i,
        }))
      );
      proveedores.splice(0, proveedores.length, ...(d.proveedores || []));
      // Reemplazar objetos
      Object.assign(
        newIngreso,
        d.newIngreso || { name: '', amount: 0, date: dateISO }
      );
      Object.assign(
        newProveedor,
        d.newProveedor || { name: '', estimated: 0, dollar: 0, notes: '' }
      );
      console.log('Datos cargados para', dateISO, b);
    } else {
      // No backup: initialize empty data for date
      ingresos.splice(0, ingresos.length);
      proveedores.splice(0, proveedores.length);
      Object.assign(newIngreso, { name: '', amount: 0, date: dateISO });
      Object.assign(newProveedor, {
        name: '',
        estimated: 0,
        dollar: 0,
        notes: '',
      });
      console.log('No se encontró backup para', dateISO);
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
    selectedDate.value = new Date().toISOString();
  } catch (e) {
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (e) {
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
      } catch (e) {
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
          } catch (e) {
            // ignore and try next
          }
        }
      }
    }

    if (!Array.isArray(suppliersList)) {
      // Nothing we can do; bail out gracefully
      return;
    }

    // Clear existing map
    for (const k of Object.keys(suppliersProducts)) delete suppliersProducts[k];

    // Build a map of normalized supplier name -> products[] (if present)
    for (const s of suppliersList) {
      const rawName = s?.name || s?.provider || s?.supplierName || '';
      if (!rawName) continue;
      const key = normalizeName(rawName);
      if (!key) continue;
      suppliersProducts[key] = Array.isArray(s.products)
        ? s.products.slice()
        : [];
    }
  } catch (err) {
    console.error('loadSuppliersProducts error:', err);
  }
}

function hasProductsFor(p: any) {
  try {
    const key = normalizeName(p?.name || '');
    return !!(key && suppliersProducts[key] && suppliersProducts[key].length);
  } catch (e) {
    return false;
  }
}

async function openProductsPopover(params: { provider: any; event: any }) {
  const { provider, event } = params;
  try {
    // Save the event and provider id so the modal knows which provider we're editing
    popovers.products.event = event;
    popovers.products.providerId = provider?.id ?? null;
    popovers.products.title = provider?.name || '';
    // Load products for provider
    const prods = suppliersProducts[normalizeName(provider?.name || '')] || [];
    popovers.products.products = prods;

    // Initialize quantities map for the currently shown products (keep existing values if present)
    for (let idx = 0; idx < prods.length; idx++) {
      const prod = prods[idx];
      const key = prod?.id ?? idx;
      if (popovers.products.quantities[key] === undefined) {
        popovers.products.quantities[key] = 0;
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
            popovers.products.quantities[key] = Number(
              savedQuantities[key] || 0
            );
          }
        }
      }
    } catch (e) {
      /* ignore preload errors */
    }

    setTimeout(() => (popovers.products.open = true), 50);
  } catch (err) {
    console.error('openProductsPopover error:', err);
  }
}

function onProductsPopoverDidDismiss() {
  popovers.products.open = false;
  popovers.products.event = null;
  popovers.products.products = [];
  popovers.products.title = '';
}

// Modal dismiss handler (kept separate to make intent explicit and satisfy template bindings)
function onProductsModalDidDismiss() {
  popovers.products.open = false;
  popovers.products.event = null;
  popovers.products.products = [];
  popovers.products.quantities = {};
  popovers.products.title = '';
}

// Save handler for the products modal: compute total (price * quantity) and assign it to the provider's estimated value.
async function saveProductsModal() {
  try {
    const quantities = popovers.products.quantities || {};
    const prods = popovers.products.products || [];
    let totalEstimate = 0;

    // Calculate total by iterating the displayed products and using the key used for quantities
    for (let idx = 0; idx < prods.length; idx++) {
      const prod = prods[idx];
      const key = prod?.id ?? idx;
      const q = Number(quantities[key] || 0);
      const price = Number(prod?.price ?? prod?.amount ?? 0) || 0;
      if (q > 0 && price > 0) {
        totalEstimate += price * q;
      }
    }

    // Assign the computed estimate to the provider's estimated field (if providerId present)
    const pid = popovers.products.providerId;
    if (pid != null) {
      const prov = proveedores.find((p: any) => p.id === pid);
      if (prov) {
        prov.estimated = Number(totalEstimate) || 0;
        console.log(
          'saveProductsModal: set provider estimated',
          pid,
          prov.estimated
        );
      } else {
        console.warn('saveProductsModal: provider not found', pid);
      }
    } else {
      console.warn('saveProductsModal: no providerId set');
    }

    // Persist the quantities selection to the database so they can be reloaded for the same date
    try {
      // Build a clean payload to store: component to identify, data with providerId, selectedDate and quantities
      const payloadToSave = {
        component: 'BudgetProducts',
        data: {
          providerId: pid,
          selectedDate: selectedDate.value,
          quantities: JSON.parse(JSON.stringify(quantities)),
        },
        createdAt: Date.now(),
      };
      // Use dixieController with the default store (backups) to store product selections
      const id = await dixieController.addEntry(payloadToSave);
      console.log('saveProductsModal: saved products selection id=', id);
    } catch (e) {
      console.error('saveProductsModal: error saving products selection', e);
    }
  } catch (err) {
    console.error('saveProductsModal error:', err);
  } finally {
    // Close and clear modal state
    popovers.products.open = false;
    popovers.products.event = null;
    popovers.products.products = [];
    popovers.products.quantities = {};
    popovers.products.providerId = null;
    popovers.products.title = '';
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
</script>

<style scoped>
ion-card {
  margin-bottom: 16px;
  border: 1px solid transparent;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.providers-list ion-card.shadow1:active {
  border-color: var(--ion-color-primary, #3880ff);
  box-shadow: 0 6px 18px rgba(56, 128, 255, 0.06);
}

/* Mostrar borde solo mientras el puntero está encima en escritorio (puntero fino) */
@media (hover: hover) and (pointer: fine) {
  .providers-list ion-card.shadow1:hover {
    border-color: var(--ion-color-primary, #3880ff);
    box-shadow: 0 6px 18px rgba(56, 128, 255, 0.06);
  }
}

/* Mostrar borde cuando el elemento recibe foco por teclado (accesibilidad) */
.providers-list ion-card.shadow1:focus-visible {
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

.provider-title {
  font-size: 0.96rem;
  font-weight: 600;
  padding: 6px 12px;
}

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

.provider-title,
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
</style>
