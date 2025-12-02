<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>

        <ion-title>Presupuesto</ion-title>

        <ion-buttons slot="end">
          <ion-button
            title="Retroceder un día"
            @click="changeDate({ days: -1 })"
          >
            <ion-icon :icon="chevronBackOutline"></ion-icon>
          </ion-button>

          <ion-button title="Avanzar un día" @click="changeDate(1)">
            <ion-icon :icon="chevronForwardOutline"></ion-icon>
          </ion-button>

          <ion-button
            title="Seleccionar fecha"
            @click="openDatePopover({ event: $event })"
          >
            {{ formattedSelectedDate }}
          </ion-button>

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

    <ion-content>
      <ion-card class="shadow1 main-card-content">
        <ion-grid style="height: 100%">
          <ion-row style="height: 100%">
            <ion-col size="12" size-md="7" size-lg="4" style="height: 100%">
              <ion-grid style="height: 100%">
                <ion-row style="height: 100%">
                  <ion-col size="12" style="max-height: 50%">
                    <ion-list
                      style="height: 100%; max-height: 100%"
                      class="transparent"
                    >
                      <ion-list-header>
                        <ion-label
                          >Ingresos ({{
                            formatCurrency({ v: totalIngresos })
                          }})</ion-label
                        >

                        <ion-button @click="addIngresoField()">
                          <ion-icon :icon="addOutline"></ion-icon>
                        </ion-button>
                      </ion-list-header>

                      <div
                        class="list-content"
                        style="height: calc(100% - 64px); overflow: auto"
                      >
                        <template v-if="ingresos.length > 0">
                          <ion-item v-for="inc in ingresos" :key="inc.id">
                            <ion-input
                              v-model="inc.name"
                              placeholder="Nombre"
                            ></ion-input>

                            <ion-input
                              v-model.number="inc.amount"
                              type="number"
                              class="num-input"
                            ></ion-input>

                            <!-- type mony -->
                            <ion-select
                              v-model="inc.paymentType"
                              aria-label="Tipo de pago"
                              interface="popover"
                            >
                              <ion-select-option value="cash"
                                >Efectivo</ion-select-option
                              >
                              <ion-select-option value="digital"
                                >Digital</ion-select-option
                              >
                            </ion-select>

                            <!-- button delete money -->
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
                        </template>

                        <template v-else>
                          <ion-item>
                            <ion-label
                              >Pulsa el botón «+» para agregar un nuevo
                              ingreso</ion-label
                            >
                          </ion-item>
                        </template>
                      </div>
                    </ion-list>
                  </ion-col>

                  <ion-col size="12" style="height: 100%">
                    <ion-list class="transparent">
                      <ion-list-header>
                        <ion-label>Resumen</ion-label>
                      </ion-list-header>

                      <div class="list-content">
                        <ion-accordion-group>
                          <ion-accordion value="first">
                            <ion-item slot="header">
                              <ion-label>Se requiere</ion-label>

                              <ion-note slot="end">
                                <div style="display: flex">
                                  <div>
                                    {{
                                      formatCurrency({
                                        v: totalEstimacionEfectivoTarjeta,
                                      })
                                    }}
                                  </div>

                                  <div
                                    v-if="faltante < 0"
                                    style="color: var(--ion-color-danger)"
                                  >
                                    ({{ formatCurrency({ v: faltante }) }})
                                  </div>
                                </div>
                              </ion-note>
                            </ion-item>

                            <div slot="content">
                              <!-- cash -->
                              <ion-item>
                                <ion-label>Efectivo:</ion-label>
                                <ion-note slot="end">
                                  <div style="display: flex">
                                    <div>
                                      {{
                                        formatCurrency({
                                          v: totalEstimacionEfectivo,
                                        })
                                      }}
                                    </div>

                                    <div
                                      v-if="faltanteEfectivo < 0"
                                      style="color: var(--ion-color-danger)"
                                    >
                                      ({{
                                        formatCurrency({ v: faltanteEfectivo })
                                      }})
                                    </div>
                                  </div>
                                </ion-note>
                              </ion-item>

                              <!-- card -->
                              <ion-item>
                                <ion-label>Digital:</ion-label>
                                <ion-note slot="end">
                                  <div style="display: flex">
                                    <div>
                                      {{
                                        formatCurrency({
                                          v: totalEstimacionDigital,
                                        })
                                      }}
                                    </div>

                                    <div
                                      v-if="faltanteDigital < 0"
                                      style="color: var(--ion-color-danger)"
                                    >
                                      ({{
                                        formatCurrency({ v: faltanteDigital })
                                      }})
                                    </div>
                                  </div>
                                </ion-note>
                              </ion-item>
                            </div>
                          </ion-accordion>

                          <ion-accordion value="second">
                            <ion-item slot="header" color="light">
                              <ion-label> Contamos con </ion-label>
                              <ion-note slot="end">{{
                                formatCurrency({
                                  v: nonNegative(
                                    totalIngresos - totalVisitedProviders
                                  ),
                                })
                              }}</ion-note>
                            </ion-item>

                            <div slot="content" class="ion-padding">
                              <!-- cash -->
                              <ion-item>
                                <ion-label>Efectivo:</ion-label>
                                <ion-label slot="end">{{
                                  formatCurrency({
                                    v: nonNegative(
                                      totalIngresosEfectivo -
                                        totalVisitedEfectivo
                                    ),
                                  })
                                }}</ion-label>
                              </ion-item>

                              <!-- digital -->
                              <ion-item>
                                <ion-label>Digital:</ion-label>
                                <ion-label slot="end">{{
                                  formatCurrency({
                                    v: nonNegative(
                                      totalIngresosDigital - totalVisitedTarjeta
                                    ),
                                  })
                                }}</ion-label>
                              </ion-item>
                            </div>
                          </ion-accordion>
                        </ion-accordion-group>
                      </div>
                    </ion-list>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-col>

            <!-- Right: providers + unexpected -->
            <ion-col size="12" size-md="7" size-lg="8" style="height: 100%">
              <ion-grid style="height: 100%">
                <ion-row
                  style="
                    display: flex;
                    justify-content: space-evenly;
                    height: 100%;
                  "
                >
                  <ion-col size-lg="5" style="height: 100%">
                    <ion-list class="transparent" style="height: 100%">
                      <ion-list-header>
                        <ion-label>No asistio</ion-label>

                        <!-- Add provider card restored inside 'No asistio' column -->
                        <ion-button @click="addBlankProvider()">
                          <ion-icon :icon="addOutline"></ion-icon>
                        </ion-button>
                      </ion-list-header>

                      <div
                        ref="notVisitedList"
                        class="list-content"
                        style="height: calc(100% - 73px); overflow: auto"
                      >
                        <ProviderCardComponent
                          v-for="p in notVisitedProviders"
                          :key="p.id"
                          :provider="p"
                          :name-input-refs="nameInputRefs"
                          :has-products-for="hasProductsFor"
                          :is-payment-primary="isPaymentPrimary"
                          :value-to-consider="valueToConsider"
                          :format-currency="formatCurrency"
                          @visited-changed="onVisitedChanged"
                          @start-editing="startEditing"
                          @stop-editing="stopEditing"
                          @open-products-popover="openProductsPopover"
                          @open-notes-modal="openNotesModal"
                          @confirm-remove-proveedor="confirmRemoveProveedor"
                          @update-provider="handleUpdateProvider"
                          @register-name-input="handleRegisterNameInput"
                        />
                      </div>
                    </ion-list>
                  </ion-col>

                  <ion-col size-lg="5" style="height: 100%">
                    <ion-list class="transparent" style="height: 100%">
                      <ion-list-header>
                        <ion-label>Asistio</ion-label>

                        <!-- Add provider card restored inside 'Asistio' column -->
                        <ion-button @click="addBlankProviderVisited()">
                          <ion-icon :icon="addOutline"></ion-icon>
                        </ion-button>
                      </ion-list-header>

                      <div
                        ref="visitedList"
                        class="list-content"
                        style="height: calc(100% - 73px); overflow: auto"
                      >
                        <ProviderCardComponent
                          v-for="p in visitedProviders"
                          :key="p.id"
                          :provider="p"
                          :name-input-refs="nameInputRefs"
                          :has-products-for="hasProductsFor"
                          :is-payment-primary="isPaymentPrimary"
                          :value-to-consider="valueToConsider"
                          :format-currency="formatCurrency"
                          @visited-changed="onVisitedChanged"
                          @start-editing="startEditing"
                          @stop-editing="stopEditing"
                          @open-products-popover="openProductsPopover"
                          @open-notes-modal="openNotesModal"
                          @confirm-remove-proveedor="confirmRemoveProveedor"
                          @update-provider="handleUpdateProvider"
                          @register-name-input="handleRegisterNameInput"
                        />
                      </div>
                    </ion-list>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card>

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

      <!-- popover more options -->
      <ion-popover
        :is-open="popovers.moreOptions.open"
        :event="popovers.moreOptions.event"
        :keep-contents-mounted="true"
        :dismiss-on-select="true"
        @did-dismiss="popovers.moreOptions.open = false"
      >
        <ion-content>
          <!-- Button to open Templates modal -->
          <ion-item button @click="openTemplatesModal()">
            <ion-label>Aplicar template</ion-label>
          </ion-item>
        </ion-content>
      </ion-popover>
      <!-- end popover -->

      <!-- alerts -->
      <!-- confirmation alert -->
      <ion-alert
        :is-open="deleteConfirm.open"
        header="Confirmar eliminación"
        :message="`¿Eliminar proveedor «${deleteConfirm.providerName}»? Esta acción no se puede deshacer.`"
        :buttons="getAlertButtons()"
        @did-dismiss="onDeleteAlertDidDismiss"
      ></ion-alert>
      <!-- end confirmation alert -->

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
      <!-- end alerts -->

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

      <!-- templates modal -->
      <ion-modal
        v-model:is-open="showTemplatesModal"
        :keep-contents-mounted="true"
        @did-dismiss="onTemplatesModalDidDismiss"
      >
        <ion-header class="ion-no-border" mode="ios">
          <ion-toolbar>
            <ion-buttons>
              <ion-button @click="onTemplatesModalDidDismiss()">
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-button>
            </ion-buttons>

            <ion-title>Aplicar template</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-card class="shadow1">
            <ion-list class="transparent">
              <div v-if="templatesModalList.length">
                <ion-item
                  v-for="tmpl in templatesModalList"
                  :key="String(tmpl.id || tmpl.name)"
                  lines="full"
                  button
                  class="transparent"
                  @click.stop="applyTemplateFromModal(tmpl)"
                >
                  <ion-label>
                    <h2>{{ tmpl.name }}</h2>
                    <p>{{ tmpl.description }}</p>
                  </ion-label>
                </ion-item>
              </div>

              <template v-else>
                <ion-item>
                  <ion-label>No hay templates</ion-label>
                </ion-item>
              </template>
            </ion-list>
          </ion-card>
        </ion-content>
      </ion-modal>
      <!-- end modal -->

      <!-- toasts -->
      <ion-toast
        :is-open="toast.open"
        :message="toast.message"
        :duration="toast.duration"
        @did-dismiss="() => (toast.open = false)"
      ></ion-toast>
      <!-- end toasts -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import {
  IonAccordion,
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
  IonAccordionGroup,
  IonToast,
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
} from 'ionicons/icons';
import { useRoute } from 'vue-router';
import { format, parseISO } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';

