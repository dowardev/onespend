<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="4" size-lg="6" size-xl="4">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Proveedores</ion-label>

            <ion-button
              :disabled="budgetStore.isDayClosed"
              @click="addEmptyProvider"
            >
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>

            <ion-button
              :disabled="budgetStore.isDayClosed"
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
                :is-closed="budgetStore.isDayClosed"
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

import ProviderCardComponent from './ProviderCardComponent.vue';
import ProvidersSummary from './components/ProvidersSummary.vue';
import EditProviderModal from './components/EditProviderModal.vue';
import TemplatesModal from './components/TemplatesModal.vue';
import NotesModal from './components/NotesModal.vue';
import budgetController from '@/controllers/budgetController';
import TemplateController from '@/controllers/TempalteController';
import { buildPayloadFromTemplate } from '@/controllers/templateService';
import suppliersController from '@/controllers/suppliersController';
import accountsController from '@/controllers/accountsController';
import { useBudgetStore } from '@/stores/budgetStore';
import { useSuppliersStore } from '@/stores/suppliersStore';

const budgetStore = useBudgetStore();

const showAddProviderModal = ref(false);
const allSuppliers = computed(() => suppliersController.getSuppliers());
const allAccounts = ref<any[]>([]);

// Computed for reactive providers list
const providers = computed(() => {
  if (budgetStore.isDayClosed && budgetStore.frozenSnapshot) {
    return budgetStore.frozenSnapshot.providers;
  }
  return budgetStore.providers;
});
const providerIdsWithEntries = computed(() => {
  if (budgetStore.isDayClosed && budgetStore.frozenSnapshot) {
    return new Set(budgetStore.frozenSnapshot.providers.map(p => p.id));
  }
  return budgetStore.providerIdsWithEntries;
});
const editingProvider = ref<any>(null);
const showTemplatesModal = ref(false);
const showConflictModal = ref(false);
const showNotesModal = ref(false);
const notesProvider = ref<any>(null);
const notesContent = ref('');
const conflictMessage = ref('');
const templatesList = ref<any[]>([]);
const pendingTemplate = ref<any>(null);
const pendingProviders = ref<any[]>([]);
let unsubscribeFromSuppliers: (() => void) | null = null;

async function loadSuppliers() {
  const list = await suppliersController.listSuppliers();
  // allSuppliers is a computed that reads from suppliersController.getSuppliers()
  // so we just need to trigger the reload
  const budgetStore = useBudgetStore();
  budgetStore.syncProvidersWithSuppliers((list || []) as any);
}

async function loadAccounts() {
  const list = accountsController.getAccounts();
  allAccounts.value = list || [];
}

onMounted(async () => {
  await loadSuppliers();
  loadAccounts();

  const suppliersStore = useSuppliersStore();
  unsubscribeFromSuppliers = suppliersStore.subscribeToChanges(suppliers => {
    if (budgetStore.isDayClosed) {
      console.log('[Suppliers Change] Day is closed, ignoring supplier update');
      return;
    }
    console.log(
      '[Suppliers Change] Received update, suppliers count:',
      suppliers.length
    );
    const budgetStore = useBudgetStore();
    budgetStore.syncProvidersWithSuppliers(suppliers as any);
  });
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

function openAddProviderModal() {
  editingProvider.value = null;
  void loadSuppliers();
  showAddProviderModal.value = true;
}

async function openEditProviderModal(payload: { provider: any }) {
  console.log('openEditProviderModal - payload:', payload);
  const provider = payload.provider;

  await loadSuppliers();

  // Find full supplier data
  let fullSupplier: any = null;
  const supplierId = provider._supplierId || provider._supplierKey;

  if (supplierId) {
    fullSupplier = allSuppliers.value.find(
      (s: any) => String(s.id) === String(supplierId)
    );
  } else {
    fullSupplier = allSuppliers.value.find(
      (s: any) =>
        s.name &&
        provider.name &&
        s.name.toLowerCase() === provider.name.toLowerCase()
    );
  }

  editingProvider.value = {
    id: provider.id,
    name: provider.name,
    estimated: provider.estimated || 0,
    accountId: provider.accountId,
    _supplierId: supplierId || fullSupplier?.id,
    _supplierName: provider._supplierName || provider.name,
    products: fullSupplier?.products || [],
  };

  showAddProviderModal.value = true;
}

function handleProviderSaved(payload: {
  providerId?: string | number;
  providerName?: string;
  items: Array<{ amount: number; accountId: any }>;
  totalAmount: number;
}) {
  const firstItem = payload.items[0];
  const firstAccountId = firstItem?.accountId;

  if (editingProvider.value?.id) {
    // Updating existing provider
    budgetController.updateProvider(editingProvider.value.id, {
      estimated: payload.totalAmount,
      accountId: firstAccountId || 0,
      _supplierId: payload.providerId,
      _supplierName: payload.providerName,
    });
  } else {
    // Adding new provider
    budgetController.addProvider({
      name: payload.providerName || '',
      estimated: payload.totalAmount,
      accountId: firstAccountId || 0,
      allowEmpty: true,
      _supplierId: payload.providerId,
      _supplierName: payload.providerName,
    });
  }
  budgetController.saveData();
  showAddProviderModal.value = false;
  editingProvider.value = null;
}

function handleProviderDeleted(id: string | number) {
  // Eliminar los egresos vinculados a este proveedor (de budget.inicio)
  budgetController.removeEgresosGroup(id);
  // Eliminar el proveedor de la lista de proveedores (de budget.providers)
  budgetController.removeProvider(id);
  budgetController.saveData();
  showAddProviderModal.value = false;
  editingProvider.value = null;
}

const deleteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '' as string,
});

