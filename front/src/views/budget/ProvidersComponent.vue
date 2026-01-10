<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="4">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Proveedores</ion-label>

            <ion-button @click="addEmptyProvider">
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>

            <ion-button @click="openTemplatesModal">
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

      <ion-col size="3">
        <ProvidersSummary />
      </ion-col>
    </ion-row>
  </ion-grid>

  <!-- modals -->
  <ion-modal
    :is-open="showTemplatesModal"
    :keep-contents-mounted="true"
    @did-dismiss="showTemplatesModal = false"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="showTemplatesModal = false">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Aplicar template</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1">
        <ion-list class="transparent">
          <template v-if="templatesList.length">
            <ion-item
              v-for="tmpl in templatesList"
              :key="tmpl.id"
              lines="full"
              button
              class="transparent"
              @click.stop="checkTemplateConflict(tmpl)"
            >
              <ion-label>
                <h2>{{ tmpl.name }}</h2>
                <p>{{ tmpl.description }}</p>
              </ion-label>
            </ion-item>
          </template>

          <template v-else>
            <ion-item>
              <ion-label>No hay templates</ion-label>
            </ion-item>
          </template>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-modal>

  <ion-modal
    :is-open="showNotesModal"
    :keep-contents-mounted="true"
    @did-dismiss="showNotesModal = false"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="showNotesModal = false">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Notas - {{ notesProvider?.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="saveNotes">Guardar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1">
        <ion-item lines="none">
          <ion-textarea
            v-model="notesContent"
            placeholder="Escribe las notas aquí..."
            auto-grow
            :rows="10"
          ></ion-textarea>
        </ion-item>
      </ion-card>
    </ion-content>
  </ion-modal>
  <!-- end modals -->

  <!-- alerts -->
  <ion-modal
    :is-open="showAddProviderModal"
    :keep-contents-mounted="true"
    @did-dismiss="showAddProviderModal = false"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="showAddProviderModal = false">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ editingProviderId ? 'Editar Proveedor' : 'Agregar Proveedor' }}</ion-title>
        <ion-buttons slot="end" v-if="editingProviderId">
          <ion-button @click="deleteCurrentProvider" color="danger">
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="!selectedProvider">
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Buscar proveedor"
          class="ion-no-padding"
        ></ion-searchbar>
        <ion-list class="transparent">
          <ion-item
            v-for="p in filteredProviders"
            :key="p.id"
            lines="full"
            button
            class="transparent"
            @click="selectProvider(p)"
          >
            <ion-label>{{ p.name }}</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <div v-else class="ion-padding">
        <ion-item lines="none">
          <ion-label>
            <h2>Proveedor</h2>
            <p>{{ selectedProvider.name }}</p>
          </ion-label>
          <ion-button @click="changeProvider" fill="outline" size="small">
            Cambiar
          </ion-button>
        </ion-item>

        <ion-segment v-model="selectedSegment" class="ion-margin-top">
          <ion-segment-button value="inicio">
            <ion-label>Inicio</ion-label>
          </ion-segment-button>
          <ion-segment-button value="productos">
            <ion-label>Productos</ion-label>
          </ion-segment-button>
        </ion-segment>

        <div v-if="selectedSegment === 'inicio'" class="ion-margin-top">
          <ion-list class="transparent">
            <ion-list-header>
              <ion-label>Cantidades por Cuenta</ion-label>
              <ion-button @click="addProviderItem" :disabled="!canAddMoreItems">
                <ion-icon :icon="addOutline"></ion-icon>
                Agregar
              </ion-button>
            </ion-list-header>

            <div class="list-content">
              <ion-card
                v-for="(item, index) in providerItems"
                :key="index"
                class="shadow2"
              >
                <ion-item class="transparent">
                  <ion-label position="stacked">Cantidad</ion-label>
                  <ion-input
                    v-model.number="item.amount"
                    type="number"
                    placeholder="0"
                  ></ion-input>
                </ion-item>

                <ion-item class="transparent">
                  <ion-select
                    v-model="item.accountId"
                    label="Cuenta"
                    label-placement="stacked"
                    interface="popover"
                    :compare-with="compareAccounts"
                  >
                    <ion-select-option
                      v-for="acc in availableAccountsForItem(index)"
                      :key="acc.id"
                      :value="acc"
                    >
                      {{ acc.name }} ({{ acc.type }})
                    </ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item class="transparent" lines="none" v-if="providerItems.length > 1">
                  <ion-button
                    slot="end"
                    fill="clear"
                    color="danger"
                    @click="removeProviderItem(index)"
                  >
                    <ion-icon :icon="trashOutline"></ion-icon>
                  </ion-button>
                </ion-item>
              </ion-card>
            </div>
          </ion-list>

          <ion-item v-if="hasProductsWithQuantity" lines="none" class="warning-item">
            <ion-icon :icon="warningOutline" slot="start" color="warning"></ion-icon>
            <ion-label color="warning">
              <h3>Productos: {{ formatPrice(productsTotal) }}</h3>
              <p v-if="productsCoverage.falta > 0">
                Faltante: {{ formatPrice(productsCoverage.falta) }}
              </p>
              <p v-else>
                Cubierto
              </p>
            </ion-label>
          </ion-item>
        </div>

        <div v-else class="ion-margin-top">
          <template v-if="selectedProvider.products && selectedProvider.products.length">
            <ion-item
              v-for="product in selectedProvider.products"
              :key="product.name"
              lines="inset"
            >
              <ion-label>
                <h3>{{ product.name }}</h3>
                <p>{{ formatPrice(product.price) }}</p>
              </ion-label>
              <ion-input
                type="number"
                placeholder="0"
                :value="productQuantities[product.name]"
                @ion-input="productQuantities[product.name] = Number($event.detail.value)"
                slot="end"
                style="width: 80px; text-align: end;"
              ></ion-input>
            </ion-item>
          </template>
          <template v-else>
            <ion-item lines="none">
              <ion-label>Este proveedor no tiene productos</ion-label>
            </ion-item>
          </template>
        </div>

        <ion-button
          expand="block"
          @click="saveNewProvider"
          class="ion-margin-top"
          :disabled="!isFormValid || (hasProductsWithQuantity && productsCoverage.falta > 0)"
        >
          Guardar
        </ion-button>
      </div>
    </ion-content>
  </ion-modal>

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
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCard,
  IonTextarea,
  IonSearchbar,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonThumbnail,
  onIonViewWillEnter,
} from '@ionic/vue';
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { addOutline, documentOutline, closeOutline, trashOutline, warningOutline } from 'ionicons/icons';