// interface
type Income = {
  id: string | number;
  name: string;
  amount: number;
  date: string;
  paymentType: 'cash' | 'digital';
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
import backupController from '@/controllers/backupController';
import suppliersController from '@/controllers/suppliersController';
import systemController from '@/controllers/systemConfigController';
import TemplateController from '@/controllers/TempalteController';
// end controllers

// components
import ProductsModalComponent from './modals/PoductsModalComponent.vue';
import ProviderCardComponent from './ProviderCardComponent.vue';
// end components

// vars
const ingresos = reactive([]) as Income[];
const newIngreso = reactive({
  name: '',
  amount: 0,
  date: new Date().toISOString(),
  paymentType: 'cash',
});
const proveedores = reactive([]) as Provider[];
const newProveedor = reactive({ name: '', estimated: 0, dollar: 0, notes: '' });
const nameInputRefs = reactive(
  {} as Record<string | number, FocusableRef | null>
);
const STORAGE_KEY = 'budget:selectedDate';
const selectedDate = ref(new Date().toISOString());
const route = useRoute();
const popovers = reactive({
  date: { open: false, event: null as unknown },
  inforSuppliers: { open: false, event: null as unknown },
  moreOptions: { open: false, event: null as unknown },
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
});

// State used to ask for confirmation before removing a provider
const deleteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '' as string,
});