function addEmptyProvider() {
  if (budgetStore.isDayClosed) return;
  openAddProviderModal();
}

function handleUpdateProvider(payload: {
  id: string | number;
  field: string;
  value: any;
}) {
  const { id, field, value } = payload;
  budgetController.updateProvider(id, { [field]: value });
  budgetController.saveData();
}

function confirmRemoveProveedor(
  payload: { id?: string | number; name?: string } | any
) {
  const id =
    payload && (payload as any).id !== undefined
      ? (payload as any).id
      : (payload as any);
  const name =
    payload && (payload as any).name !== undefined
      ? (payload as any).name
      : (payload as any)?.name || '';
  deleteConfirm.providerId = id;
  deleteConfirm.providerName = name || '';
  deleteConfirm.open = true;
}

function removeProveedorConfirmed() {
  const pid = deleteConfirm.providerId;
  deleteConfirm.open = false;
  if (pid != null) {
    // Eliminar los egresos vinculados a este proveedor (de budget.inicio)
    budgetController.removeEgresosGroup(pid);
    // Eliminar el proveedor de la lista de proveedores (de budget.providers)
    budgetController.removeProvider(pid);
    budgetController.saveData();
  }
  deleteConfirm.providerId = null;
  deleteConfirm.providerName = '';
}

function handleOpenNotesModal(payload: { provider: any }) {
  const { provider } = payload;
  notesProvider.value = provider;
  notesContent.value = provider?.notes || '';
  showNotesModal.value = true;
}

function saveNotes() {
  if (notesProvider.value) {
    budgetController.updateProvider(notesProvider.value.id, {
      notes: notesContent.value,
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

async function checkTemplateConflict(tmpl: any) {
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
      applyProviders(templateProviders);
      showTemplatesModal.value = false;
    }
  } catch (e) {
    console.error('checkTemplateConflict error', e);
    showTemplatesModal.value = false;
  }
}

function applyProviders(providers: any[]) {
  providers.forEach((p: any) => {
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
    applyProviders(pendingProviders.value);
  }
  showConflictModal.value = false;
  pendingTemplate.value = null;
  pendingProviders.value = [];
  showTemplatesModal.value = false;
}

function handleOverwrite() {
  budgetController.clearAllProviders();
  if (pendingProviders.value.length > 0) {
    applyProviders(pendingProviders.value);
  }
  showConflictModal.value = false;
  pendingTemplate.value = null;
  pendingProviders.value = [];
  showTemplatesModal.value = false;
}
</script>

<style scoped>
.warning-item {
  margin-top: 8px;
  border: 1px solid var(--ion-color-warning);
  border-radius: 8px;
}
</style>
