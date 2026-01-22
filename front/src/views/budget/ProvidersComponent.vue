<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="4" size-lg="6" size-xl="4">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Proveedores</ion-label>

            <ion-button
              :disabled="isDayClosed"
              @click="addEmptyProvider"
            >
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>

            <ion-button
              :disabled="isDayClosed"
              @click="openTemplatesModal"
            >
              <ion-icon :icon="documentOutline"></ion-icon>
            </ion-button>
          </ion-list-header>

          <div class="list-content">
            <template v-if="providers.length">
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
                @open-edit-modal="openEditProviderModal"
              />
            </template>

            <template v-else>
              <ion-item lines="none">
                <ion-label
                  >No hay proveedores para la fecha seleccionada. Pulsa "+" para
                  agregar uno.</ion-label
                >
              </ion-item>
            </template>
          </div>
        </ion-list>
      </ion-col>

      <ion-col size="3" size-lg="6" size-xl="4">
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

  <!-- Edit/Add Provider Modal -->
  <EditProviderModal
    :is-open="showAddProviderModal"
    :provider="editingProvider"
    :suppliers="allSuppliers"
    :accounts="allAccounts"
    mode="provider"
    @dismiss="showAddProviderModal = false"
    @saved="handleProviderSaved"
    @deleted="handleProviderDeleted"
  />

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
  IonCard,
  IonButtons,
  IonContent,
  onIonViewWillEnter,
} from '@ionic/vue';
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import {
  addOutline,
  documentOutline,
  trashOutline,
} from 'ionicons/icons';
// End Imports

// Controllers
import budgetController from '@/controllers/budgetController';
import { BudgetController } from '@/controllers/budgetController';
import TemplateController from '@/controllers/TempalteController';
import { TemplateRecord } from '@/controllers/TempalteController';
import { buildPayloadFromTemplate } from '@/controllers/templateService';
import suppliersController from '@/controllers/suppliersController';
import { SuppliersController } from '@/controllers/suppliersController';
import accountsController from '@/controllers/accountsController';
import { AccountsController } from '@/controllers/accountsController';
import { SyncController } from '@/controllers/syncController';
import type { Supplier } from '@/controllers/suppliersController';
import type { ProviderData, ProviderProduct } from './components/EditProviderModal.vue';
// End Controllers

// Components
import ProviderCardComponent from './ProviderCardComponent.vue';
import ProvidersSummary from './components/ProvidersSummary.vue';
import EditProviderModal from './components/EditProviderModal.vue';
import TemplatesModal from './components/TemplatesModal.vue';
import NotesModal from './components/NotesModal.vue';
// End Components

// Vars
const budgetCtrl = new BudgetController();
const suppliersCtrl = new SuppliersController();
const accountsCtrl = new AccountsController();
const syncCtrl = new SyncController();

const showAddProviderModal = ref(false);
const allSuppliers = computed(() => suppliersCtrl.getSuppliers());
const allAccounts = ref<Array<{ id: string | number; name: string }>>([]);
const editingProvider = ref<ProviderData | null>(null);
const showTemplatesModal = ref(false);
const showConflictModal = ref(false);
const showNotesModal = ref(false);
const notesProvider = ref<ProviderData | null>(null);
const notesContent = ref('');
const conflictMessage = ref('');
const templatesList = ref<Array<TemplateRecord>>([]);
const pendingTemplate = ref<TemplateRecord | null>(null);
const pendingProviders = ref<Array<{ name: string; estimated: number }>>([]);
let unsubscribeFromSuppliers: (() => void) | null = null;

const deleteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '' as string,
});

// End Vars

// Computed
const isDayClosed = computed(() => budgetCtrl.getIsDayClosed());
const frozenSnapshot = computed(() => budgetCtrl.getFrozenSnapshot());
const providers = computed(() => {
  if (isDayClosed.value && frozenSnapshot.value) {
    return frozenSnapshot.value.providers;
  }
  return budgetCtrl.getProviders();
});
const providerIdsWithEntries = computed(() => {
  if (isDayClosed.value && frozenSnapshot.value) {
    return new Set(frozenSnapshot.value.providers.map(p => p.id));
  }
  return budgetCtrl.getProviderIdsWithEntries();
});

// End Computed

// Life cycle
onMounted(async () => {
  await loadSuppliers();
  loadAccounts();

  unsubscribeFromSuppliers = suppliersCtrl.subscribeToChanges({ callback: (suppliers: Array<Supplier>) => {
    if (isDayClosed.value) {
      console.log('[Suppliers Change] Day is closed, ignoring supplier update');
      return;
    }
    console.log(
      '[Suppliers Change] Received update, suppliers count:',
      suppliers.length
    );
    budgetCtrl.syncProvidersWithSuppliers({ suppliers });
  } });
});

