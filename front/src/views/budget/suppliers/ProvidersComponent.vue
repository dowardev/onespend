<template>
  <ion-grid>
    <ion-row>
      <ion-col size="6">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Proveedores</ion-label>

            <ion-button :disabled="isDayClosed" @click="addEmptyProvider">
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>

            <ion-button :disabled="isDayClosed" @click="openTemplatesModal">
              <ion-icon :icon="documentOutline"></ion-icon>
            </ion-button>
          </ion-list-header>

          <div class="list-content">
            <template v-if="providers.length">
              <div class="provider-list">
                <ProviderCardComponent
                  v-for="p in providers"
                  :key="p.id"
                  :provider="p"
                  :has-products="false"
                  :is-closed="isDayClosed"
                  :is-disabled="providerIdsWithEntries.has(p.id)"
                  @update-provider="handleUpdateProvider"
                  @confirm-remove-proveedor="confirmRemoveProveedor"
                  @open-notes-modal="handleOpenNotesModal"
                  @open-edit-modal="
                    (provider) =>
                      router.push({
                        path: '/budget/provider/edit',
                        query: { providerId: String(provider.id) },
                      })
                  "
                />
              </div>
            </template>

            <template v-else>
              <ion-item lines="none">
                <ion-label
                  >No hay proveedores para la fecha seleccionada. Pulsa "+" para agregar
                  uno.</ion-label
                >
              </ion-item>
            </template>
          </div>
        </ion-list>
      </ion-col>

      <ion-col size="6">
        <ProvidersSummary />
      </ion-col>
    </ion-row>
  </ion-grid>

  <!-- modals -->
  <TemplatesModal
    :is-open="showTemplatesModal"
    :templates-list="templatesList"
    @dismiss="showTemplatesModal = false"
    @select-template="checkTemplateConflict"
  />

  <NotesModal
    :is-open="showNotesModal"
    :provider-name="notesProvider?.name || ''"
    :notes="notesContent"
    @dismiss="showNotesModal = false"
    @save="saveNotes"
    @update-notes="notesContent = $event"
  />
  <!-- end modals -->

  <!-- alerts -->
  <ion-alert
    :is-open="showConflictModal"
    header="Conflicto de datos"
    :message="conflictMessage"
    :buttons="[
      {
        text: 'Cancelar',
        role: 'cancel',
        handler: () => {
          showConflictModal = false;
        },
      },
      { text: 'Combinar', handler: handleCombine },
      { text: 'Sobrescribir', cssClass: 'danger', handler: handleOverwrite },
    ]"
    @did-dismiss="showConflictModal = false"
  ></ion-alert>

  <ion-alert
    :is-open="deleteConfirm.open"
    header="Confirmar eliminación"
    :message="`¿Eliminar proveedor «${deleteConfirm.providerName}»? Esta acción no se puede deshacer.`"
    :buttons="[
      {
        text: 'Cancelar',
        role: 'cancel',
        cssClass: 'secondary',
        handler: () => {
          deleteConfirm.open = false;
          deleteConfirm.providerId = null;
          deleteConfirm.providerName = '';
        },
      },
      {
        text: 'Eliminar',
        cssClass: 'danger',
        handler: removeProveedorConfirmed,
      },
    ]"
    @did-dismiss="
      () => {
        deleteConfirm.open = false;
        deleteConfirm.providerId = null;
        deleteConfirm.providerName = '';
      }
    "
  ></ion-alert>

  <ion-alert
    :is-open="showQuickAccountAlert"
    header="Nueva Cuenta"
    :inputs="quickAccountInputs"
    :buttons="quickAccountButtons"
    @did-dismiss="showQuickAccountAlert = false"
  ></ion-alert>
  <!-- end alerts -->
</template>

<script setup lang="ts">
// Imports
import {
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonListHeader,
  IonLabel,
  IonButton,
  IonIcon,
  IonItem,
  IonAlert,
  onIonViewWillEnter,
} from '@ionic/vue';
import { ref, reactive, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import { addOutline, documentOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
// End Imports

// Controllers
import budgetController from '@/controllers/budgetController';
import TemplateController from '@/controllers/TempalteController';
import { TemplateRecord } from '@/controllers/TempalteController';
import { buildPayloadFromTemplate } from '@/controllers/templateService';
import { SuppliersController } from '@/controllers/suppliersController';
import { AccountsController } from '@/controllers/accountsController';
// End Controllers

// Components
import ProviderCardComponent from './ProviderCardComponent.vue';
import ProvidersSummary from '../components/ProvidersSummary.vue';
import TemplatesModal from '../components/TemplatesModal.vue';
import NotesModal from '../components/NotesModal.vue';
import type { ProviderData } from './ProviderEditPage.vue';
// End Components

// Vars
const router = useRouter();
const budgetCtrl = budgetController;
const suppliersCtrl = new SuppliersController();
const accountsCtrl = new AccountsController();

const showTemplatesModal = ref(false);
const showConflictModal = ref(false);
const showNotesModal = ref(false);
const notesProvider = ref<ProviderData | null>(null);
const notesContent = ref('');
const conflictMessage = ref('');
const templatesList = ref<Array<TemplateRecord>>([]);
const pendingTemplate = ref<TemplateRecord | null>(null);
const pendingProviders = ref<Array<{ name: string; estimated: number }>>([]);

const deleteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '' as string,
});

const showQuickAccountAlert = ref(false);

const quickAccountInputs = [
  {
    name: 'accountName',
    type: 'text',
    placeholder: 'Nombre de la cuenta',
  },
  {
    name: 'initialBalance',
    type: 'number',
    placeholder: 'Balance inicial (opcional)',
    value: 0,
  },
];