const providersBodyRef = ref<HTMLElement | null>(null);

// Refs to the two scrollable lists so we can programmatically scroll them
const notVisitedList = ref<HTMLElement | null>(null);
const visitedList = ref<HTMLElement | null>(null);

// Map of supplier name -> products loaded from suppliers DB
const suppliersProducts = reactive({} as Record<string, any[]>);
// Map of normalized supplier name -> original supplier name (from suppliers DB)
const suppliersNames = reactive({} as Record<string, string>);
// --- Templates modal state & handlers ---
const templatesModalList = reactive([] as any[]);
const showTemplatesModal = ref(false);
const showApplyConflictModal = ref(false);
const applyConflictMessage = ref('');
const pendingApplyPayload = ref<any | null>(null);

// Overwrite confirmation alert state used instead of window.confirm
const overwriteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '',
  total: 0,
  // internal resolver used to fulfill the awaiting Promise when the user acts
  _resolve: null as null | ((val: boolean) => void),
});

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
// Toast state used to inform the user when an action is prevented (e.g. editing a provider from a template)
const toast = reactive({ open: false, message: '', duration: 2500 });
// end vars

// life
onMounted(async () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    selectedDate.value = saved;
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
    } catch (_e) {
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
// end watch

// Computed
const totalIngresos = computed(() =>
  ingresos.reduce((s, i) => s + Number(i.amount || 0), 0)
);

// Totales de ingresos por método de pago (efectivo / digital)
const totalIngresosEfectivo = computed(() =>
  ingresos.reduce(
    (s, i) => s + (i.paymentType === 'cash' ? Number(i.amount || 0) : 0),
    0
  )
);
const totalIngresosDigital = computed(() =>
  ingresos.reduce(
    (s, i) => s + (i.paymentType === 'digital' ? Number(i.amount || 0) : 0),
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
const visitedProviders = computed(() =>
  proveedores.filter((p: any) => !!p.visited)
);
const notVisitedProviders = computed(() =>
  proveedores.filter((p: any) => !p.visited)
);

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
      d = parseISO(String(v));
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
    paymentType: (newIngreso.paymentType === 'digital' ? 'digital' : 'cash') as
      | 'cash'
      | 'digital',
  });
  newIngreso.name = '';
  newIngreso.amount = 0;
  newIngreso.paymentType = 'cash';
}

