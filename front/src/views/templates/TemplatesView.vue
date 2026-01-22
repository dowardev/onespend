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
            <div v-if="TemplateController.templates.length" class="templates-content">
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
          :editing-tmpl="editingTemplate"
          @saved="onAddTemplateSaved"
          @close="
            () => {
              showModal = false;
              resetForm();
            }
          "
        />
      </ion-modal>

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

      <ion-modal :keep-contents-mounted="true">
        <ion-datetime
          id="datetime"
          v-model="applySelectedDate"
          presentation="date"
        ></ion-datetime>
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

      <ion-alert
        v-model:is-open="showApplyConflict"
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

      <!-- toasts -->
      <ion-toast
        v-model:is-open="toast.open"
        :message="toast.message"
        duration="2000"
      ></ion-toast>
      <!-- end toasts -->
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
import { createOutline, addOutline, trashOutline } from 'ionicons/icons';
import { reactive, ref, onMounted, computed, unref } from 'vue';
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import { formatLocalDate } from '@/utils/date';
import { es as esLocale } from 'date-fns/locale';
import { useRouter } from 'vue-router';
// End Imports

// Components
import AddTemplateComponent from '@/views/templates/modals/AddTemplateComponent.vue';
import ApplyTemplateComponent from '@/views/templates/modals/ApplyTemplateComponent.vue';
// End Components

// Controllers
import TemplateController from '@/controllers/TempalteController';
import backupController from '@/controllers/backupController';
import suppliersController from '@/controllers/suppliersController';
import systemController from '@/controllers/systemConfigController';
import {
  parseProvidersFromDescription,
  buildPayloadFromTemplate,
  hasBackupMeaningfulContent,
  buildAndSaveTemplateApplication,
  type TemplateApplicationPayload,
} from '@/controllers/templateService';
// End Controllers

// Vars
type TemplateSummary = {
  id: string | number | null;
  name: string;
  description?: string;
  suppliers?: Array<IDBValidKey>;
  suppliersSnapshot?: Array<{ id: IDBValidKey; name?: string }>;
};

type Supplier = unknown;

const router = useRouter();

const STORAGE_KEY = 'budget:selectedDate';
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
  supplierIds: [] as Array<IDBValidKey>,
});

const suppliers = reactive<Supplier[]>([]);
const showApplyModal = ref(false);
const applySelectedDate = ref(format(new Date(), 'yyyy-MM-dd'));

const applyTargetTemplate = ref<TemplateSummary | null>(null);
const isEditMode = ref(false);
const editingTemplateId = ref<string | number | null>(null);
const editingTemplate = ref<TemplateSummary | null>(null);
const _supplierSearchbar = ref<InstanceType<typeof IonSearchbar> | null>(null);
const _searchVisible = ref(false);
const _supplierQuery = ref('');

void _supplierSearchbar.value;
void _searchVisible.value;
void _supplierQuery.value;

const showApplyConflict = ref(false);
const applyConflictMessage = ref('');
const pendingApplyPayload = ref<TemplateApplicationPayload | null>(null);
// End Vars

// Functions
function getSupplierNameById(id: IDBValidKey): string | null {
  const s = suppliers.find(x => x.id === id);
  return s ? s.name : null;
}

function removeDeletedSupplier(id: IDBValidKey) {
  const tmpl = applyTargetTemplate.value;
  if (!tmpl) return;

  if (Array.isArray(tmpl.suppliers)) {
    const idx = tmpl.suppliers.indexOf(id);
    if (idx !== -1) {
      tmpl.suppliers.splice(idx, 1);
    }
  }

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
  editingTemplate.value = null;
}

async function openNewTemplate() {
  await loadSuppliers();
  resetForm();
  showModal.value = true;
}

