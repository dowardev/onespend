<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode" />
        </ion-buttons>

        <ion-title>Templates</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="openNewTemplate()">
            <ion-icon :icon="addOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1 main-card-content">
        <ion-card-content>
          <ion-list class="transparent">
            <div v-if="templates.length" class="templates-content">
              <template v-for="group in groupedTemplates" :key="group.letter">
                <ion-item-group>
                  <ion-item-divider sticky>
                    <ion-label>{{ group.letter }}</ion-label>
                  </ion-item-divider>

                  <ion-item
                    v-for="(tmpl, index) in group.items"
                    :key="String(tmpl.id ?? index)"
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
                </ion-item-group>
              </template>
            </div>

            <template v-else>
              <ion-item lines="none" class="transparent">
                <ion-label>No hay templates aún</ion-label>
              </ion-item>
            </template>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- modals -->
      <ion-modal
        v-model:is-open="showModal"
        class="suppliers__modal"
        @did-dismiss="showModal = false"
      >
        <AddTemplateComponent
          :editing-tmpl="
            editingTemplateId != null
              ? templates.find(t => t.id === editingTemplateId)
              : null
          "
          @saved="onAddTemplateSaved"
          @close="
            () => {
              showModal = false;
              resetForm();
            }
          "
        />
      </ion-modal>

      <!-- modal aplicar template -->
      <ion-modal
        v-model:is-open="showApplyModal"
        :keep-contents-mounted="true"
        @did-dismiss="cancelApply"
      >
        <ApplyTemplateComponent
          v-model:apply-selected-date="applySelectedDate"
          :apply-target-template="applyTargetTemplate"
          :suppliers="suppliers"
          @confirm="confirmApply"
          @cancel="cancelApply"
          @remove-deleted-supplier="removeDeletedSupplier"
        />
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
  IonItem,
  IonLabel,
  IonButton,
  IonModal,
  IonAlert,
  IonToast,
  IonIcon,
  IonDatetime,
  IonCard,
  IonCardContent,
  IonButtons,
  IonMenuButton,
  IonItemGroup,
  IonItemDivider,
  IonSearchbar,
} from '@ionic/vue';
import {
  createOutline,
  addOutline,
  trashOutline,
} from 'ionicons/icons';
import { reactive, ref, onMounted, computed, unref, nextTick } from 'vue'; // Placeholder comment for further Ionic changes.
import { useRouter } from 'vue-router';

// controllers
import TemplateController from '@/controllers/TempalteController';
import backupController from '@/controllers/backupController';
import suppliersController from '@/controllers/suppliersController';
import systemController from '@/controllers/systemConfigController';
// end controllers

// conponents
import AddTemplateComponent from '@/views/templates/modals/AddTemplateComponent.vue';
import ApplyTemplateComponent from '@/views/templates/modals/ApplyTemplateComponent.vue';
// end components

// interface
type TemplateSummary = {
  id: string | number | null;
  name: string;
  description?: string;
  suppliers?: any[];
  suppliersSnapshot?: any[];
};
// end interface

// Local lightweight Supplier alias to avoid heavy TypeScript instantiation in this view
// We prefer unknown/any here to prevent "Type instantiation is excessively deep" errors
type Supplier = any;

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
  supplierIds: [] as any[],
});

const suppliers = reactive<Supplier[]>([]);
const showApplyModal = ref(false);
const applySelectedDate = ref(new Date().toISOString());
const applyTargetTemplate = ref<TemplateSummary | null>(null);
const isEditMode = ref(false);
const editingTemplateId = ref<string | number | null>(null);
// References the searchbar element so we can focus it when opening the search
const supplierSearchbar = ref<InstanceType<typeof IonSearchbar> | null>(null);
const searchVisible = ref(false);
const supplierQuery = ref('');
// end vars

// computed
const designMode = computed(() => systemController.getDesignMode());

// Group templates by the first letter of their name and sort groups and items alphabetically
const groupedTemplates = computed(() => {
  const list = (unref(templates) || []).slice();
  // sort templates by name
  list.sort((a: any, b: any) => {
    const na = (a.name || '').toString().toLowerCase();
    const nb = (b.name || '').toString().toLowerCase();
    return na.localeCompare(nb);
  });

  const map = new Map<string, any[]>();
  list.forEach((t: any) => {
    const name = (t.name || '').toString().trim();
    const letter = name ? name[0].toUpperCase() : '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(t);
  });

  return Array.from(map.keys())
    .sort()
    .map(letter => ({ letter, items: map.get(letter) || [] }));
});
// end computed

// functions
async function loadSuppliers() {
  try {
    const list =
      (await suppliersController.listSuppliers()) as unknown as any[];
    // Avoid deep type instantiation by treating items as any
    suppliers.length = 0;
    for (const it of list) (suppliers as any).push(it);
  } catch (e) {
    console.error('loadSuppliers error', e);
  }
}