function addIngresoField() {
  // Add empty income field
  ingresos.push({
    id: Date.now() + Math.random(),
    name: '',
    amount: 0,
    date: selectedDate.value,
    // default payment type for new empty field
    paymentType: 'cash',
  } as Income);
}

function updateIngresoAmount(params: { value: any; index: number }) {
  const { value, index } = params;
  ingresos[index].amount = Number(value) || 0;
}

async function removeIngreso(params: { id: string | number } | any) {
  const id = params && params.id !== undefined ? params.id : params;
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

    if (provider) {
      provider.visited = checked;
      console.log('onVisitedChanged', {
        id: provider?.id,
        name: provider?.name,
        visited: provider?.visited,
      });
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
    const prov = proveedores.find((x: any) => x.id === id);
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
      } else {
        // ensure name is a string
        const newName = String(value ?? '') as any;
        prov[f] = newName;

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
  const newItem = {
    id: Date.now() + Math.random(),
    date: selectedDate.value,
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
  const newItem = {
    id: Date.now() + Math.random(),
    date: selectedDate.value,
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
      const id = await backupController.saveBackup({ entry: payloadToSave });
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
          // Ensure paymentType exists for backwards compatibility — normalize to 'cash'|'digital'
          paymentType: i.paymentType === 'digital' ? 'digital' : 'cash',
          ...i,
        }))
      );

      // Normalize providers loaded from backup to ensure editor state fields exist
      const normalizedProviders = (d.proveedores || []).map((p: any) => {
        const key = normalizeName(p.name ?? '');
        return {
          id: p.id ?? Date.now() + Math.random(),
          name: p.name ?? '',
          date: p.date ?? dateISO,
          estimated: Number(p.estimated || 0),
          dollar: Number(p.dollar || 0),
          // Persist original DB name to use as placeholder in the child component
          _dbName: p._dbName ?? p.name ?? '',
          // Restore payment fields so values persist after reload
          efectivo: Number(p.efectivo || 0),
          tarjeta: Number(p.tarjeta || 0),
          credito: Number(p.credito || 0),
          notes: p.notes || '',
          visited: !!p.visited,
          _fromTemplate: !!p._fromTemplate,
          _justAdded: !!p._justAdded,
          // persist supplier key so product association survives name edits
          _supplierKey: key || undefined,
          // Always clear editing state when loading from storage
          _editing: false,
        };
      });
      proveedores.splice(0, proveedores.length, ...normalizedProviders);
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

    // Parse current selectedDate; fallback to now if invalid
    let current = new Date(String(selectedDate.value));
    if (isNaN(current.getTime())) current = new Date();
    // Advance or retreat by the requested number of days
    current.setDate(current.getDate() + Number(days || 0));
    selectedDate.value = current.toISOString();
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
    const key =
      p && p._supplierKey
        ? String(p._supplierKey)
        : normalizeName(p?.name || '');
    return !!(key && suppliersProducts[key] && suppliersProducts[key].length);
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