async function editTemplate(params: { tmpl: TemplateSummary }) {
  const { tmpl } = params;
  if (!tmpl) return;

  await loadSuppliers();

  if (
    tmpl.suppliers &&
    Array.isArray(tmpl.suppliers) &&
    tmpl.suppliers.length
  ) {
    form.supplierIds.length = 0;
    for (const id of tmpl.suppliers as IDBValidKey[]) {
      form.supplierIds.push(id);
    }
  } else {
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

  form.name = tmpl.name || '';

  isEditMode.value = true;
  editingTemplateId.value = tmpl.id;
  editingTemplate.value = tmpl;

  showModal.value = true;
}

async function onAddTemplateSaved() {
  try {
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
  try {
    toast.message = `Aplicando template: ${tmpl?.name || 'n/a'}`;
    toast.open = true;
  } catch (e) {
  }

  if (!tmpl) return;
  applyTargetTemplate.value = tmpl;
  applySelectedDate.value = format(new Date(), 'yyyy-MM-dd');
  showApplyModal.value = true;
  console.log('showApplyModal set to true');
}

function cancelApply() {
  applyTargetTemplate.value = null;
  showApplyModal.value = false;
}

async function confirmApply() {
  const tmpl = applyTargetTemplate.value;
  const dateISO = applySelectedDate.value;
  if (!tmpl || !dateISO) return;

  const payload = buildPayloadFromTemplate(tmpl, dateISO, getSupplierNameById);
  const payloadToSave = {
    component: 'BudgetView',
    data: payload,
    createdAt: Date.now(),
  };

  try {
    const result = await buildAndSaveTemplateApplication(
      tmpl,
      dateISO,
      getSupplierNameById,
      { conflictStrategy: 'ask' }
    );

    if (result && result.conflict) {
      try {
        const parsedDate = parseLocalDate({ d: String(dateISO) });
        const pretty = isNaN(parsedDate.getTime())
          ? String(dateISO)
          : format(parsedDate, "d 'de' MMMM 'de' yyyy", { locale: esLocale });
        applyConflictMessage.value = `Ya existen proveedores guardados para ${pretty}. ¿Deseas combinar el template con los proveedores existentes o sobrescribirlos?`;
      } catch (_e) {
        applyConflictMessage.value = `Ya existen proveedores guardados para la fecha seleccionada. ¿Deseas combinar el template con los proveedores existentes o sobrescribirlos?`;
      }

      pendingApplyPayload.value = result.payloadToSave;
      showApplyConflict.value = true;
      return;
    }

    if (result && result.success) {
      try {
        localStorage.setItem(STORAGE_KEY, formatLocalDate({ d: dateISO }));
      } catch (_e) {
      }

      showApplyModal.value = false;
      applyTargetTemplate.value = null;

      toast.message = 'Template aplicado';
      toast.open = true;

      router.push({
        name: 'Budget',
        query: { refresh: String(Date.now()), date: formatLocalDate({ d: dateISO }) },
      });
      return;
    }

    alertMessage.value = 'No se pudo aplicar el template';
    showAlert.value = true;
  } catch (e) {
    console.error('confirmApply error', e);
    alertMessage.value = 'Error al aplicar el template';
    showAlert.value = true;
  }
}

function onApplyConflictDismiss() {
  try {
    showApplyConflict.value = false;
    pendingApplyPayload.value = null;
  } catch (_e) {
  }
}

async function handleApplyConflictCombine() {
  try {
    const payloadToSave = pendingApplyPayload.value;
    if (!payloadToSave) return onApplyConflictDismiss();

    const dateISO = payloadToSave.data?.selectedDate;
    const res = await buildAndSaveTemplateApplication(
      applyTargetTemplate.value,
      dateISO,
      getSupplierNameById,
      { conflictStrategy: 'combine' }
    );
    if (res && res.success) {
      try {
        localStorage.setItem(STORAGE_KEY, formatLocalDate({ d: dateISO }));
      } catch (_e) {
      }

      showApplyConflict.value = false;
      pendingApplyPayload.value = null;
      showApplyModal.value = false;
      applyTargetTemplate.value = null;

      toast.message = 'Template combinado y aplicado';
      toast.open = true;

      router.push({
        name: 'Budget',
        query: { refresh: String(Date.now()), date: formatLocalDate({ d: dateISO }) },
      });
      return;
    }

    alertMessage.value = 'Error al combinar templates';
    showAlert.value = true;
  } catch (e) {
    console.error('handleApplyConflictCombine error', e);
    alertMessage.value = 'Error al combinar templates';
    showAlert.value = true;
  }
}

async function handleApplyConflictOverwrite() {
  try {
    const payloadToSave = pendingApplyPayload.value;
    if (!payloadToSave) return onApplyConflictDismiss();

    const dateISO = payloadToSave.data?.selectedDate;
    const res = await buildAndSaveTemplateApplication(
      applyTargetTemplate.value,
      dateISO,
      getSupplierNameById,
      { conflictStrategy: 'overwrite' }
    );
    if (res && res.success) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          formatLocalDate({ d: String(payloadToSave.data?.selectedDate) })
        );
      } catch (_e) {
      }

      showApplyConflict.value = false;
      pendingApplyPayload.value = null;
      showApplyModal.value = false;
      applyTargetTemplate.value = null;

      toast.message = 'Template aplicado (sobrescrito)';
      toast.open = true;

      router.push({
        name: 'Budget',
        query: {
          refresh: String(Date.now()),
          date: formatLocalDate({ d: String(payloadToSave.data?.selectedDate) }),
        },
      });
      return;
    }

    alertMessage.value = 'Error al sobrescribir datos';
    showAlert.value = true;
  } catch (e) {
    console.error('handleApplyConflictOverwrite error', e);
    alertMessage.value = 'Error al sobrescribir datos';
    showAlert.value = true;
  }
}

