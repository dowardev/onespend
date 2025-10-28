<template>
  <ion-page>
    <ion-list class="ion-padding">
      <ion-grid>
        <ion-row class="row-top-align">
          <!-- Izquierda: resumen + ingresos -->
          <ion-col size="12" size-md="4">
            <ion-list class="main">
              <ion-list-header>
                <ion-label> Presupuesto </ion-label>
              </ion-list-header>

              <div>
                <ion-card class="no-shadow">
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
                          <ion-item v-for="(inc, idx) in ingresos" :key="idx">
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
                          </ion-item>

                          <!-- <ion-item> -->
                          <!--   <ion-input -->
                          <!--     placeholder="Nombre" -->
                          <!--     :value="newIngreso.name" -->
                          <!--     @ionInput="onNewIngresoNameInput($event)" -->
                          <!--   ></ion-input> -->
                          <!---->
                          <!--   <ion-input -->
                          <!--     type="number" -->
                          <!--     placeholder="Monto" -->
                          <!--     :value="newIngreso.amount" -->
                          <!--     @ionInput="onNewIngresoAmountInput($event)" -->
                          <!--   ></ion-input> -->
                          <!---->
                          <!--   <ion-button size="small" @click="addIngreso()"> -->
                          <!--     <ion-icon :icon="addOutline"></ion-icon> -->
                          <!--   </ion-button> -->
                          <!-- </ion-item> -->

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

                <ion-card class="no-shadow">
                  <ion-card-header>
                    <ion-card-title>Resumen</ion-card-title>
                  </ion-card-header>

                  <ion-card-content>
                    <ion-item>
                      <ion-label>Presupuesto después de(estimacion)</ion-label>
                      <ion-note slot="end">{{
                        formatCurrency({ v: totalIngresos - totalProviders })
                      }}</ion-note>
                    </ion-item>

                    <ion-item>
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
          <ion-col size="12" size-md="8">
            <ion-list class="providers-list main">
              <ion-list-header>
                <ion-label
                  >Proveedores ({{
                    formatCurrency({ v: totalProviders })
                  }})</ion-label
                >
              </ion-list-header>

              <div class="providers-list-body">
                <ion-grid>
                  <ion-row>
                    <ion-col
                      v-for="p in proveedores"
                      :key="p.id"
                      :class="{ 'provider-just-added': p._justAdded }"
                      size="12"
                      size-md="6"
                    >
                      <ion-card
                        class="no-shadow"
                        style="
                          box-shadow:
                            rgba(27, 31, 35, 0.04) 0px 1px 0px,
                            rgba(255, 255, 255, 0.25) 0px 1px 0px inset;
                        "
                      >
                        <ion-card-header>
                          <template v-if="p.name">
                            <ion-card-title>{{ p.name }}</ion-card-title>
                          </template>
                          <template v-else>
                            <ion-item lines="none">
                              <ion-input
                                :ref="(el) => (nameInputRefs[p.id] = el)"
                                v-model="p.name"
                                placeholder="Nombre proveedor"
                              ></ion-input>
                            </ion-item>
                          </template>
                        </ion-card-header>

                        <ion-card-content>
                          <ion-item>
                            <ion-label>Estimado</ion-label>

                            <ion-input
                              slot="end"
                              type="number"
                              v-model.number="p.estimated"
                              class="num-input"
                            ></ion-input>
                          </ion-item>

                          <ion-item>
                            <ion-label>$</ion-label>

                            <ion-input
                              slot="end"
                              type="number"
                              v-model.number="p.dollar"
                              class="num-input"
                            ></ion-input>
                          </ion-item>

                          <ion-item>
                            <ion-label>Valor a considerar</ion-label>

                            <ion-input
                              slot="end"
                              :value="valueToConsider(p)"
                              readonly
                              class="num-input"
                            ></ion-input>
                          </ion-item>

                          <ion-item>
                            <ion-label>Notas</ion-label>

                            <ion-textarea
                              v-model="p.notes"
                              slot="end"
                            ></ion-textarea>
                          </ion-item>

                          <ion-item lines="none">
                            <ion-checkbox
                              slot="start"
                              v-model="p.visited"
                            ></ion-checkbox>
                            <ion-label>Visita</ion-label>
                          </ion-item>
                        </ion-card-content>
                      </ion-card>
                    </ion-col>

                    <!-- Card vacía para agregar un nuevo proveedor (botón + centrado) -->
                    <ion-col size="12" size-md="6">
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
    </ion-list>
  </ion-page>
</template>

<script setup lang="ts">
// imports
import {
  IonPage,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonInput,
  IonCheckbox,
  IonButton,
} from "@ionic/vue";
import { reactive, computed, nextTick } from "vue";
import { addOutline } from "ionicons/icons";

// vars
const ingresos = reactive([
  { name: "Inicio", amount: 0 },
  { name: "Corte", amount: 0 },
  { name: "Jesus", amount: 0 },
]);
const newIngreso = reactive({ name: "", amount: 0 });
// Inicializar proveedores con un id único para permitir animaciones en inserción/eliminación
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
    estimated: 0,
    dollar: 0,
    notes: "",
    visited: false,
    _justAdded: false,
  })),
);
const newProveedor = reactive({ name: "", estimated: 0, dollar: 0, notes: "" });
// refs a los inputs de nombre (indexados por id de proveedor) para poder hacer setFocus
const nameInputRefs = reactive({} as Record<string | number, any>);
// end vars

// computed
const totalIngresos = computed(() =>
  ingresos.reduce((s, i) => s + Number(i.amount || 0), 0),
);
const totalProviders = computed(() =>
  proveedores.reduce((s, p) => s + valueToConsider(p), 0),
);
// Total of providers that have been visited (checked)
const totalVisitedProviders = computed(() =>
  proveedores.reduce((s, p) => s + (p.visited ? valueToConsider(p) : 0), 0),
);
// end computed

// functions
function addIngreso(params: { name?: string; amount?: number } = {}) {
  const { name, amount } = params;
  const n = name ?? newIngreso.name;
  const a = amount ?? newIngreso.amount;
  if (!n) return;
  ingresos.push({ name: n, amount: Number(a) || 0 });
  newIngreso.name = "";
  newIngreso.amount = 0;
}

function addIngresoField() {
  // Adds a new empty income field to the ingresos array so the user can enter a new ingreso inline
  ingresos.push({ name: "", amount: 0 });
}

function updateIngresoAmount(params: { value: any; idx: number }) {
  const { value, idx } = params;
  ingresos[idx].amount = Number(value) || 0;
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
function onIngresoIonInput(e: any, idx: number) {
  updateIngresoAmount({ value: e?.detail?.value, idx });
}

function onNewIngresoNameInput(e: any) {
  updateNewIngreso({ name: e?.detail?.value || "" });
}

function onNewIngresoAmountInput(e: any) {
  updateNewIngreso({ amount: Number(e?.detail?.value) || 0 });
}

function addProveedor(
  params: {
    name?: string;
    estimated?: number;
    dollar?: number;
    notes?: string;
  } = {},
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

// Añade una card vacía (rápida) al final para poder editar/agregar un proveedor
function addBlankProvider() {
  const newItem = {
    id: Date.now() + Math.random(),
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
</script>

<style scoped>
ion-card {
  margin-bottom: 16px;
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
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #111;
  cursor: pointer;
  background: #fff;
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
  font-size: 72px;
  color: #ffec3b; /* amarillo */
  line-height: 1;
  user-select: none;
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
</style>
