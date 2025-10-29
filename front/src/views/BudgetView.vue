<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Presupuesto</ion-title>

        <ion-buttons slot="end">
          <ion-button
            @click="openDatePopover({ e: $event })"
            title="Seleccionar fecha"
          >
            <ion-icon :icon="calendarOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row>
          <!-- Izquierda: resumen + ingresos -->
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
                              placeholder="Nombre"
                              v-model="inc.name"
                            ></ion-input>

                            <ion-input
                              type="number"
                              slot="end"
                              v-model.number="inc.amount"
                              class="num-input"
                            ></ion-input>

                            <ion-button
                              slot="end"
                              fill="clear"
                              size="small"
                              @click="removeIngreso(inc.id)"
                              title="Eliminar ingreso"
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

          <!-- Derecha: proveedores + inesperados -->
          <ion-col size="12" size-md="7" size-lg="8">
            <ion-list class="providers-list main">
              <ion-list-header>
                <ion-label
                  >Proveedores ({{
                    formatCurrency({ v: totalProviders })
                  }})</ion-label
                >
              </ion-list-header>

              <div class="providers-list-body" ref="providersBodyRef">
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
                              :ref="(el) => (nameInputRefs[p.id] = el)"
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
                                fill="clear"
                                size="small"
                                @click.stop="removeProveedor(p.id)"
                                title="Eliminar proveedor"
                                class="icon-btn"
                              >
                                <ion-icon :icon="trashOutline"></ion-icon>
                              </ion-button>
                            </div>
                          </div>

                          <div class="provider-row-fields">
                            <ion-input
                              label="Estimado"
                              label-placement="floating"
                              type="number"
                              v-model.number="p.estimated"
                              class="num-input small"
                            ></ion-input>

                            <ion-input
                              label="$"
                              label-placement="floating"
                              type="number"
                              v-model.number="p.dollar"
                              class="num-input small"
                            ></ion-input>
                          </div>

                          <div class="provider-notes" v-if="p.notes">
                            <small class="notes-text">{{ p.notes }}</small>
                          </div>
                        </ion-card-content>
                      </ion-card>
                    </ion-col>

                    <!-- Card vacía para agregar un nuevo proveedor (botón + centrado) -->
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
        @didDismiss="onPopoverDidDismiss"
      >
        <ion-content>
          <ion-datetime
            v-model="selectedDate"
            presentation="date"
            display-format="DD/MM/YYYY"
            picker-format="DD/MM/YYYY"
            style="margin-left: 12px"
          ></ion-datetime>
        </ion-content>
      </ion-popover>
      <!-- end popover -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// imports
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
} from "@ionic/vue";
import {
  reactive,
  computed,
  nextTick,
  ref,
  onMounted,
  onUnmounted,
  watch,
} from "vue";
import { addOutline, calendarOutline, trashOutline } from "ionicons/icons";

// controllers
import {
  backupBudgetViewData,
  getLatestBackupForDate,
} from "../controllers/backupController";
// end controllers

// vars
const ingresos = reactive([
  {
    id: Date.now() + Math.random(),
    name: "Inicio",
    amount: 0,
    date: new Date().toISOString(),
  },
  {
    id: Date.now() + Math.random(),
    name: "Corte",
    amount: 0,
    date: new Date().toISOString(),
  },
  {
    id: Date.now() + Math.random(),
    name: "Jesus",
    amount: 0,
    date: new Date().toISOString(),
  },
]);
const newIngreso = reactive({
  name: "",
  amount: 0,
  date: new Date().toISOString(),
});
const proveedores = reactive(
  [
    "Agua",
    "Bolsas",
    "Chicharron",
    "Gamesa",
    "Lala",
    "Queso",
    "Semillas",
    "Soñador",
    "Tm20",
    "Tm24",
    "Zaragoza",
  ].map((n) => ({
    id: Date.now() + Math.random(),
    name: n,
    date: new Date().toISOString(),
    estimated: 0,
    dollar: 0,
    notes: "",
    visited: false,
    _justAdded: false,
  }))
);
const newProveedor = reactive({ name: "", estimated: 0, dollar: 0, notes: "" });
const nameInputRefs = reactive({} as Record<string | number, any>);
const STORAGE_KEY = "budget:selectedDate";
const selectedDate = ref(new Date().toISOString());
const popovers = reactive({
  date: { open: false, event: null as any },
});
const providersBodyRef = ref<HTMLElement | null>(null);