onUnmounted(() => {
  if (unsubscribeFromSuppliers) {
    unsubscribeFromSuppliers();
    unsubscribeFromSuppliers = null;
  }
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

async function forceSyncSuppliers() {
  console.log('forceSyncSuppliers - Starting sync...');
  const result = await syncCtrl.processQueue();
  if (result) {
    console.log('forceSyncSuppliers - Sync completed:', result);
  }
  await loadSuppliers();
}

async function loadAccounts() {
  const list = accountsCtrl.getAccounts();
  allAccounts.value = list || [];
}

function openAddProviderModal() {
  editingProvider.value = null;
  void forceSyncSuppliers();
  showAddProviderModal.value = true;
}

async function openEditProviderModal(params: { provider: ProviderData }) {
  const { provider } = params;
  console.log('openEditProviderModal - payload:', provider);
  const providerData = provider;

  await forceSyncSuppliers();

  let fullSupplier: Supplier | null = null;
  const supplierSyncId = providerData._supplierId || providerData._supplierKey;

  if (supplierSyncId) {
    fullSupplier =
      allSuppliers.value.find(
        (s: Supplier) => String(s.sync_id) === String(supplierSyncId)
      ) ||
      allSuppliers.value.find(
        (s: Supplier) => String(s.id) === String(supplierSyncId)
      );
  } else {
    fullSupplier = allSuppliers.value.find(
      (s: Supplier) =>
        s.name &&
        providerData.name &&
        s.name.toLowerCase() === providerData.name.toLowerCase()
    );
  }

  editingProvider.value = {
    id: providerData.id,
    name: providerData.name,
    estimated: providerData.estimated || 0,
    accountId: providerData.accountId,
    _supplierId: fullSupplier?.sync_id || supplierSyncId || fullSupplier?.id,
    _supplierName: providerData._supplierName || providerData.name,
    products: fullSupplier?.products || [],
  };

  showAddProviderModal.value = true;
}

function handleProviderSaved(payload: {
  providerId?: string | number;
  providerName?: string;
  items: Array<{ amount: number; accountId: string | number | null }>;
  totalAmount: number;
  products?: Array<ProviderProduct>;
}) {
  console.log('ProvidersComponent.handleProviderSaved - payload:', payload);
  const firstItem = payload.items[0];
  const firstAccountId = firstItem?.accountId;

  if (editingProvider.value?.id) {
    budgetController.updateProvider({
      id: editingProvider.value.id,
      changes: {
        estimated: payload.totalAmount,
        accountId: firstAccountId || 0,
        _supplierId: payload.providerId,
        _supplierName: payload.providerName,
        products: payload.products,
      },
    });
  } else {
    budgetController.addProvider({
      name: payload.providerName || '',
      estimated: payload.totalAmount,
      accountId: firstAccountId || 0,
      allowEmpty: true,
      _supplierId: payload.providerId,
      _supplierName: payload.providerName,
      products: payload.products,
    });
  }
  budgetController.saveData();
  showAddProviderModal.value = false;
  editingProvider.value = null;
}

function handleProviderDeleted(params: { id: string | number }) {
  const { id } = params;
  budgetController.removeEgresosGroup({ groupId: id });
  budgetController.removeProvider({ id });
  budgetController.saveData();
  showAddProviderModal.value = false;
  editingProvider.value = null;
}

function addEmptyProvider() {
  if (isDayClosed.value) return;
  openAddProviderModal();
}

function handleUpdateProvider(payload: {
  id: string | number;
  field: string;
  value: unknown;
}) {
  const { id, field, value } = payload;
  budgetController.updateProvider({ id, changes: { [field]: value } });
  budgetController.saveData();
}

function confirmRemoveProveedor(
  payload: { id?: string | number; name?: string } | string | number
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
    budgetController.removeEgresosGroup({ groupId: pid });
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
    budgetController.updateProvider({ id: notesProvider.value.id, changes: { notes: notesContent.value } });
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

function applyProviders(params: { providers: Array<{ name: string; estimated: number; accountId?: string | number }> }) {
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
// End Functions
</script>

<style scoped>
.warning-item {
  margin-top: 8px;
  border: 1px solid var(--ion-color-warning);
  border-radius: 8px;
}
</style>