// Save handler for the products modal: compute total (price * quantity) and assign it to the provider's estimated value.
async function saveProductsModal() {
  try {
    const quantities = modals.products.quantities || {};
    const prods = modals.products.products || [];
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

    // Assign the computed total (price * quantity) to the provider's efectivo field (if providerId present)
    const pid = modals.products.providerId;
    if (pid != null) {
      const prov = proveedores.find((p: any) => p.id === pid);
      if (prov) {
        // When either efectivo OR tarjeta is empty (0 or falsy) store directly.
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
          } else {
            // At least one field already has a value -> ask user whether to overwrite
            let overwrite = false;
            try {
              // Use the ionic alert promise helper instead of window.confirm
              overwrite = await askOverwriteConfirm({
                providerId: pid,
                providerName: prov.name || '',
                total: Number(totalEstimate) || 0,
              });
            } catch (_e) {
              // In non-window environments or on error, default to not overwriting
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
          }
        } catch (_e) {
          // Fallback: assign computed value
          prov.efectivo = Number(totalEstimate) || 0;
        }
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
      const id = await dixieController.addEntry({ entry: payloadToSave });
      console.log('saveProductsModal: saved products selection id=', id);
    } catch (e) {
      console.error('saveProductsModal: error saving products selection', e);
    }
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
        savedId = await dixieController.putEntry(payloadToSave);
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

async function loadTemplatesForModal() {
  try {
    // prefer TemplateController.listTemplates if available
    if (typeof (TemplateController as any).listTemplates === 'function') {
      const list = await (TemplateController as any).listTemplates();
      templatesModalList.splice(0, templatesModalList.length, ...(list || []));
    } else if (typeof (TemplateController as any).list === 'function') {
      const list = await (TemplateController as any).list();
      templatesModalList.splice(0, templatesModalList.length, ...(list || []));
    } else {
      templatesModalList.splice(0, templatesModalList.length);
    }
  } catch (e) {
    console.error('loadTemplatesForModal error', e);
    templatesModalList.splice(0, templatesModalList.length);
  }
}

function openTemplatesModal() {
  try {
    loadTemplatesForModal();
    setTimeout(() => (showTemplatesModal.value = true), 50);
  } catch (e) {
    console.error('openTemplatesModal error', e);
  }
}

function onTemplatesModalDidDismiss() {
  try {
    showTemplatesModal.value = false;
  } catch (_e) {
    /* noop */
  }
}

async function applyTemplateFromModal(tmpl: any) {
  try {
    if (!tmpl) return;
    // Build payload similar to TemplatesView.confirmApply
    // Use the currently selected date from the Budget view
    const dateISO = selectedDate.value;

    let providerNames: string[] = [];

    // Try to load suppliers from suppliersController instead of relying on a local "suppliers" variable
    let suppliersList: any[] = [];
    try {
      const res =
        typeof (suppliersController as any).listSuppliers === 'function'
          ? await (suppliersController as any).listSuppliers()
          : null;
      if (Array.isArray(res)) suppliersList = res;
    } catch (_err) {
      // fallback: try other candidate method names
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
            } catch (_e) {
              // ignore and continue
            }
          }
        }
      } catch (_e) {
        /* noop */
      }
    }

    if (
      tmpl.suppliers &&
      Array.isArray(tmpl.suppliers) &&
      tmpl.suppliers.length
    ) {
      const resolved: string[] = [];
      for (const id of tmpl.suppliers as IDBValidKey[]) {
        try {
          const found = suppliersList.find((s: any) => s && s.id === id);
          const n = found ? found.name : undefined;
          if (n) resolved.push(n);
        } catch (_e) {
          /* noop */
        }
      }

      // If resolution via id failed, fall back to suppliersSnapshot names if present
      if (
        resolved.length === 0 &&
        Array.isArray(tmpl.suppliersSnapshot) &&
        tmpl.suppliersSnapshot.length
      ) {
        for (const snap of tmpl.suppliersSnapshot) {
          if (snap && snap.name) resolved.push(snap.name);
        }
      }

      providerNames = resolved;
    } else {
      // Fallback to suppliersSnapshot or description parsing
      if (
        Array.isArray(tmpl.suppliersSnapshot) &&
        tmpl.suppliersSnapshot.length
      ) {
        providerNames = tmpl.suppliersSnapshot
          .map((s: any) => s.name || '')
          .filter(Boolean);
      } else if (tmpl.description) {
        // simple parser
        const prefix = 'Proveedores:';
        const i = String(tmpl.description).indexOf(prefix);
        if (i !== -1) {
          const rest = String(tmpl.description)
            .slice(i + prefix.length)
            .trim();
          providerNames = rest
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
      }
    }

    const proveedoresPayload = (providerNames || []).map(name => ({
      id: Date.now() + Math.random(),
      name,
      // store original DB name so child component can use it as placeholder
      _dbName: name,
      date: dateISO,
      estimated: 0,
      dollar: 0,
      notes: '',
      visited: false,
      _fromTemplate: true,
    }));

    const payload = {
      ingresos: [],
      proveedores: proveedoresPayload,
      newIngreso: { name: '', amount: 0, date: dateISO },
      newProveedor: { name: '', estimated: 0, dollar: 0, notes: '' },
      selectedDate: dateISO,
      totals: {
        totalIngresos: 0,
        totalProviders: proveedoresPayload.reduce(
          (s: number, p: any) =>
            s + (Number(p.dollar || 0) || Number(p.estimated || 0)),
          0
        ),
        totalVisitedProviders: 0,
      },
    };

    const payloadToSave = {
      component: 'BudgetView',
      data: payload,
      createdAt: Date.now(),
    };

    // Check existing backups for the date via backupController
    const existing = await backupController.getLatestBackupForDate(
      String(dateISO)
    );
    if (
      existing &&
      existing.data &&
      hasBackupMeaningfulContent(existing.data)
    ) {
      // Ask user whether to combine or overwrite
      try {
        const parsedDate = parseISO(String(dateISO));
        applyConflictMessage.value = `Ya existen datos guardados para ${format(parsedDate, "d 'de' MMMM 'de' yyyy", { locale: esLocale })}. ¿Deseas combinar el template con los datos existentes o sobrescribirlos?`;
      } catch (_e) {
        applyConflictMessage.value = `Ya existen datos guardados para la fecha seleccionada. ¿Deseas combinar el template con los datos existentes o sobrescribirlos?`;
      }
      pendingApplyPayload.value = payloadToSave;
      showApplyConflictModal.value = true;
      return;
    }

    // No conflict: save directly
    try {
      const cleanPayload = JSON.parse(JSON.stringify(payloadToSave));
      await backupController.saveBackup({ entry: cleanPayload });
    } catch (saveErr) {
      console.warn(
        'applyTemplateFromModal: sanitized save failed, retrying',
        saveErr
      );
      await backupController.saveBackup({ entry: payloadToSave });
    }

    // Persist selected date so BudgetView loads it
    try {
      localStorage.setItem(STORAGE_KEY, String(dateISO));
    } catch (_e) {
      /* noop */
    }

    // Close modal and navigate/refresh
    showTemplatesModal.value = false;
    try {
      // If we are on the Budget view, reload data for that date. Else, navigate.
      if ((route.name || '') === 'Budget') {
        selectedDate.value = dateISO;
        await loadDataForDate(dateISO);
      } else {
        // navigate to Budget view (attempt)
        // NOTE: router is not imported in this component; using history push via window.location may be used as fallback
        try {
          // prefer vue-router if available
          (await import('vue-router')).useRouter()?.push({
            name: 'Budget',
            query: { refresh: String(Date.now()), date: dateISO },
          });
        } catch (_e) {
          // fallback: set localStorage and reload so BudgetView picks it up
          window.location.href =
            '#/budget?refresh=' +
            String(Date.now()) +
            '&date=' +
            encodeURIComponent(dateISO);
        }
      }
    } catch (_e) {
      /* noop */
    }
  } catch (e) {
    console.error('applyTemplateFromModal error', e);
  }
}