// end vars

// life
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    selectedDate.value = saved;
  }
  // cargar datos para la fecha actual/seleccionada
  loadDataForDate(selectedDate.value);
  // Referencias a funciones/variables que pueden parecer no usadas para evitar errores de lint/TS
  // (se usan en la plantilla o en handlers dinámicos en runtime)
  void addIngreso;
  void onIngresoIonInput;
  void onNewIngresoNameInput;
  void onNewIngresoAmountInput;
  void addProveedor;
});
// end life

// watch
watch(
  selectedDate,
  (v) => {
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch (e) {
      /* noop */
    }
    loadDataForDate(v);
  },
  { immediate: false }
);
// watch

// computed
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
// end computed

// functions
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
  newIngreso.name = "";
  newIngreso.amount = 0;
}

function addIngresoField() {
  // Adds a new empty income field to the ingresos array so the user can enter a new ingreso inline
  ingresos.push({
    id: Date.now() + Math.random(),
    name: "",
    amount: 0,
    date: selectedDate.value,
  });
}

function updateIngresoAmount(params: { value: any; idx: number }) {
  const { value, idx } = params;
  ingresos[idx].amount = Number(value) || 0;
}

async function removeIngreso(id: string | number) {
  const idx = ingresos.findIndex((i: any) => i.id === id);
  if (idx >= 0) {
    ingresos.splice(idx, 1);
    // esperar a que Vue actualice el DOM/reactividad; el auto-guardado lo maneja el watcher debounced
    try {
      await nextTick();
      console.log(
        "removeIngreso: ingreso eliminado, auto-guardado por watcher",
        id
      );
    } catch (e) {
      console.error(
        "removeIngreso: error en nextTick después de eliminar ingreso",
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
        "removeProveedor: proveedor eliminado, auto-guardado por watcher",
        id
      );
    } catch (e) {
      console.error(
        "removeProveedor: error en nextTick después de eliminar proveedor",
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
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(v || 0);
}

// template-friendly wrappers (avoid implicit any in template lambdas)
function onIngresoIonInput(params: { e: any; idx: number }) {
  const { e, idx } = params;
  updateIngresoAmount({ value: e?.detail?.value, idx });
}

function onNewIngresoNameInput(params: { e: any }) {
  const { e } = params;
  updateNewIngreso({ name: e?.detail?.value || "" });
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
  // crear con id y marcar como recién agregado para animación
  const newItem = {
    id: Date.now() + Math.random(),
    date: selectedDate.value,
    name: n,
    estimated: Number(e) || 0,
    dollar: Number(d) || 0,
    notes: nt || "",
    visited: false,
    _justAdded: true,
  } as any;
  proveedores.push(newItem);
  // quitar la marca después de la animación
  setTimeout(() => (newItem._justAdded = false), 400);
  newProveedor.name = "";
  newProveedor.estimated = 0;
  newProveedor.dollar = 0;
  newProveedor.notes = "";
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

// Añade una card vacía (rápida) al final para poder editar/agregar un proveedor
function addBlankProvider() {
  const newItem = {
    id: Date.now() + Math.random(),
    date: selectedDate.value,
    name: "",
    estimated: 0,
    dollar: 0,
    notes: "",
    visited: false,
    _justAdded: true,
  } as any;
  proveedores.push(newItem);
  // esperar a que Vue renderice el input, luego enfocarlo
  nextTick(() => {
    const el = nameInputRefs[newItem.id];
    try {
      if (el && typeof el.setFocus === "function") {
        el.setFocus();
      } else if (el && el.$el && typeof el.$el.setFocus === "function") {
        el.$el.setFocus();
      } else if (el && typeof el.focus === "function") {
        el.focus();
      }
    } catch (e) {
      /* noop */
    }
  });
  setTimeout(() => (newItem._justAdded = false), 400);
}

// Recolecta los datos relevantes del componente y pide al controller que los guarde en dixie
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

    console.log("onBackupClick: payload summary", {
      selectedDate: payload.selectedDate,
      ingresosCount: payload.ingresos.length,
    });

    const res = await backupBudgetViewData(payload);
    console.log("Backup guardado:", res);
  } catch (err) {
    console.error("Error al guardar backup:", err);
  }
}

// (debugListBackups removed)

// --- Auto-save debounced ---
// Debounce simple para evitar escrituras excesivas al storage/controller
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
    console.error("autoSave error:", e);
  }
}, 800);