import ProviderCardComponent from './ProviderCardComponent.vue';
import ProvidersSummary from './components/ProvidersSummary.vue';
import budgetController from '@/controllers/budgetController';
import TemplateController from '@/controllers/TempalteController';
import { buildPayloadFromTemplate } from '@/controllers/templateService';
import suppliersController from '@/controllers/suppliersController';
import accountsController from '@/controllers/accountsController';
import { useBudgetStore } from '@/stores/budgetStore';
import { useSuppliersStore } from '@/stores/suppliersStore';

const budgetStore = useBudgetStore();

const showAddProviderModal = ref(false);
const searchQuery = ref('');
const allSuppliers = computed(() => suppliersController.getSuppliers());
const allAccounts = ref<any[]>([]);
const selectedProvider = ref<any>(null);
const providerItems = ref<any[]>([{ amount: 0, accountId: null }]);
const selectedSegment = ref('inicio');
const productQuantities = ref<Record<string, number>>({});

// Computed for reactive providers list
const providers = computed(() => budgetStore.providers);
const providerIdsWithEntries = computed(() => budgetStore.providerIdsWithEntries);
const editingProviderId = ref<string | number | null>(null);
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

const filteredProviders = computed(() => {
  if (!searchQuery.value) return allSuppliers.value;
  return allSuppliers.value.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const productsTotal = computed(() => {
  if (!selectedProvider.value?.products) return 0;
  return selectedProvider.value.products.reduce((sum: number, product: any) => {
    const qty = productQuantities.value[product.name] || 0;
    return sum + (qty * (product.price || 0));
  }, 0);
});

const hasProductsWithQuantity = computed(() => {
  if (!selectedProvider.value?.products) return false;
  return selectedProvider.value.products.some((product: any) => {
    return (productQuantities.value[product.name] || 0) > 0;
  });
});

const productsCoverage = computed(() => {
  const totalEntered = providerItems.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return {
    falta: productsTotal.value - totalEntered,
    total: productsTotal.value,
    entered: totalEntered,
  };
});

const canAddMoreItems = computed(() => {
  return providerItems.value.length < allAccounts.value.length;
});

const getDefaultAccountId = () => {
  const accounts = allAccounts.value;
  return accounts.length > 0 ? accounts[0] : null;
};

const availableAccountsForItem = (currentIndex: number) => {
  const usedAccountIds = providerItems.value
    .filter((_: any, idx: number) => idx !== currentIndex)
    .map((item: any) => String(item.accountId?.id ?? item.accountId))
    .filter((id: string) => id !== 'null' && id !== 'undefined' && id !== '' && id !== 'undefined');
  return allAccounts.value.filter(
    (acc: any) => !usedAccountIds.includes(String(acc.id))
  );
};

const isItemsValid = computed(() => {
  return providerItems.value.every(
    (item) => Number(item.amount) > 0 && item.accountId != null
  );
});

const isFormValid = computed(() => {
  return selectedProvider.value != null && isItemsValid.value;
});

async function loadSuppliers() {
  const list = await suppliersController.listSuppliers();
  allSuppliers.value = list || [];
  const budgetStore = useBudgetStore();
  budgetStore.syncProvidersWithSuppliers(list || []);
}

async function loadAccounts() {
  const list = accountsController.getAccounts();
  allAccounts.value = list || [];
}

onMounted(async () => {
  await loadSuppliers();
  loadAccounts();
  
  const suppliersStore = useSuppliersStore();
  unsubscribeFromSuppliers = suppliersStore.subscribeToChanges((suppliers) => {
    console.log('[Suppliers Change] Received update, suppliers count:', suppliers.length);
    const budgetStore = useBudgetStore();
    budgetStore.syncProvidersWithSuppliers(suppliers);
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
  editingProviderId.value = null;
  selectedProvider.value = null;
  providerItems.value = [{ amount: 0, accountId: getDefaultAccountId() }];
  selectedSegment.value = 'inicio';
  productQuantities.value = {};
  searchQuery.value = '';
  void loadSuppliers();
  showAddProviderModal.value = true;
}

async function openEditProviderModal(payload: { provider: any }) {
  console.log('openEditProviderModal - payload:', payload);
  const provider = payload.provider;
  console.log('openEditProviderModal - provider:', provider);
  editingProviderId.value = provider.id;
  console.log('openEditProviderModal - editingProviderId:', editingProviderId.value);
  
  let fullSupplier: any = null;
  const supplierId = provider._supplierId || provider._supplierKey;
  
  console.log('Recargando suppliers para obtener datos actualizados...');
  await loadSuppliers();
  
  if (supplierId) {
    fullSupplier = allSuppliers.value.find((s: any) => String(s.id) === String(supplierId));
  } else {
    console.log('No tiene _supplierId, buscando por nombre:', provider.name);
    fullSupplier = allSuppliers.value.find((s: any) => 
      s.name && provider.name && s.name.toLowerCase() === provider.name.toLowerCase()
    );
    console.log('openEditProviderModal - fullSupplier by name:', fullSupplier);
  }
  
  console.log('openEditProviderModal - fullSupplier:', fullSupplier);
  console.log('openEditProviderModal - products:', fullSupplier?.products);
  
  selectedProvider.value = fullSupplier || { id: supplierId, name: provider._supplierName || provider.name, products: [] };
  console.log('openEditProviderModal - selectedProvider:', selectedProvider.value);
  providerItems.value = [{ amount: provider.estimated || 0, accountId: provider.accountId ? { id: provider.accountId } : getDefaultAccountId() }];
  console.log('openEditProviderModal - providerItems:', providerItems.value);
  selectedSegment.value = 'inicio';
  productQuantities.value = {};
  searchQuery.value = '';
  showAddProviderModal.value = true;
}

function addProviderItem() {
  if (canAddMoreItems.value) {
    providerItems.value.push({ amount: 0, accountId: getDefaultAccountId() });
  }
}

function removeProviderItem(index: number) {
  if (providerItems.value.length > 1) {
    providerItems.value.splice(index, 1);
  }
}

function selectProvider(provider: any) {
  selectedProvider.value = provider;
}

function changeProvider() {
  selectedProvider.value = null;
  selectedSegment.value = 'inicio';
  productQuantities.value = {};
}

function compareAccounts(o1: any, o2: any) {
  return o1 && o2 && o1.id === o2.id;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(price || 0);
}

function saveNewProvider() {
  console.log('saveNewProvider - editingProviderId:', editingProviderId.value);
  console.log('saveNewProvider - providerItems:', providerItems.value);
  
  const totalAmount = providerItems.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const firstItem = providerItems.value[0];
  const firstAccount = firstItem?.accountId;

  if (editingProviderId.value !== null && editingProviderId.value !== undefined) {
    console.log('saveNewProvider - updating provider:', editingProviderId.value);
    budgetController.updateProvider(editingProviderId.value, {
      estimated: totalAmount,
      accountId: firstAccount ? firstAccount.id : 0,
      _supplierId: selectedProvider.value?.id,
      _supplierName: selectedProvider.value?.name,
    });
  } else {
    console.log('saveNewProvider - adding new provider');
    budgetController.addProvider({
      name: selectedProvider.value?.name || '',
      estimated: totalAmount,
      accountId: firstAccount ? firstAccount.id : 0,
      allowEmpty: true,
      _supplierId: selectedProvider.value?.id,
      _supplierName: selectedProvider.value?.name,
    });
  }
  budgetController.saveData();
  showAddProviderModal.value = false;
}

function deleteCurrentProvider() {
  if (editingProviderId.value) {
    budgetController.removeProvider(editingProviderId.value);
    budgetController.saveData();
    showAddProviderModal.value = false;
  }
}

const deleteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '' as string,
});

function addEmptyProvider() {
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
    budgetController.updateProvider(notesProvider.value.id, { notes: notesContent.value });
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