const quickAccountButtons = [
  {
    text: 'Cancelar',
    role: 'cancel',
  },
  {
    text: 'Crear',
    handler: (data: { accountName: string; initialBalance: string }) => {
      if (!data.accountName || data.accountName.trim() === '') {
        return false;
      }
      createQuickAccount({ name: data.accountName.trim(), initialBalance: Number(data.initialBalance) || 0 });
      return true;
    },
  },
];

// End Vars

// Computed
const providers = computed(() => budgetCtrl.getProviders());
const providerIdsWithEntries = computed(() => budgetCtrl.getProviderIdsWithEntries());
// Day-close concept removed; always treat as open
const isDayClosed = computed(() => false);

// End Computed

// Life cycle
onMounted(async () => {
  await loadSuppliers();
});

onMounted(() => {
  const stopWatcher = watchEffect(() => {
    const suppliers = suppliersCtrl.getSuppliers();
    console.log('[Suppliers Change] Received update, suppliers count:', suppliers.length);
    budgetCtrl.syncProvidersWithSuppliers({ suppliers });
  });

  onUnmounted(() => {
    stopWatcher();
  });
});

onIonViewWillEnter(async () => {
  await loadSuppliers();
});

// End Life cycle

// Functions
async function loadSuppliers() {
  const list = await suppliersCtrl.listSuppliers();
  budgetCtrl.syncProvidersWithSuppliers({ suppliers: list || [] });
}

function addEmptyProvider() {
  router.push('/budget/provider/new');
}

function handleUpdateProvider(payload: { id: string | number; field: string; value: unknown }) {
  const { id, field, value } = payload;
  budgetController.updateProvider({ id, changes: { [field]: value } });
  budgetController.saveData();
}

function confirmRemoveProveedor(
  payload: { id?: string | number; name?: string } | string | number,
) {
  const id = typeof payload === 'object' && payload !== null ? payload.id : payload;
  const name = typeof payload === 'object' && payload !== null ? payload.name : '';
  deleteConfirm.providerId = id ?? null;
  deleteConfirm.providerName = name || '';
  deleteConfirm.open = true;
}

function removeProveedorConfirmed() {
  const pid = deleteConfirm.providerId;
  deleteConfirm.open = false;
  if (pid != null) {
    const provider = providers.value.find((p: any) => String(p.id) === String(pid));
    const supplierId = provider?._supplierId || pid;
    budgetController.removeEgresosGroup({ groupId: supplierId });
    budgetController.removeProvider({ id: pid });
    budgetController.saveData();
  }
  deleteConfirm.providerId = null;
  deleteConfirm.providerName = '';
}

function handleOpenNotesModal(payload: { provider: ProviderData }) {
  const { provider } = payload;
  notesProvider.value = provider;
  notesContent.value = provider?.notes || '';
  showNotesModal.value = true;
}

function saveNotes() {
  if (notesProvider.value) {
    budgetController.updateProvider({
      id: notesProvider.value.id,
      changes: { notes: notesContent.value },
    });
    budgetController.saveData();
  }
  showNotesModal.value = false;
  notesProvider.value = null;
}

async function openTemplatesModal() {
  try {
    const list = await TemplateController.listTemplates();
    templatesList.value = list || [];
  } catch (e) {
    templatesList.value = [];
  }
  showTemplatesModal.value = true;
}

async function checkTemplateConflict(params: { tmpl: TemplateRecord }) {
  const { tmpl } = params;
  try {
    const dateISO = budgetController.getSelectedDate();
    const payload = buildPayloadFromTemplate(tmpl, dateISO, () => null);

    const templateProviders = payload.proveedores || [];

    if (providers.value.length > 0 && templateProviders.length > 0) {
      conflictMessage.value = `Ya hay ${providers.value.length} proveedor(es) registrado(s) para esta fecha. El template tiene ${templateProviders.length} proveedor(es). ¿Deseas combinar o sobrescribir?`;
      pendingTemplate.value = tmpl;
      pendingProviders.value = templateProviders;
      showConflictModal.value = true;
    } else {
      applyProviders({ providers: templateProviders });
      showTemplatesModal.value = false;
    }
  } catch (e) {
    console.error('checkTemplateConflict error', e);
    showTemplatesModal.value = false;
  }
}

function applyProviders(params: {
  providers: Array<{
    name: string;
    estimated: number;
    accountId?: string | number;
  }>;
}) {
  const { providers } = params;
  providers.forEach((p) => {
    budgetController.addProvider({
      name: p.name,
      estimated: p.estimated,
      accountId: p.accountId,
    });
  });
  budgetController.saveData();
}

function handleCombine() {
  if (pendingProviders.value.length > 0) {
    applyProviders({ providers: pendingProviders.value });
  }
  showConflictModal.value = false;
  pendingTemplate.value = null;
  pendingProviders.value = [];
  showTemplatesModal.value = false;
}

function handleOverwrite() {
  budgetController.clearAllProviders();
  if (pendingProviders.value.length > 0) {
    applyProviders({ providers: pendingProviders.value });
  }
  showConflictModal.value = false;
  pendingTemplate.value = null;
  pendingProviders.value = [];
  showTemplatesModal.value = false;
}

async function createQuickAccount(params: { name: string; initialBalance: number }) {
  const { name, initialBalance } = params;
  const newAccount = await accountsCtrl.addAccount({
    a: {
      name,
      initialBalance,
    },
  });
}
// End Functions
</script>