function hasBackupMeaningfulContent(data: any): boolean {
  try {
    if (!data) return false;
    // Consider backup meaningful if it has ingresos or proveedores entries or positive totals
    if (Array.isArray(data.ingresos) && data.ingresos.length > 0) return true;
    if (Array.isArray(data.proveedores) && data.proveedores.length > 0)
      return true;
    if (data.totals) {
      const t: any = data.totals || {};
      if ((Number(t.totalIngresos) || 0) > 0) return true;
      if ((Number(t.totalProviders) || 0) > 0) return true;
      if ((Number(t.totalVisitedProviders) || 0) > 0) return true;
    }
    return false;
  } catch (_e) {
    return false;
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
    const existing = await backupController.getLatestBackupForDate(
      String(dateISO)
    );

    let mergedData: any = {};
    if (existing && existing.data) {
      const existingData: any = existing.data || {};
      const existingIngresos = Array.isArray(existingData.ingresos)
        ? existingData.ingresos
        : [];
      const existingProveedores = Array.isArray(existingData.proveedores)
        ? existingData.proveedores
        : [];

      const newIngresos = Array.isArray(payloadToSave.data.ingresos)
        ? payloadToSave.data.ingresos
        : [];
      const newProveedores = Array.isArray(payloadToSave.data.proveedores)
        ? payloadToSave.data.proveedores
        : [];

      const mergedIngresos = existingIngresos.slice();
      for (const ni of newIngresos) {
        const exists = mergedIngresos.some(
          (ei: any) =>
            String(ei.name || '').trim() === String(ni.name || '').trim()
        );
        if (!exists) mergedIngresos.push(ni);
      }

      const mergedProveedores = existingProveedores.slice();
      for (const np of newProveedores) {
        const exists = mergedProveedores.some(
          (ep: any) =>
            String(ep.name || '').trim() === String(np.name || '').trim()
        );
        if (!exists) mergedProveedores.push(np);
      }

      const totalProviders = mergedProveedores.reduce(
        (s: number, p: any) =>
          s + (Number(p.dollar || 0) || Number(p.estimated || 0) || 0),
        0
      );

      mergedData = Object.assign({}, existingData, {
        ingresos: mergedIngresos,
        proveedores: mergedProveedores,
        totals: Object.assign({}, existingData.totals || {}, {
          totalIngresos: (mergedIngresos || []).reduce(
            (s: number, i: any) => s + (Number(i.amount || 0) || 0),
            0
          ),
          totalProviders,
          totalVisitedProviders: (mergedProveedores || []).reduce(
            (s: number, p: any) =>
              s +
              (p.visited
                ? Number(p.dollar || 0) || Number(p.estimated || 0) || 0
                : 0),
            0
          ),
        }),
        selectedDate: dateISO,
      });
    } else {
      mergedData = payloadToSave.data;
    }

    const savePayload = {
      component: 'BudgetView',
      data: mergedData,
      createdAt: Date.now(),
    };
    try {
      const cleanSavePayload = JSON.parse(JSON.stringify(savePayload));
      await backupController.saveBackup(cleanSavePayload);
    } catch (saveErr) {
      console.warn(
        'handleApplyConflictCombine: sanitized save failed, retrying',
        saveErr
      );
      await backupController.saveBackup({ entry: savePayload });
    }

    try {
      localStorage.setItem(STORAGE_KEY, String(dateISO));
    } catch (_e) {
      /* noop */
    }

    showApplyConflictModal.value = false;
    pendingApplyPayload.value = null;
    showTemplatesModal.value = false;

    // refresh Budget view
    selectedDate.value = dateISO;
    await loadDataForDate(dateISO);
  } catch (e) {
    console.error('handleApplyConflictCombine error', e);
  }
}

async function handleApplyConflictOverwrite() {
  try {
    const payloadToSave = pendingApplyPayload.value;
    if (!payloadToSave) return onApplyConflictDismiss();

    await backupController.saveBackup(payloadToSave);
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
    showTemplatesModal.value = false;

    const dateISO = payloadToSave.data?.selectedDate;
    selectedDate.value = dateISO;
    await loadDataForDate(dateISO);
  } catch (e) {
    console.error('handleApplyConflictOverwrite error', e);
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
</script>

<style scoped>
ion-card {
  margin-bottom: 16px;
  border: 1px solid transparent;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
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
</style>
