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

        <div v-if="templates.length" class="content">
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

            <ion-title>{{ isEditMode ? 'Editar template' : 'Nuevo template' }}</ion-title>

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

          <ion-list class="transparent">
            <ion-list-header>
              <ion-label>Proveedores</ion-label>

              <ion-button @click="addProvider">
                <ion-icon :icon="addOutline"></ion-icon>
              </ion-button>
            </ion-list-header>

            <div class="content">
              <ion-item
                v-for="(_, idx) in form.providers"
                :key="idx"
                class="transparent"
              >
                <ion-input
                  v-model="form.providers[idx]"
                  placeholder="Nombre del proveedor"
                ></ion-input>

                <ion-button
                  slot="end"
                  fill="clear"
                  size="small"
                  title="Eliminar proveedor"
                  @click="removeProvider({ idx })"
                >
                  <ion-icon color="danger" :icon="trashOutline"></ion-icon>
                </ion-button>
              </ion-item>
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
            <h2>{{ applyTargetTemplate.name }}</h2>
            <p>{{ applyTargetTemplate.description }}</p>
          </div>

          <ion-item>
            <ion-label>Fecha</ion-label>

            <ion-datetime-button
              slot="end"
              datetime="datetime"
            ></ion-datetime-button>
          </ion-item>
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
} from '@ionic/vue';
import {
  createOutline,
  addOutline,
  closeOutline,
  trashOutline,
  saveOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

// controllers
import TemplateController from '../controllers/TempalteController';
import backupController from '../controllers/backupController';
// end controllers

// interface
type TemplateSummary = {
  id: string | number | null;
  name: string;
  description?: string;
};
// end interface

// main
const router = useRouter();
// end main

// life
onMounted(() => {
  loadTemplates();
});
// end life

// vars
const STORAGE_KEY = 'budget:selectedDate';
const templates = reactive<TemplateSummary[]>([]);
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
  providers: [''],
});

const showApplyModal = ref(false);
const applySelectedDate = ref(new Date().toISOString());
const applyTargetTemplate = ref<TemplateSummary | null>(null);
const isEditMode = ref(false);
const editingTemplateId = ref<string | number | null>(null);
// end vars

// functions
function addProvider() {
  form.providers.push('');
}

function removeProvider(params: { idx: number }) {
  const { idx } = params;
  if (form.providers.length > 1) form.providers.splice(idx, 1);
}

function resetForm() {
  form.name = '';
  form.providers.splice(0, form.providers.length, '');
  isEditMode.value = false;
  editingTemplateId.value = null;
}

function editTemplate(params: { tmpl: TemplateSummary }) {
  const { tmpl } = params;
  if (!tmpl) return;

  // Parse providers from description
  const providers = parseProvidersFromDescription(tmpl.description);

  // Fill form with template data
  form.name = tmpl.name;
  form.providers.splice(0, form.providers.length, ...(providers.length ? providers : ['']));

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

  const cleanedProviders = form.providers.map(p => p.trim()).filter(p => p);

  // description may contain the providers
  const description = cleanedProviders.length
    ? `Proveedores: ${cleanedProviders.join(', ')}`
    : undefined;

  try {
    const payloadTemplate: any = {
      name: form.name.trim(),
      description,
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
    toast.message = isEditMode.value ? 'Template actualizado' : 'Template guardado';
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

  // build proveedores from template description
  const providerNames = parseProvidersFromDescription(tmpl.description);
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
    templates.splice(
      0,
      templates.length,
      ...list.map(t => ({
        id: t.id || '',
        name: t.name,
        description: t.description,
      }))
    );
  } catch (e) {
    console.error('loadTemplates error', e);
  }
}
</script>

<style scoped>
/* Hide action buttons by default on non-touch devices */
.content ion-item.transparent ion-button[slot='end'] {
  display: none !important;
}

/* Show when hovering the ion-item */
.content ion-item.transparent:hover ion-button[slot='end'] {
  display: inline-flex !important;
}

/* On touch devices (no hover), show buttons always */
@media (hover: none), (pointer: coarse) {
  .content ion-item.transparent ion-button[slot='end'] {
    display: inline-flex !important;
  }
}
</style>
