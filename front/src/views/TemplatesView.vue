<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Templates</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="showModal = true">
            <ion-icon :icon="createOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-list-header>
          <ion-label>Templates</ion-label>
        </ion-list-header>

        <div v-if="templates.length" class="templates-content">
          <ion-item
            v-for="(tmpl, index) in templates"
            :key="tmpl.id ?? index"
            lines="full"
            class="transparent"
            button
            @click="applyTemplate({ tmpl })"
          >
            <ion-label>
              <h2>{{ tmpl.name }}</h2>
              <p>{{ tmpl.description }}</p>
            </ion-label>

            <ion-button
              slot="end"
              size="small"
              fill="clear"
              @click.stop="editTemplate({ tmpl })"
            >
              <ion-icon :icon="createOutline"></ion-icon>
            </ion-button>

            <ion-button
              slot="end"
              size="small"
              color="danger"
              fill="clear"
              @click.stop="confirmDelete({ tmpl })"
            >
              <ion-icon :icon="trashOutline"></ion-icon>
            </ion-button>
          </ion-item>
        </div>

        <template v-else>
          <ion-item lines="none" class="transparent">
            <ion-label>No hay templates aún</ion-label>
          </ion-item>
        </template>
      </ion-list>

      <!-- modals -->
      <ion-modal v-model:is-open="showModal" @did-dismiss="showModal = false">
        <ion-header class="ion-no-border" mode="ios">
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button fill="clear" @click="showModal = false">
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-button>
            </ion-buttons>

            <ion-title>{{
              isEditMode ? 'Editar template' : 'Nuevo template'
            }}</ion-title>

            <ion-buttons slot="end">
              <ion-button @click="submitTemplate()">
                <ion-icon :icon="saveOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-card class="shadow1 ion-padding-start">
            <ion-input
              v-model="form.name"
              label="Nombre del template"
              label-placement="floating"
              placeholder="Ej: Día base"
            ></ion-input>
          </ion-card>

          <!-- Suppliers selection: search + multi-select -->
          <ion-list class="transparent">
            <ion-list-header>
              <ion-label>Proveedores</ion-label>

              <ion-button @click="loadSuppliers">
                <ion-icon :icon="addOutline"></ion-icon>
              </ion-button>
            </ion-list-header>

            <div class="list-content">
              <ion-searchbar
                v-model="supplierQuery"
                debounce="300"
                placeholder="Buscar proveedores"
                show-cancel-button="focus"
              ></ion-searchbar>

              <ion-list>
                <ion-item
                  v-for="s in filteredSuppliers"
                  :key="s.id"
                  button
                  @click="toggleSupplierSelection(s)"
                >
                  <ion-label>{{ s.name }}</ion-label>
                  <ion-checkbox
                    slot="end"
                    :checked="form.supplierIds.includes(s.id)"
                  ></ion-checkbox>
                </ion-item>
              </ion-list>

              <div style="margin-top: 12px">
                <ion-label>Seleccionados:</ion-label>
                <div
                  style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 6px;
                  "
                >
                  <ion-chip v-for="id in form.supplierIds" :key="id" outline>
                    <ion-label>{{ getSupplierNameById(id) }}</ion-label>
                    <ion-button
                      fill="clear"
                      size="small"
                      @click="removeSupplierId(id)"
                    >
                      <ion-icon :icon="closeOutline"></ion-icon>
                    </ion-button>
                  </ion-chip>
                </div>
              </div>
            </div>
          </ion-list>
        </ion-content>
      </ion-modal>

      <!-- modal aplicar template -->
      <ion-modal
        v-model:is-open="showApplyModal"
        :keep-contents-mounted="true"
        @did-dismiss="cancelApply"
      >
        <ion-header class="ion-no-border" mode="ios">
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button fill="clear" @click="cancelApply">
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-button>
            </ion-buttons>

            <ion-title>Aplicar template</ion-title>

            <ion-buttons slot="end">
              <ion-button @click="confirmApply">
                <ion-icon :icon="checkmarkOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <div v-if="applyTargetTemplate">
            <ion-card class="shadow1">
              <ion-card-header>
                <ion-card-title>{{ applyTargetTemplate.name }}</ion-card-title>
              </ion-card-header>

              <ion-card-content>
                <ion-item class="transparent">
                  <ion-label>Fecha</ion-label>

                  <ion-datetime-button
                    slot="end"
                    datetime="datetime"
                  ></ion-datetime-button>
                </ion-item>

                <ion-list class="transparent">
                  <ion-list-header>
                    <ion-label>Proveedores</ion-label>
                  </ion-list-header>

                  <div class="content">
                    <!-- Si el template tiene IDs -->
                    <template
                      v-if="
                        applyTargetTemplate.suppliers &&
                        applyTargetTemplate.suppliers.length
                      "
                    >
                      <ion-item
                        v-for="(id, idx) in applyTargetTemplate.suppliers"
                        :key="String(id) + '_' + idx"
                        class="transparent"
                        lines="full"
                      >
                        <ion-label>
                          {{ supplierDisplayName(id) }}
                        </ion-label>

                        <template v-if="!supplierExists(id)">
                          <ion-chip slot="end" color="danger">
                            Eliminado
                          </ion-chip>

                          <ion-button
                            slot="end"
                            color="primary"
                            fill="clear"
                            @click="removeDeletedSupplier(id)"
                          >
                            <ion-icon :icon="closeOutline"> </ion-icon>
                          </ion-button>
                        </template>

                        <ion-button
                          v-if="supplierExists(id)"
                          slot="end"
                          fill="clear"
                          color="danger"
                        >
                          Eliminar
                        </ion-button>
                      </ion-item>
                    </template>

                    <!-- Si el template solo tiene description -> mostrar parsed names -->
                    <template v-else>
                      <ion-item
                        v-for="(name, idx) in parseProvidersFromDescription(
                          applyTargetTemplate.description
                        )"
                        :key="idx"
                        lines="none"
                      >
                        <ion-label>{{ name }}</ion-label>
                      </ion-item>
                    </template>
                  </div>
                </ion-list>
              </ion-card-content>
            </ion-card>
          </div>
        </ion-content>
      </ion-modal>

      <!-- end modals -->

      <!-- alerts -->
      <ion-alert
        v-model:is-open="showAlert"
        header="Atención"
        :message="alertMessage"
        :buttons="['OK']"
      ></ion-alert>

      <ion-alert
        v-model:is-open="showConfirm"
        header="Confirmar"
        :message="confirmMessage"
        :buttons="[
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Eliminar', role: 'destructive', handler: proceedDelete },
        ]"
        @did-dismiss="onConfirmDismiss"
      ></ion-alert>
      <!-- end alerts -->

      <!-- toast -->
      <ion-toast
        v-model:is-open="toast.open"
        :message="toast.message"
        duration="2000"
      ></ion-toast>
      <!-- end toast-->

      <!-- modal -->
      <ion-modal :keep-contents-mounted="true">
        <ion-datetime
          id="datetime"
          v-model="applySelectedDate"
          presentation="date"
        ></ion-datetime>
      </ion-modal>
      <!-- end modal -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonButton,
  IonModal,
  IonInput,
  IonAlert,
  IonToast,
  IonIcon,
  IonDatetime,
  IonSearchbar,
  IonCheckbox,
  IonChip,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonDatetimeButton,
} from '@ionic/vue';
import {
  createOutline,
  addOutline,
  closeOutline,
  trashOutline,
  saveOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { reactive, ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

// controllers
import TemplateController from '../controllers/TempalteController';
import backupController from '../controllers/backupController';
import suppliersController, {
  Supplier,
} from '../controllers/suppliersController';
// end controllers

// interface
type TemplateSummary = {
  id: string | number | null;
  name: string;
  description?: string;
  suppliers?: IDBValidKey[];
  suppliersSnapshot?: { id: IDBValidKey; name?: string }[];
};
// end interface

// main
const router = useRouter();
// end main

// life
onMounted(() => {
  loadTemplates();
  loadSuppliers();
});
// end life

// vars
const STORAGE_KEY = 'budget:selectedDate';
const templates = ref<TemplateSummary[]>([]);
const showModal = ref(false);
const showAlert = ref(false);
const alertMessage = ref('');
const showConfirm = ref(false);
const confirmMessage = ref('');
const confirmTargetId = ref<number | string | null>(null);
const toast = reactive({
  open: false,
  message: '',
  color: 'success',
});
const form = reactive({
  name: '',
  supplierIds: [] as IDBValidKey[],
});

const suppliers = reactive<Supplier[]>([]);
const supplierQuery = ref('');

const showApplyModal = ref(false);
const applySelectedDate = ref(new Date().toISOString());
const applyTargetTemplate = ref<TemplateSummary | null>(null);
const isEditMode = ref(false);
const editingTemplateId = ref<string | number | null>(null);
// end vars

// computed
const filteredSuppliers = computed(() => {
  const q = (supplierQuery.value || '').toLowerCase().trim();
  if (!q) return suppliers.slice();
  return suppliers.filter(s => (s.name || '').toLowerCase().includes(q));
});
// end computed

// functions
async function loadSuppliers() {
  try {
    const list = await suppliersController.listSuppliers();
    suppliers.splice(0, suppliers.length, ...list);
  } catch (e) {
    console.error('loadSuppliers error', e);
  }
}

function toggleSupplierSelection(s: Supplier) {
  const id = s.id as IDBValidKey;
  const idx = form.supplierIds.indexOf(id);
  if (idx === -1) {
    form.supplierIds.push(id);
  } else {
    form.supplierIds.splice(idx, 1);
  }
}

function removeSupplierId(id: IDBValidKey) {
  const idx = form.supplierIds.indexOf(id);
  if (idx !== -1) form.supplierIds.splice(idx, 1);
}

function getSupplierNameById(id: IDBValidKey): string | null {
  const s = suppliers.find(x => x.id === id);
  return s ? s.name : null;
}

function supplierExists(id: IDBValidKey): boolean {
  return suppliers.some(x => x.id === id);
}

function supplierDisplayName(id: IDBValidKey): string {
  // Prefer current supplier name if it exists
  const s = suppliers.find(x => x.id === id);
  if (s && s.name) return s.name;

  // Fallback to the suppliersSnapshot stored in the template being applied (if any)
  const snapshotList = applyTargetTemplate.value?.suppliersSnapshot || [];
  const snap = (snapshotList as { id: IDBValidKey; name?: string }[]).find(
    ss => ss.id === id
  );
  if (snap && snap.name) return snap.name || String(id);

  // Last resort: return the id as string
  return String(id);
}

/**
 * Remove a supplier that no longer exists from the template being applied.
 * This will remove the id from applyTargetTemplate.suppliers (if present)
 * and also remove any entry in suppliersSnapshot that matches the id.
 */
function removeDeletedSupplier(id: IDBValidKey) {
  const tmpl = applyTargetTemplate.value;
  if (!tmpl) return;

  // Remove from suppliers array
  if (Array.isArray(tmpl.suppliers)) {
    const idx = tmpl.suppliers.indexOf(id);
    if (idx !== -1) {
      tmpl.suppliers.splice(idx, 1);
    }
  }

  // Remove from suppliersSnapshot array
  if (Array.isArray(tmpl.suppliersSnapshot)) {
    const snapIdx = tmpl.suppliersSnapshot.findIndex(s => s.id === id);
    if (snapIdx !== -1) {
      tmpl.suppliersSnapshot.splice(snapIdx, 1);
    }
  }
}

function resetForm() {
  form.name = '';
  form.supplierIds.splice(0, form.supplierIds.length);
  isEditMode.value = false;
  editingTemplateId.value = null;
}

async function editTemplate(params: { tmpl: TemplateSummary }) {
  const { tmpl } = params;
  if (!tmpl) return;

  // If template has supplier ids stored, use them. Otherwise try to parse names from description.
  if (
    tmpl.suppliers &&
    Array.isArray(tmpl.suppliers) &&
    tmpl.suppliers.length
  ) {
    form.supplierIds.splice(0, form.supplierIds.length, ...tmpl.suppliers);
  } else {
    // parse names from description and try to match to suppliers by name
    const names = parseProvidersFromDescription(tmpl.description);
    const matchedIds = (names || [])
      .map((n: string) => suppliers.find(s => s.name === n))
      .filter((x): x is Supplier => !!x)
      .map((s: Supplier) => s.id as IDBValidKey);
    form.supplierIds.splice(
      0,
      form.supplierIds.length,
      ...(matchedIds.length ? matchedIds : [])
    );
  }

  // Fill name
  form.name = tmpl.name || '';

  // Set edit mode
  isEditMode.value = true;
  editingTemplateId.value = tmpl.id;

  // Open modal
  showModal.value = true;
}

async function submitTemplate() {
  if (!form.name.trim()) {
    alertMessage.value = 'Por favor ingresa el nombre del template';
    showAlert.value = true;
    return;
  }

  // build description from selected supplier names for backward compatibility
  const selectedNames = form.supplierIds
    .map((id: IDBValidKey) => getSupplierNameById(id))
    .filter((n): n is string => !!(n && String(n).trim()));

  const description = selectedNames.length
    ? `Proveedores: ${selectedNames.join(', ')}`
    : undefined;

  try {
    const payloadTemplate: any = {
      name: form.name.trim(),
      description,
      suppliers: form.supplierIds.slice(),
      suppliersSnapshot: form.supplierIds.map((id: IDBValidKey) => ({
        id,
        name: getSupplierNameById(id) || '',
      })),
    };

    if (isEditMode.value && editingTemplateId.value) {
      payloadTemplate.id = editingTemplateId.value;
    }

    await TemplateController.saveTemplate({
      template: payloadTemplate,
    });

    await loadTemplates();
    resetForm();
    showModal.value = false;

    // show success toast
    toast.message = isEditMode.value
      ? 'Template actualizado'
      : 'Template guardado';
    toast.open = true;
  } catch (e) {
    console.error('submitTemplate error', e);
    alertMessage.value = 'Error al guardar el template';
    showAlert.value = true;
  }
}

// Open the apply modal instead of navigating directly
function applyTemplate(params: { tmpl: TemplateSummary }) {
  const { tmpl } = params as { tmpl: TemplateSummary };
  console.log('applyTemplate called', tmpl);
  // small toast to help debug UI flow
  try {
    toast.message = `Aplicando template: ${tmpl?.name || 'n/a'}`;
    toast.open = true;
  } catch (e) {
    /* noop */
  }

  if (!tmpl) return;
  applyTargetTemplate.value = tmpl;
  applySelectedDate.value = new Date().toISOString();
  // ensure modal flag is set explicitly
  showApplyModal.value = true;
  console.log('showApplyModal set to true');
}

function cancelApply() {
  applyTargetTemplate.value = null;
  showApplyModal.value = false;
}

function parseProvidersFromDescription(desc?: string): string[] {
  if (!desc) return [];
  const prefix = 'Proveedores:';
  const i = desc.indexOf(prefix);
  if (i === -1) return [];
  const rest = desc.slice(i + prefix.length).trim();
  if (!rest) return [];
  return rest
    .split(',')
    .map(s => s.trim())
    .filter(s => s);
}

async function confirmApply() {
  const tmpl = applyTargetTemplate.value;
  const dateISO = applySelectedDate.value;
  if (!tmpl || !dateISO) return;

  // build proveedores from template suppliers (resolve names) if available
  let providerNames: string[] = [];
  if (
    tmpl.suppliers &&
    Array.isArray(tmpl.suppliers) &&
    tmpl.suppliers.length
  ) {
    // Resolve names and skip any suppliers that no longer exist
    const resolved: string[] = [];
    for (const id of tmpl.suppliers as IDBValidKey[]) {
      const n = getSupplierNameById(id);
      if (n) {
        resolved.push(n);
      } else {
        console.warn('confirmApply: supplier id missing, skipping', id);
      }
    }
    providerNames = resolved;
  } else {
    providerNames = parseProvidersFromDescription(tmpl.description);
  }

  const proveedores = (providerNames || []).map(name => ({
    id: Date.now() + Math.random(),
    name,
    date: dateISO,
    estimated: 0,
    dollar: 0,
    notes: '',
    visited: false,
  }));

  const payload = {
    ingresos: [],
    proveedores,
    newIngreso: { name: '', amount: 0, date: dateISO },
    newProveedor: { name: '', estimated: 0, dollar: 0, notes: '' },
    selectedDate: dateISO,
    totals: {
      totalIngresos: 0,
      totalProviders: proveedores.reduce(
        (s, p) => s + (Number(p.dollar || 0) || Number(p.estimated || 0)),
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

  try {
    await backupController.saveBackup(payloadToSave);
    // persist selected date so BudgetView picks it up
    try {
      localStorage.setItem(STORAGE_KEY, dateISO);
    } catch (e) {
      /* noop */
    }

    // close modal and navigate to Budget
    showApplyModal.value = false;
    applyTargetTemplate.value = null;

    toast.message = 'Template aplicado';
    toast.open = true;

    router.push({
      name: 'Budget',
      query: { refresh: String(Date.now()), date: dateISO },
    });
  } catch (e) {
    console.error('confirmApply error', e);
    alertMessage.value = 'Error al aplicar el template';
    showAlert.value = true;
  }
}

async function confirmDelete(params: { tmpl: TemplateSummary }) {
  const { tmpl } = params;
  if (!tmpl || !tmpl.id) {
    alertMessage.value = 'Template inválido';
    showAlert.value = true;
    return;
  }

  // store only the id of the target to delete
  confirmTargetId.value = tmpl.id;
  confirmMessage.value = `¿Eliminar template "${tmpl.name}"? Esta acción no se puede deshacer.`;
  showConfirm.value = true;
}

async function proceedDelete() {
  const id = confirmTargetId.value;
  if (!id) return;

  try {
    await TemplateController.deleteTemplate({ id: id as IDBValidKey });
    // reset target and hide confirm
    confirmTargetId.value = null;
    showConfirm.value = false;
    await loadTemplates();

    // show success toast
    toast.message = 'Template eliminado';
    toast.open = true;
  } catch (e) {
    console.error('proceedDelete error', e);
    alertMessage.value = 'Error al eliminar el template';
    showAlert.value = true;
  }
}

function onConfirmDismiss() {
  confirmTargetId.value = null;
  showConfirm.value = false;
}

async function loadTemplates() {
  try {
    const list = await TemplateController.listTemplates();
    templates.value.splice(
      0,
      templates.value.length,
      ...list.map((t: any) => ({
        id: t.id || '',
        name: t.name,
        description: t.description,
        suppliers: (t as any).suppliers || [],
        suppliersSnapshot: (t as any).suppliersSnapshot || [],
      }))
    );
  } catch (e) {
    console.error('loadTemplates error', e);
  }
}
</script>

<style scoped>
/* Hide action buttons by default on non-touch devices */
.list-content ion-item.transparent ion-button[slot='end'] {
  display: none !important;
}

/* Show when hovering the ion-item */
.list-content ion-item.transparent:hover ion-button[slot='end'] {
  display: inline-flex !important;
}

/* On touch devices (no hover), show buttons always */
@media (hover: none), (pointer: coarse) {
  .list-content ion-item.transparent ion-button[slot='end'] {
    display: inline-flex !important;
  }
}
</style>