// Watchers deep que disparan el auto-guardado al cambiar datos importantes
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

async function loadDataForDate(dateISO: string) {
  try {
    const b = await getLatestBackupForDate(dateISO);
    if (b && b.data) {
      const d = b.data;
      // Reemplazar arrays reactivos; asegurar ids estables en ingresos
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
        d.newIngreso || { name: "", amount: 0, date: dateISO }
      );
      Object.assign(
        newProveedor,
        d.newProveedor || { name: "", estimated: 0, dollar: 0, notes: "" }
      );
      console.log("Datos cargados para", dateISO, b);
    } else {
      // No hay backup para esa fecha: inicializar vacío pero con fecha
      ingresos.splice(0, ingresos.length);
      proveedores.splice(0, proveedores.length);
      Object.assign(newIngreso, { name: "", amount: 0, date: dateISO });
      Object.assign(newProveedor, {
        name: "",
        estimated: 0,
        dollar: 0,
        notes: "",
      });
      console.log("No se encontró backup para", dateISO);
    }
  } catch (err) {
    console.error("Error cargando datos para fecha", dateISO, err);
  }
}

function openDatePopover(params: { e: any }) {
  const { e } = params;
  // assign event first, then open after small delay to avoid timing issues with dismiss animation
  console.log("openDatePopover: event=", e);
  popovers.date.event = e;
  setTimeout(() => {
    popovers.date.open = true;
    console.log("openDatePopover: popover opened, event=", popovers.date.event);
  }, 50);
}

function onPopoverDidDismiss() {
  console.log("onPopoverDidDismiss");
  popovers.date.open = false;
  popovers.date.event = null;
}

// --- Mobile tap handlers: add temporary class 'touch-active' on pointerdown so
// cards show the primary border when tapped on touch devices. The class is
// removed on pointerup / pointercancel. We keep a short delay removal so the
// visual feedback is noticeable.
function handlePointerDown(e: PointerEvent | TouchEvent) {
  try {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const card = target.closest("ion-card.shadow1") as HTMLElement | null;
    if (card) {
      card.classList.add("touch-active");
    }
  } catch (err) {
    /* noop */
  }
}

function handlePointerUp(e: PointerEvent | TouchEvent) {
  try {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const card = target.closest("ion-card.shadow1") as HTMLElement | null;
    if (card) {
      // remove after a short delay so the user sees the feedback
      setTimeout(() => card.classList.remove("touch-active"), 250);
    }
  } catch (err) {
    /* noop */
  }
}

onMounted(() => {
  const el = providersBodyRef.value as HTMLElement | null;
  if (el && typeof el.addEventListener === "function") {
    el.addEventListener("pointerdown", handlePointerDown, { passive: true });
    el.addEventListener("pointerup", handlePointerUp);
    el.addEventListener("pointercancel", handlePointerUp);
  }
});

onUnmounted(() => {
  const el = providersBodyRef.value as HTMLElement | null;
  if (el && typeof el.removeEventListener === "function") {
    el.removeEventListener("pointerdown", handlePointerDown as any);
    el.removeEventListener("pointerup", handlePointerUp as any);
    el.removeEventListener("pointercancel", handlePointerUp as any);
  }
});
</script>

<style scoped>
ion-card {
  margin-bottom: 16px;
  border: 1px solid transparent;
  transition: border-color 160ms ease, box-shadow 160ms ease;
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
