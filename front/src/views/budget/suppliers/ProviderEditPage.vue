<template>
  <ion-page>
    <EditPageHeader
      :title="pageTitle"
      :is-save-disabled="!isFormValid || (!isEntryMode && hasProductsWithQuantity && productsCoverage.falta > 0)"
      show-options-button
      @back="handleBack"
      @save="handleSave"
      @options="openHeaderPopover({ e: $event })"
    />
    <!-- end header -->

    <!-- content -->
    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="4">
            <!-- Provider form -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-card class="shadow1">
                <ion-item class="transparent" button lines="full" @click="showProviderModal = true">
                  <ion-label class="truncate">
                    Proveedor
                    <p class="truncate">
                      {{ providerName || 'Seleccionar proveedor' }}
                    </p>
                  </ion-label>
                </ion-item>

                <ion-item
                  class="transparent"
                  button
                  lines="full"
                  :disabled="!selectedProvider"
                  @click="openReassignFromMenu({ e: $event })"
                >
                  <ion-label>Fecha</ion-label>
                  <ion-label slot="end">{{ toShortDate({ isoDate: reassignPicker.dateISO.value }) }}</ion-label>
                </ion-item>
              </ion-card>
            </ion-list>

            <!-- Products section  -->
            <ion-list v-if="selectedProvider" class="ion-padding-start ion-padding-end">
              <ion-list-header>
                <ion-label>Productos</ion-label>

                <ion-button @click="addTemporaryProduct()">
                  <ion-icon slot="start" :icon="addOutline" />
                </ion-button>
              </ion-list-header>

              <ion-card class="shadow1">
                <ion-item
                  v-for="product in selectedProvider.products"
                  :key="'cat_' + (product.sync_id ?? product.id ?? product.name)"
                  lines="full"
                  class="transparent"
                >
                  <ion-label>
                    {{ product.name }}
                    <p>{{ formatPrice({ price: product.price }) }}</p>
                  </ion-label>

                  <ion-input
                    slot="end"
                    type="number"
                    placeholder="0"
                    :value="getProductQuantity({ product })"
                    style="width: 80px; text-align: end"
                    :class="{
                      'ion-invalid': isProductQuantityInvalid({
                        productId: product.id,
                      }),
                      'ion-touched': isProductQuantityTouched({
                        productId: product.id,
                      }),
                    }"
                    :error-text="getProductQuantityError({ productId: product.id })"
                    @ion-input="
                      (e) => {
                        setProductRawValue({
                          productId: product.id,
                          value: e.detail.value || '',
                        });
                        setProductQuantity({
                          product,
                          productPrice: product.price,
                          quantity: e.detail.value,
                        });
                      }
                    "
                  ></ion-input>
                </ion-item>

                <ion-item
                  v-for="(product, index) in providerProducts.filter((p) => p.isTemporary)"
                  :key="'temp_' + index"
                  lines="full"
                  class="transparent"
                >
                  <ion-input
                    placeholder="Nombre"
                    :value="product.productName"
                    style="flex: 1; --padding-start: 0"
                    @ion-input="
                      (e) => {
                        updateTemporaryProduct({
                          index: providerProducts.indexOf(product),
                          field: 'productName',
                          value: e.detail.value || '',
                        });
                      }
                    "
                  ></ion-input>
                  <ion-input
                    type="number"
                    placeholder="Precio"
                    :value="product.productPrice || ''"
                    style="width: 90px; text-align: end"
                    @ion-input="
                      (e) => {
                        updateTemporaryProduct({
                          index: providerProducts.indexOf(product),
                          field: 'productPrice',
                          value: e.detail.value || '0',
                        });
                      }
                    "
                  ></ion-input>
                  <ion-input
                    type="number"
                    placeholder="Cant"
                    :value="product.quantity || ''"
                    style="width: 65px; text-align: end"
                    @ion-input="
                      (e) => {
                        updateTemporaryProduct({
                          index: providerProducts.indexOf(product),
                          field: 'quantity',
                          value: e.detail.value || '0',
                        });
                      }
                    "
                  ></ion-input>
                  <ion-button
                    slot="end"
                    fill="clear"
                    color="danger"
                    size="small"
                    @click="
                      removeTemporaryProduct({
                        index: providerProducts.indexOf(product),
                      })
                    "
                  >
                    <ion-icon slot="icon-only" :icon="trashOutline" />
                  </ion-button>
                </ion-item>
              </ion-card>
            </ion-list>

            <!-- Products coverage summary (shown when any product has quantity > 0) -->
            <template v-if="!isEntryMode && hasProductsWithQuantity">
              <div class="ion-padding-start ion-padding-end">
                <ion-card
                  class="shadow1 no-shadow"
                  :class="
                    productsCoverage.falta > 0 ? 'coverage-card-warning' : 'coverage-card-success'
                  "
                >
                  <ion-item lines="none">
                    <ion-icon
                      slot="start"
                      :icon="productsCoverage.falta > 0 ? warningOutline : checkmarkCircleOutline"
                      :color="productsCoverage.falta > 0 ? 'warning' : 'success'"
                      style="font-size: 24px; margin-right: 12px"
                    ></ion-icon>
                    <ion-label>
                      <div class="coverage-info">
                        <span class="coverage-total">Total: {{ formatPrice(productsTotal) }}</span>
                        <span class="coverage-entered"
                          >Cubierto: {{ formatPrice(productsCoverage.entered) }}</span
                        >
                        <template v-if="productsCoverage.falta > 0">
                          <span class="coverage-shortage"
                            >Faltante: {{ formatPrice(productsCoverage.falta) }}</span
                          >
                        </template>
                        <template v-else>
                          <span class="coverage-covered">¡Cubierto!</span>
                        </template>
                      </div>
                      <div class="progress-container">
                        <div
                          class="progress-bar"
                          :style="{
                            width: `${Math.min(100, (productsCoverage.entered / productsTotal) * 100 || 0)}%`,
                            'background-color':
                              productsCoverage.falta > 0
                                ? 'var(--ion-color-warning)'
                                : 'var(--ion-color-success)',
                          }"
                        ></div>
                      </div>
                    </ion-label>
                  </ion-item>
                </ion-card>
              </div>
            </template>

            <!-- Items by account section -->
            <template v-if="selectedProvider && !isEntryMode">
              <div class="ion-padding-start ion-padding-end ion-margin-top">
                <AccountDistributionSection
                  :items="items"
                  header-label="Distribución por Cuenta"
                  header-subtitle="Distribuye el monto entre las cuentas"
                  :can-add-more="true"
                  :is-day-closed="false"
                  reverse-order
                  @add-item="handleAddItem"
                  @remove-item="removeItem"
                  @update-item-amount="updateItemAmount"
                >
                  <template #accountSelect="{ index }">
                    <ion-item lines="full" class="transparent" button @click="openAccountModal({ index })">
                      <ion-label>
                        Cuenta
                        <p>{{ getAccountName({ accountId: items[index].accountId }) || 'Seleccionar cuenta' }}</p>
                      </ion-label>
                    </ion-item>
                  </template>
                </AccountDistributionSection>
              </div>
            </template>
          </ion-col>
        </ion-row>

        <ion-row class="ion-justify-content-center">
          <ion-col size="4">
            <DetailsSection
              :notes="providerNotes"
              :show-attachments-modal="showAttachmentsModal"
              :pending-attachments="pendingAttachments"
              :existing-attachments="existingAttachments"
              list-class="ion-padding-start ion-padding-end"
              @update:notes="providerNotes = $event"
              @open-attachments="handleOpenAttachments"
              @dismiss-attachments="closeAttachmentsModal"
              @save-attachments="onAttachmentsSave"
            />
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
    <!-- end content -->

    <!-- Provider Selection Modal -->
    <ion-modal :is-open="showProviderModal" @will-dismiss="onProviderModalDismiss">
      <ion-header class="ion-no-border" mode="ios">
        <ion-toolbar>
          <ion-buttons>
            <ion-button @click="showProviderModal = false">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>

          <ion-title>Seleccionar Proveedor</ion-title>
        </ion-toolbar>

        <ion-toolbar>
          <div class="ion-padding-start ion-padding-end">
            <ion-searchbar
              v-model="searchQuery"
              mode="ios"
              placeholder="Buscar proveedor"
              class="ion-no-padding"
            ></ion-searchbar>
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-list class="transparent ion-padding-start ion-padding-end">
          <ion-card class="shadow1">
            <ion-item
              v-for="p in filteredProviders"
              :key="p.id"
              lines="full"
              button
              class="transparent"
              @click="
                selectProvider({ p });
                showProviderModal = false;
              "
            >
              <ion-label>{{ p.name }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-list>
      </ion-content>
    </ion-modal>

    <!-- Account Selection Modal -->
    <ion-modal :is-open="showAccountModal" @will-dismiss="onAccountModalDismiss">
      <ion-header class="ion-no-border" mode="ios">
        <ion-toolbar>
          <ion-buttons>
            <ion-button @click="showAccountModal = false">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>Seleccionar Cuenta</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="quickAccount.openQuickAccountAlert({})">
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-item lines="none">
          <ion-searchbar
            v-model="accountSearchQuery"
            mode="ios"
            placeholder="Buscar cuenta"
            class="ion-no-padding"
          ></ion-searchbar>
        </ion-item>

        <ion-list
          v-if="sortedAccounts.available.length || sortedAccounts.selected.length"
          class="transparent ion-padding-start ion-padding-end"
        >
          <ion-card class="shadow1">
            <ion-item
              v-for="acc in sortedAccounts.available"
              :key="'avail-' + acc.id"
              lines="full"
              button
              class="transparent"
              @click="selectAccount({ acc })"
            >
              <ion-label>{{ acc.name }}</ion-label>
              <ion-label slot="end">{{ acc.type || '' }}</ion-label>
            </ion-item>
            <ion-item
              v-for="acc in sortedAccounts.selected"
              :key="'sel-' + acc.id"
              lines="full"
              class="transparent"
              :disabled="true"
            >
              <ion-label>{{ acc.name }}</ion-label>
              <ion-note slot="end" color="medium">Seleccionada</ion-note>
            </ion-item>
          </ion-card>
        </ion-list>

        <div
          v-if="!sortedAccounts.available.length && !sortedAccounts.selected.length"
          class="ion-text-center ion-padding"
        >
          <ion-label color="medium"> Presiona '+' para agregar una nueva cuenta </ion-label>
        </div>
      </ion-content>
    </ion-modal>

    <!-- popovers -->
    <DatePickerPopover
      :popover-state="reassignPicker.popoverState"
      :show-picker="reassignPicker.showPicker.value"
      :temp-picker-date-iso="reassignPicker.tempPickerDateISO.value"
      :can-apply="reassignPicker.canApply.value"
      @did-dismiss="reassignPicker.closePopover()"
      @cancel="reassignPicker.closePopover()"
      @apply="applyReassignDate"
    />

    <ion-popover
      :is-open="popoverMenu.open"
      :event="popoverMenu.event"
      @did-dismiss="closeMenuPopover"
    >
      <ion-content>
        <ion-item lines="full" button @click="handleDeleteFromPopover">
          <ion-icon slot="start" color="danger" :icon="trashOutline"></ion-icon>

          <ion-label>Eliminar proveedor</ion-label>
        </ion-item>
      </ion-content>
    </ion-popover>

    <!-- end popovers -->

    <!-- alerts -->
    <DeleteConfirmAlert
      :is-open="deleteConfirm.showDeleteAlert.value"
      message="¿Estás seguro de que deseas eliminar este proveedor?"
      :buttons="deleteConfirm.deleteAlertButtons"
      @did-dismiss="deleteConfirm.showDeleteAlert.value = false"
    />

    <QuickAccountAlert
      :is-open="quickAccount.showQuickAccountAlert.value"
      :inputs="quickAccount.quickAccountInputs"
      :buttons="quickAccount.quickAccountButtons"
      @did-dismiss="quickAccount.showQuickAccountAlert.value = false"
    />

    <ion-alert
      :is-open="showCoverageAlert"
      header="Total cubierto"
      message="Ya has distribuido el monto total de los productos entre las cuentas existentes."
      :buttons="[{ text: 'Entendido', role: 'cancel' }]"
      @did-dismiss="showCoverageAlert = false"
    ></ion-alert>

    <ion-toast
      :is-open="showIncompleteGroupToast"
      message="Completa el grupo actual antes de agregar otro"
      :duration="2000"
      position="top"
      color="warning"
      @did-dismiss="showIncompleteGroupToast = false"
    ></ion-toast>
    <!-- end alerts -->

    <!-- attachments modal is inside DetailsSection -->
    <!-- end components -->
  </ion-page>
</template>

<script lang="ts" setup>
// imports
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSearchbar,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonInput,
  IonCard,
  IonPopover,
  IonAlert,
  IonModal,
  IonGrid,
  IonRow,
  IonCol,
  IonToast,
} from '@ionic/vue';
import {
  closeOutline,
  trashOutline,
  addOutline,
  warningOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { ref, computed, reactive, nextTick, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { format } from 'date-fns';
import { parseDateValue, toShortDate } from '@/utils/dateHelpers';
import { isNumericValue } from '@/utils/amountValidation';
import { useQuickAccount } from '@/composables/useQuickAccount';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import { useDatePicker } from '@/composables/useDatePicker';
import accountsController from '@/controllers/accountsController';
import { type Supplier, type Product } from '@/controllers/suppliersController';
import { type Account } from '@/controllers/accountsController';
import type { EntryGroup } from '@/utils/budgetTypes';

interface AccountWithId extends Account {
  id: string | number;
  type?: string;
}
// end imports

// controllers
// end controllers

// composables
import { useAttachments } from '@/composables/useAttachments';
// end composables

// components
import EditPageHeader from '@/views/budget/components/EditPageHeader.vue';
import AccountDistributionSection from '@/views/budget/components/AccountDistributionSection.vue';
import DetailsSection from '@/views/budget/components/DetailsSection.vue';
import DatePickerPopover from '@/views/budget/components/DatePickerPopover.vue';
import DeleteConfirmAlert from '@/views/budget/components/DeleteConfirmAlert.vue';
import QuickAccountAlert from '@/views/budget/components/QuickAccountAlert.vue';
// end components

// interface and types imports
export interface ProviderItem {
  amount: number;
  accountId: string | number | { id: string | number } | null;
}

export interface ProviderProduct {
  supplierProductId?: string | number | null;
  productName: string;
  productPrice: number;
  quantity: number;
  isTemporary?: boolean;
}

export interface PendingProduct {
  supplierProductId?: string | number;
  supplier_product_id?: string | number;
  sync_id?: string | number;
  id?: string | number;
  productName?: string;
  product_name?: string;
  name?: string;
  productPrice?: number;
  product_price?: number;
  price?: number;
  quantity?: number;
}

export interface ProviderData {
  id?: string | number;
  _supplierId?: string | number;
  _supplierName?: string;
  _supplier?: Supplier;
  name: string;
  estimated?: number;
  accountId?: string | number;
  products?: Array<PendingProduct>;
  items?: Array<ProviderItem>;
  notes?: string;
}

// Type aliases for external usage
export type ProviderEditData = ProviderData;

// Internal interfaces for selectProvider function
interface SelectProviderProduct {
  sync_id?: string | number;
  id?: string | number;
  supplierProductId?: string | number;
  name: string;
  price?: number;
  productPrice?: number;
  quantity?: number;
}

interface SelectProviderItem {
  amount?: number;
  accountId?: string | number | null;
}

interface SelectProviderData {
  products?: SelectProviderProduct[];
  items?: SelectProviderItem[];
  estimated?: number;
  accountId?: string | number | null;
  name?: string;
}
// end interface and types imports

// router
const router = useRouter();
const route = useRoute();
// end router

// main
// end main

// vars and const
const searchQuery = ref('');
const selectedProvider = ref<Supplier | null>(null);
const providerProducts = ref<ProviderProduct[]>([]);
const items = ref<
  Array<{
    amount: number | string;
    accountId: string | number | { id: string | number } | null;
  }>
>([{ amount: '', accountId: null }]);
const popoverMenu = reactive({ open: false, event: null as Event | null });

const productQuantityRawValues = ref<Map<string | number, string>>(new Map());
const temporaryProductCounter = ref(0);

const showProviderModal = ref(false);
const showAccountModal = ref(false);
const selectedAccountIndex = ref<number | null>(null);
const accountSearchQuery = ref('');
const showCoverageAlert = ref(false);
const showIncompleteGroupToast = ref(false);

// quick account and delete confirm moved to composables

// Data from route params
const routeEntryId = computed(() => route.query.entryId as string | number | undefined);
const routeProviderId = computed(() => route.query.providerId as string | number | undefined);

const isEntryMode = computed(() => route.query.mode === 'entry');
// Suppliers list
const allSuppliersList = ref<Supplier[]>([]);

// Attachment state
const providerSyncId = ref<string | null>(null);
const providerServerId = ref<number | null>(null);
const {
  showAttachmentsModal,
  pendingAttachments,
  existingAttachments,
  deletedAttachments: _deletedAttachments,
  openAttachments: handleOpenAttachments,
  handleAttachmentsSave,
  saveAttachments,
  deleteAllAttachments,
  dismissModal: closeAttachmentsModal,
} = useAttachments({ entityType: 'providers', syncId: providerSyncId });
// end attachment state

// composable instances
const quickAccount = useQuickAccount({
  onAccountCreated: ({ newAccount, targetIndex }) => {
    if (items.value[targetIndex]) {
      const accountIdValue = newAccount.id as string | number;
      items.value[targetIndex].accountId = isEntryMode.value ? accountIdValue : { id: accountIdValue };
    }
  },
});

const deleteConfirm = useDeleteConfirm({
  onConfirm: confirmDelete,
});

const reassignPicker = useDatePicker();
// end composable instances

// Notes state
const providerNotes = ref('');
// end notes state

// Compute accounts from controller
const accounts = computed(() => {
  const list = accountsController.getAccounts();
  return list ? JSON.parse(JSON.stringify(list)) : [];
});
// end vars and const

// onMounted - initialize form based on route params
onMounted(async () => {
  // Sync suppliers
  const { SuppliersController } = await import('@/controllers/suppliersController');
  const suppliersCtrl = new SuppliersController();
  const suppliers = await suppliersCtrl.listSuppliers();
  allSuppliersList.value = suppliers || [];

  if (isEntryMode.value && routeEntryId.value) {
    // Editing existing entry
    await initializeFromEntry();
  } else if (routeProviderId.value) {
    // Editing existing provider
    await initializeFromProvider();
  } else {
    // New provider
    await initializeNewProviderMode();
  }
});

async function initializeFromEntry() {
  const { default: budgetController } = await import('@/controllers/budgetController');
  const { SuppliersController } = await import('@/controllers/suppliersController');
  const suppliersCtrl = new SuppliersController();

  const entryId = routeEntryId.value;
  const entries = budgetController.getEntries();
  const entry = entries.find((e: any) => String(e.id) === String(entryId));

  if (!entry) return;

  const providerName = entry._providerName || entry.name || '';
  const supplierSyncId = entry._supplierId || entry._fromProviderGroupId;

  const allSuppliers = suppliersCtrl.getSuppliers();
  let fullSupplier: Supplier | null = null;

  if (supplierSyncId) {
    fullSupplier =
      allSuppliers.find((s: Supplier) => String(s.sync_id) === String(supplierSyncId)) ||
      allSuppliers.find((s: Supplier) => String(s.id) === String(supplierSyncId));
  }
  if (!fullSupplier) {
    fullSupplier = allSuppliers.find(
      (s: Supplier) => s.name?.toLowerCase() === providerName.toLowerCase(),
    );
  }

  const groups =
    entry.groups && Array.isArray(entry.groups) && entry.groups.length > 0
      ? entry.groups.map((g: EntryGroup) => ({
          amount: Number(g.amount) || 0,
          accountId: g.accountId ?? null,
        }))
      : [
          {
            amount: Number(entry.amount) || 0,
            accountId: entry.accountId ?? null,
          },
        ];

  // Populate items
  items.value.splice(0, items.value.length);
  groups.forEach((g: any) => {
    items.value.push({
      amount: g.amount,
      accountId: g.accountId,
    });
  });

  selectedProvider.value = fullSupplier
    ? {
        id: fullSupplier.id,
        sync_id: fullSupplier.sync_id,
        name: providerName,
        products: fullSupplier.products || [],
      }
    : null;

  initReassignDate();
}

async function initializeFromProvider() {
  const { default: budgetController } = await import('@/controllers/budgetController');
  const { SuppliersController } = await import('@/controllers/suppliersController');
  const suppliersCtrl = new SuppliersController();

  const providerId = routeProviderId.value;
  const providers = budgetController.getProviders();
  const provider = providers.find((p: any) => String(p.id) === String(providerId));

  if (!provider) return;

  providerSyncId.value = provider.sync_id || null;
  providerServerId.value = provider.serverId ?? null;

  const supplierSyncId = provider._supplierId || provider.id;
  const allSuppliers = suppliersCtrl.getSuppliers();
  let fullSupplier: Supplier | null = null;

  if (supplierSyncId) {
    fullSupplier =
      allSuppliers.find((s: Supplier) => String(s.sync_id) === String(supplierSyncId)) ||
      allSuppliers.find((s: Supplier) => String(s.id) === String(supplierSyncId));
  }

  selectedProvider.value = fullSupplier
    ? {
        id: fullSupplier.id,
        sync_id: fullSupplier.sync_id,
        name: provider._supplierName || provider.name,
        products: fullSupplier.products || [],
      }
    : null;

  // Load saved products (including temporaries) from the provider
  providerProducts.value.splice(0, providerProducts.value.length);
  if (provider.products && Array.isArray(provider.products)) {
    for (const prod of provider.products) {
      const isTemporary = !prod.supplierProductId;
      providerProducts.value.push({
        supplierProductId:
          prod.supplierProductId || `temp_restore_${providerProducts.value.length}_${Date.now()}`,
        productName: prod.productName || '',
        productPrice: Number(prod.productPrice) || 0,
        quantity: Number(prod.quantity) || 0,
        isTemporary,
      });
    }
  }

  // Load items from provider
  items.value.splice(0, items.value.length);
  if (provider.items && Array.isArray(provider.items) && provider.items.length > 0) {
    provider.items.forEach((item: any) => {
      const accountIdValue = item.accountId;
      items.value.push({
        amount: Number(item.amount) || 0,
        accountId: accountIdValue
          ? typeof accountIdValue === 'object'
            ? { id: (accountIdValue as Account).id }
            : { id: accountIdValue }
          : null,
      });
    });
  } else {
    items.value.push({
      amount: provider.estimated ?? '',
      accountId: provider.accountId ? { id: provider.accountId } : getDefaultAccountId(),
    });
  }

  // Load notes
  providerNotes.value = provider.notes || '';

  // Initialize date
  if (provider.date) {
    reassignPicker.setDate({ date: parseDateValue({ raw: provider.date }) });
  } else {
    await setTodayDate();
  }
}

// computed
const pageTitle = computed(() => {
  if (isEntryMode.value) {
    return 'Editar Entrada';
  }
  if (routeProviderId.value) {
    return 'Editar Proveedor';
  }
  return 'Agregar Proveedor';
});

const providerName = computed(() => {
  if (selectedProvider.value?.name) {
    return selectedProvider.value.name;
  }
  return selectedProvider.value?.name || '';
});

const filteredProviders = computed(() => {
  if (!searchQuery.value) return allSuppliersList.value;
  return allSuppliersList.value.filter((p: Supplier) =>
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  );
});

const selectedAccountIds = computed(() => {
  const skipIndex = selectedAccountIndex.value;
  return new Set(
    items.value
      .filter((_, i) => i !== skipIndex)
      .map((item) => {
        if (!item.accountId) return null;
        return typeof item.accountId === 'object'
          ? (item.accountId as { id: string | number }).id
          : item.accountId;
      })
      .filter((id): id is string | number => id !== null),
  );
});

const sortedAccounts = computed(() => {
  const query = accountSearchQuery.value?.toLowerCase() || '';
  const available: AccountWithId[] = [];
  const selected: AccountWithId[] = [];
  for (const acc of accounts.value as AccountWithId[]) {
    if (query && !acc.name.toLowerCase().includes(query)) continue;
    if (selectedAccountIds.value.has(acc.id)) {
      selected.push(acc);
    } else {
      available.push(acc);
    }
  }
  return { available, selected };
});

const productsTotal = computed(() => {
  let total = 0;
  if (selectedProvider.value?.products) {
    for (const product of selectedProvider.value.products) {
      const productId = product.sync_id ?? product.id;
      const providerProduct = providerProducts.value.find(
        (p) => String(p.supplierProductId) === String(productId),
      );
      const qty = providerProduct?.quantity || 0;
      total += qty * (product.price || 0);
    }
  }
  for (const tp of providerProducts.value) {
    if (tp.isTemporary && tp.quantity > 0) {
      total += tp.quantity * tp.productPrice;
    }
  }
  return total;
});

const hasProductsWithQuantity = computed(() => {
  return providerProducts.value.some((p) => (p.quantity || 0) > 0);
});

const productsCoverage = computed(() => {
  const totalEntered = items.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return {
    falta: productsTotal.value - totalEntered,
    total: productsTotal.value,
    entered: totalEntered,
  };
});

const isItemsValid = computed(() => {
  return items.value.every((item) => {
    const val = String(item.amount).trim();
    return val !== '' && !isNaN(Number(val)) && Number(val) > 0 && item.accountId != null;
  });
});

const isFormValid = computed(() => {
  if (!isEntryMode.value && !selectedProvider.value) return false;
  return isItemsValid.value;
});

// end computed

// functions
function getDefaultAccountId() {
  if (accounts.value.length === 0) return null;
  return isEntryMode.value ? accounts.value[0].id : accounts.value[0];
}

async function setTodayDate() {
  const { default: budgetController } = await import('@/controllers/budgetController');
  const selectedDate = budgetController.getSelectedDate();
  const dateToUse = selectedDate || format(new Date(), 'yyyy-MM-dd');
  reassignPicker.setDate({ date: dateToUse });
}

function initReassignDate() {
  const now = new Date();
  reassignPicker.setDate({ date: format(now, 'yyyy-MM-dd') });
}

async function initializeNewProviderMode() {
  selectedProvider.value = null;
  providerProducts.value.splice(0, providerProducts.value.length);
  items.value.splice(0, items.value.length);
  items.value.push({ amount: '', accountId: null });
  await setTodayDate();
}

// Validation functions moved to shared utils

// Product quantity validation functions
function getProductRawValue(params: { productId: string | number }): string {
  const { productId } = params;
  return productQuantityRawValues.value.get(productId) ?? '';
}

function setProductRawValue(params: { productId: string | number; value: string }): void {
  const { productId, value } = params;
  productQuantityRawValues.value.set(productId, value);
}

function getProductQuantityError(params: { productId: string | number }): string {
  const { productId } = params;
  const rawValue = getProductRawValue({ productId });
  if (rawValue === '') return '';
  if (!isNumericValue({ value: rawValue })) return 'Solo números';
  return '';
}

function isProductQuantityInvalid(params: { productId: string | number }): boolean {
  const { productId } = params;
  const rawValue = getProductRawValue({ productId });
  if (rawValue === '') return false;
  return !isNumericValue({ value: rawValue });
}

function isProductQuantityTouched(params: { productId: string | number }): boolean {
  const { productId } = params;
  const rawValue = getProductRawValue({ productId });
  return rawValue !== '';
}

function onProviderModalDismiss() {
  showProviderModal.value = false;
  searchQuery.value = '';
}

function onAccountModalDismiss() {
  showAccountModal.value = false;
  accountSearchQuery.value = '';
  selectedAccountIndex.value = null;
}

function selectProvider(params: { p: Supplier | SelectProviderData }) {
  const { p } = params;
  selectedProvider.value = p as Supplier;

  const providerData = p as SelectProviderData;

  // Load products
  const existingTemporaries = providerProducts.value.filter((p) => p.isTemporary);
  providerProducts.value =
    providerData.products?.map((prod: SelectProviderProduct) => ({
      supplierProductId: prod.sync_id ?? prod.id ?? prod.supplierProductId,
      productName: prod.name,
      productPrice: prod.price ?? prod.productPrice,
      quantity: prod.quantity || 0,
      isTemporary: false,
    })) || [];
  providerProducts.value.push(...existingTemporaries);

  // Load items (quantities by account) if available
  if (providerData.items && Array.isArray(providerData.items) && providerData.items.length > 0) {
    items.value = providerData.items.map((item: SelectProviderItem) => ({
      amount: Number(item.amount) || 0,
      accountId: item.accountId ?? null,
    }));
  } else if (providerData.estimated && Number(providerData.estimated) > 0) {
    items.value = [
      {
        amount: Number(providerData.estimated) || 0,
        accountId: providerData.accountId ?? null,
      },
    ];
  }
}

function openAccountModal(params: { index: number }) {
  const { index } = params;
  selectedAccountIndex.value = index;
  accountSearchQuery.value = '';
  showAccountModal.value = true;
}

function selectAccount(params: { acc: AccountWithId }) {
  const { acc } = params;
  if (selectedAccountIndex.value !== null) {
    const accountIdValue = acc.id as string | number;
    items.value[selectedAccountIndex.value].accountId = isEntryMode.value
      ? accountIdValue
      : { id: accountIdValue };
  }
  showAccountModal.value = false;
  selectedAccountIndex.value = null;
}

function getAccountName(params: {
  accountId: string | number | Account | { id: string | number } | null,
}): string {
  const { accountId } = params;
  if (!accountId) return '';
  const id = typeof accountId === 'object' ? (accountId as { id: string | number }).id : accountId;
  const acc = accounts.value.find((a: Account) => String(a.id) === String(id));
  return acc?.name || '';
}

function formatPrice(price: number | { price: number }): string {
  const value = typeof price === 'object' ? price.price : price;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value || 0);
}

function addItem() {
  items.value.push({ amount: '', accountId: null });
}

function handleAddItem() {
  if (!isItemsValid.value) {
    showIncompleteGroupToast.value = true;
    return;
  }
  addItem();
}

function removeItem(params: { index: number }) {
  const { index } = params;
  if (items.value.length > 1) {
    items.value.splice(index, 1);
  }
}

function updateItemAmount(params: { index: number; amount: string }) {
  const { index, amount } = params;
  items.value[index].amount = amount;
}

function getProductQuantity(params: { product: Product }): number {
  const { product } = params;
  const productId = product?.sync_id ?? product?.id;
  const productName = product?.name;
  const productPrice = product?.price;
  const found = providerProducts.value.find((p) => {
    if (productId) {
      return String(p.supplierProductId) === String(productId);
    }
    return p.productName === productName && p.productPrice === productPrice;
  });

  return found ? found.quantity : 0;
}

function setProductQuantity(params: {
  product: Product;
  productPrice: number;
  quantity: number | string;
}) {
  const { product, productPrice, quantity } = params;
  const numQuantity = Number(quantity) || 0;
  const productId = product?.sync_id ?? product?.id;
  const productName = product?.name;
  const existing = providerProducts.value.find((p) => {
    if (productId) {
      return String(p.supplierProductId) === String(productId);
    }
    return p.productName === productName && p.productPrice === productPrice;
  });

  if (existing) {
    existing.quantity = numQuantity;
  } else {
    const fallbackId = productId
      ? productId
      : `manual_${String(productName).toLowerCase().replace(/\s+/g, '_')}_${productPrice}`;

    providerProducts.value.push({
      supplierProductId: fallbackId,
      productName: productName || '',
      productPrice,
      quantity: numQuantity,
    });
  }
}

function addTemporaryProduct() {
  temporaryProductCounter.value += 1;
  const tempId = `temp_${temporaryProductCounter.value}_${Date.now()}`;
  providerProducts.value.push({
    supplierProductId: tempId,
    productName: '',
    productPrice: 0,
    quantity: 0,
    isTemporary: true,
  });
}

function removeTemporaryProduct(params: { index: number }) {
  const { index } = params;
  const product = providerProducts.value[index];
  if (product?.isTemporary) {
    providerProducts.value.splice(index, 1);
    const rawKey = product.supplierProductId;
    if (rawKey) {
      productQuantityRawValues.value.delete(rawKey);
    }
  }
}

function updateTemporaryProduct(params: {
  index: number;
  field: 'productName' | 'productPrice' | 'quantity';
  value: string | number;
}) {
  const { index, field, value } = params;
  const product = providerProducts.value[index];
  if (!product?.isTemporary) return;
  if (field === 'productName') {
    product.productName = String(value);
  } else if (field === 'productPrice') {
    product.productPrice = Number(value) || 0;
  } else if (field === 'quantity') {
    product.quantity = Number(value) || 0;
  }
}

async function handleSave() {
  const { default: budgetController } = await import('@/controllers/budgetController');

  const totalAmount = items.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const products = providerProducts.value
    .filter((p) => (p.quantity || 0) > 0)
    .map((p) => ({
      ...p,
      supplierProductId: p.isTemporary ? null : p.supplierProductId,
    }));

  const selectedDate = reassignPicker.dateISO.value?.slice(0, 10);

  const payload = {
    providerId: selectedProvider.value?.sync_id || selectedProvider.value?.id,
    providerName: selectedProvider.value?.name,
    entryId: routeEntryId.value,
    items: items.value.map((item) => ({
      amount: Number(item.amount) || 0,
      accountId: isEntryMode.value
        ? (item.accountId as string | number | null)
        : (((item.accountId as Account)?.id ?? item.accountId) as string | number | null),
    })) as ProviderItem[],
    totalAmount,
    products: products.length > 0 ? products : undefined,
    date: selectedDate || undefined,
  };

  let savedProviderSyncId: string | null = null;

  if (isEntryMode.value && routeEntryId.value) {
    const groups = payload.items.map((item) => ({
      amount: Number(item.amount) || 0,
      accountId: getAccountIdValue(item.accountId),
    }));

    budgetController.updateIngreso({
      id: Number(routeEntryId.value),
      changes: {
        amount: payload.totalAmount,
        accountId: getAccountIdValue(groups[0]?.accountId),
        groups: groups.length > 1 ? groups : undefined,
        _providerName: payload.providerName,
        date: payload.date,
      },
    });
    budgetController.saveData();
  } else if (routeProviderId.value) {
    const firstAccountId = getAccountIdAsNumber(payload.items[0]?.accountId);

    const normalizedItems = payload.items.map((item) => ({
      amount: Number(item.amount) || 0,
      accountId: getAccountIdValue(item.accountId),
    }));

    budgetController.updateProvider({
      id: Number(routeProviderId.value),
      changes: {
        estimated: payload.totalAmount,
        accountId: firstAccountId,
        _supplierId: payload.providerId,
        _supplierName: payload.providerName,
        products: payload.products,
        items: normalizedItems,
        notes: providerNotes.value,
        date: payload.date,
      },
    });
    budgetController.saveData();
    savedProviderSyncId = providerSyncId.value;
  } else {
    const firstAccountId = getAccountIdAsNumber(payload.items[0]?.accountId);

    const normalizedItems = payload.items.map((item) => ({
      amount: Number(item.amount) || 0,
      accountId: getAccountIdValue(item.accountId),
    }));

    const newProvider = budgetController.addProvider({
      name: payload.providerName || '',
      estimated: payload.totalAmount,
      accountId: firstAccountId,
      allowEmpty: true,
      _supplierId: payload.providerId,
      _supplierName: payload.providerName,
      products: payload.products,
      items: normalizedItems,
      notes: providerNotes.value,
      date: payload.date,
    });
    budgetController.saveData();
    savedProviderSyncId = newProvider?.sync_id ?? null;
  }

  // Handle attachments for providers
  if (savedProviderSyncId) {
    providerSyncId.value = savedProviderSyncId;
    const isProviderSynced = Boolean(routeProviderId.value);
    await saveAttachments({ isSynced: isProviderSynced && navigator.onLine });
  }

  router.back();
}

function handleBack() {
  router.back();
}

// Reassign date functions
async function openReassignPopover(params: { e: Event }) {
  const { e } = params;
  await reassignPicker.openPopover({ e });
}

function applyReassignDate() {
  reassignPicker.applyDate();
}

function openHeaderPopover(params: { e: Event }) {
  const { e } = params;
  popoverMenu.event = e;
  popoverMenu.open = true;
}

async function openReassignFromMenu(params: { e: Event }) {
  const { e } = params;
  closeMenuPopover();
  await nextTick();
  openReassignPopover({ e });
}

function closeMenuPopover() {
  popoverMenu.open = false;
  popoverMenu.event = null;
}

function handleDeleteFromPopover() {
  closeMenuPopover();
  deleteConfirm.openDeleteAlert();
}

async function confirmDelete() {
  const { default: budgetController } = await import('@/controllers/budgetController');

  if (isEntryMode.value && routeEntryId.value) {
    budgetController.removeIngreso({ id: Number(routeEntryId.value) });
    budgetController.saveData();
  } else if (routeProviderId.value) {
    await deleteAllAttachments();

    budgetController.removeProvider({ id: Number(routeProviderId.value) });
    budgetController.saveData();
  }

  router.back();
}

// Attachment handlers
function onAttachmentsSave(params: { newFiles: File[]; deletedIds: number[] }) {
  const { newFiles, deletedIds } = params;
  handleAttachmentsSave({ newFiles, deletedIds });
}
// end attachment handlers

// Expose for parent if needed
defineExpose({
  handleSave,
  handleBack,
});
// end functions

// helpers
function getAccountIdValue(
  accountId: string | number | { id: string | number } | null | undefined,
): string | number | null {
  if (!accountId) return null;
  if (typeof accountId === 'object' && 'id' in accountId) {
    return (accountId.id as string | number) ?? null;
  }
  return accountId as string | number;
}

function getAccountIdAsNumber(
  accountId: string | number | { id: string | number } | null | undefined,
): number {
  const val = getAccountIdValue(accountId);
  return val !== null ? Number(val) || 0 : 0;
}
// end helpers
</script>

<style scoped>
/* Truncate long provider name inside the header popover */
.truncate {
  /* allow the label to shrink in a flex container */
  flex: 1 1 auto;
  min-width: 0;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Coverage banner styles */
.coverage-banner {
  margin-bottom: 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.coverage-card-warning {
  border: 1px solid var(--ion-color-warning);
}

.coverage-card-success {
  border: 1px solid var(--ion-color-success);
}

.coverage-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.coverage-total {
  font-size: 16px;
  font-weight: 600;
  color: var(--ion-color-dark);
}

.coverage-entered {
  font-size: 14px;
  color: var(--ion-color-medium);
}

.coverage-shortage {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-warning);
}

.coverage-covered {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-success);
}

.progress-container {
  height: 8px;
  background: var(--ion-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}
</style>