function openSearch() {
  // show the searchbar and focus it on nextTick so it's present in DOM
  searchVisible.value = true;
  nextTick(() => {
    try {
      const el: any = supplierSearchbar.value as any;
      if (el && typeof el.setFocus === 'function') {
        el.setFocus();
      }
    } catch (e) {
      // ignore focus errors
    }
  });
}

function onSearchCancel() {
  // hide the searchbar and clear the query
  supplierQuery.value = '';
  searchVisible.value = false;
}

function toggleSupplierSelection(s: Supplier) {
  const id = s.id as IDBValidKey;
  let idx = -1;
  const _ids = form.supplierIds as any;
  for (let i = 0; i < (_ids as any).length; i++) {
    if ((_ids as any)[i] === id) {
      idx = i;
      break;
    }
  }
  if (idx === -1) {
    form.supplierIds.push(id);
  } else {
    form.supplierIds.splice(idx, 1);
  }
}

function removeSupplierId(id: IDBValidKey) {
  const idx = (form.supplierIds as any).indexOf(id);
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

// Open new template modal ensuring supplier list is up-to-date
async function openNewTemplate() {
  // reload suppliers to reflect latest names before opening modal
  await loadSuppliers();
  resetForm();
  showModal.value = true;
}

async function editTemplate(params: { tmpl: TemplateSummary }) {
  const { tmpl } = params;
  if (!tmpl) return;

  // Ensure suppliers are fresh so names reflect recent edits
  await loadSuppliers();

  // If template has supplier ids stored, use them. Otherwise try to parse names from description.
  if (
    tmpl.suppliers &&
    Array.isArray(tmpl.suppliers) &&
    tmpl.suppliers.length
  ) {
    // Avoid deep type instantiation by clearing and pushing individually
    form.supplierIds.length = 0;
    for (const id of tmpl.suppliers as IDBValidKey[]) {
      form.supplierIds.push(id);
    }
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

  // Prevent creating or saving a template with a duplicate name (case-insensitive).
  // When editing, allow keeping the same name for the template being edited.
  const newName = form.name.trim();
  try {
    const exists = (templates.value || []).some((t: any) => {
      const tName = t && t.name ? String(t.name).trim().toLowerCase() : '';
      const compareId = t.id == null ? '' : String(t.id);
      const editingId =
        editingTemplateId.value == null ? '' : String(editingTemplateId.value);
      return (
        tName && tName === newName.toLowerCase() && compareId !== editingId
      );
    });

    if (exists) {
      alertMessage.value = 'Ya existe un template con ese nombre';
      // Force re-opening the alert even if the message didn't change by toggling the v-model
      showAlert.value = false;
      await nextTick();
      showAlert.value = true;
      return;
    }
  } catch (e) {
    // If some unexpected error happens during duplicate check, log and continue to attempt save
    console.warn('duplicate name check failed', e);
  }

  // build description from selected supplier names for backward compatibility
  const selectedNames = form.supplierIds
    .map((id: IDBValidKey) => getSupplierNameById(id))
    .filter((n: unknown): n is string => !!(typeof n === 'string' && n.trim()));

  const description = selectedNames.length
    ? `Proveedores: ${selectedNames.join(', ')}`
    : undefined;

  try {
    const payloadTemplate: any = {
      name: newName,
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
async function onAddTemplateSaved() {
  // After a template is saved from the modal component, refresh the list,
  // reset the form state and close the modal, then show a confirmation toast.
  try {
    await loadTemplates();
  } catch (e) {
    console.error('onAddTemplateSaved: failed to reload templates', e);
  }
  resetForm();
  showModal.value = false;
  toast.message = 'Template guardado';
  toast.open = true;
}

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
    .map((s: string) => s.trim())
    .filter((s: string) => s);
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
    const mapped = list.map((t: any) => ({
      id: t.id || '',
      name: t.name,
      description: t.description,
      suppliers: (t as any).suppliers || [],
      suppliersSnapshot: (t as any).suppliersSnapshot || [],
    }));

    templates.value.length = 0;
    for (const it of mapped) templates.value.push(it);
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

.templates__suppliers-list {
  height: calc(100% - 82px);
}

.templates__suppliers-content {
  height: calc(100% - 53px);
}

/* On touch devices (no hover), show buttons always */
@media (hover: none), (pointer: coarse) {
  .list-content ion-item.transparent ion-button[slot='end'] {
    display: inline-flex !important;
  }
}

/* Large phones / small tablets (portrait) */
@media (min-width: 426px) and (max-width: 768px) {
  /* .suppliers__modal { */
  /*   --height: 60dvh; */
  /* } */
}

/* Tablets / small desktop */
@media (min-width: 769px) and (max-width: 1024px) {
  /* .suppliers__modal { */
  /*   --height: 60dvh; */
  /* } */
}

/* Desktop */
@media (min-width: 1025px) and (max-width: 1440px) {
  .suppliers__modal {
    --height: 80dvh;
  }
}

/* Large desktop / wide screens */
@media (min-width: 1441px) {
  .suppliers__modal {
    --height: 80dvh;
  }
}
</style>