async function confirmDelete(params: { tmpl: TemplateSummary }) {
  const { tmpl } = params;
  if (!tmpl || tmpl.id == null) {
    alertMessage.value = 'Template inválido';
    showAlert.value = true;
    return;
  }

  confirmTargetId.value = tmpl.id;
  confirmMessage.value = `¿Eliminar template "${tmpl.name}"? Esta acción no se puede deshacer.`;
  showConfirm.value = true;
}

async function proceedDelete() {
  const id = confirmTargetId.value;
  if (!id) return;

  try {
    await TemplateController.deleteTemplate({ id: id as IDBValidKey });
    confirmTargetId.value = null;
    showConfirm.value = false;

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
    await TemplateController.listTemplates();
  } catch (e) {
    console.error('loadTemplates error', e);
  }
}

async function loadSuppliers() {
  try {
    const list = await suppliersController.listSuppliers();
    suppliers.length = 0;
    for (const it of list) {
      suppliers.push(it as Supplier);
    }
  } catch (_e) {
    console.error('loadSuppliers error', _e);
  }
}
// End Functions

// Life cycle
onMounted(() => {
  loadTemplates();
  loadSuppliers();
});
// End Life cycle

// Computed
const designMode = computed(() => systemController.getDesignMode());

const groupedTemplates = computed(() => {
  const list = (unref(TemplateController.templates) || []).slice();
  list.sort((a: TemplateSummary, b: TemplateSummary) => {
    const na = (a.name || '').toString().toLowerCase();
    const nb = (b.name || '').toString().toLowerCase();
    return na.localeCompare(nb);
  });

  const map = new Map<string, TemplateSummary[]>();
  list.forEach((t: TemplateSummary) => {
    const name = (t.name || '').toString().trim();
    const letter = name ? name[0].toUpperCase() : '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(t);
  });

  return Array.from(map.keys())
    .sort()
    .map(letter => ({ letter, items: map.get(letter) || [] }));
});
// End Computed

// Watch
// End Watch</script>

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
