<template>
  <ion-modal
    :is-open="isOpen"
    :keep-contents-mounted="true"
    @did-dismiss="onModalDidDismiss"
  >
    <!-- header -->
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="$emit('dismiss')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{ modalTitle }}</ion-title>

        <ion-buttons slot="end">
          <ion-button
            :disabled="
              !isFormValid ||
              (!isEntryMode &&
                hasProductsWithQuantity &&
                productsCoverage.falta > 0)
            "
            @click="handleSave"
          >
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>

          <ion-button @click="openHeaderPopover({ e: $event })">
            <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <!-- end header -->

    <!-- content -->
    <ion-content>
      <!-- Provider search (only when selecting a provider) -->
      <template v-if="isSelectingProvider">
        <ion-item lines="none">
          <ion-searchbar
            v-model="searchQuery"
            mode="ios"
            placeholder="Buscar proveedor"
            class="ion-no-padding"
          ></ion-searchbar>
        </ion-item>

        <ion-list class="transparent ion-padding-start ion-padding-end">
          <ion-list-header>
            <ion-label>Selecciona un provedor</ion-label>
          </ion-list-header>

          <ion-card class="shadow1">
            <ion-item
              v-for="p in filteredProviders"
              :key="p.id"
              lines="full"
              button
              class="transparent"
              @click="selectProvider({ p })"
            >
              <ion-label>{{ p.name }}</ion-label>

              <ion-label slot="end">{{
                formatPrice({ price: p.estimated || 0 })
              }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-list>
      </template>

      <!-- Provider form (when provider is selected or in entry mode) -->
      <div v-else>
        <ion-list class="ion-padding-start ion-padding-end">
          <ion-card class="shadow1">
            <ion-item
              v-if="!isSelectingProvider"
              class="transparent"
              button
              lines="full"
              @click="handleProviderClick"
            >
              <ion-label class="truncate">
                Provedor seleccionado
                <p class="truncate">{{ providerName }}</p>
              </ion-label>
            </ion-item>

            <ion-item
              v-if="isEditingEntry"
              class="transparent"
              button
              lines="full"
              @click="openReassignFromMenu({ e: $event })"
            >
              <ion-label>Fecha</ion-label>
              <ion-label slot="end">{{
                formatShortDate({ isoDate: reassignDateISO })
              }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-list>

        <!-- Segment for full mode -->
        <div v-if="!isEntryMode" class="ion-padding-start ion-padding-end">
          <ion-segment v-model="selectedSegment">
            <ion-segment-button value="inicio">
              <ion-label>Inicio</ion-label>
            </ion-segment-button>

            <ion-segment-button value="productos">
              <ion-label>Productos</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <!-- Amounts by account section (inicio segment) -->
        <template v-if="!isEntryMode && selectedSegment === 'inicio'">
          <div class="ion-padding-start ion-padding-end">
            <!-- Date selector (entry mode) - moved into the form like EditEntryModal -->
            <!-- TODO: verificar si se sigue usando -->
            <ion-item
              v-if="isEntryMode"
              lines="full"
              class="transparent"
              button
              @click="openReassignPopover({ e: $event })"
            >
              <ion-label>Fecha</ion-label>

              <ion-label slot="end">{{
                formatShortDate({ isoDate: reassignDateISO })
              }}</ion-label>
            </ion-item>

            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>Cantidades por Cuenta</ion-label>

                <ion-button :disabled="!canAddMoreItems" @click="addItem">
                  <ion-icon :icon="addOutline"></ion-icon>
                </ion-button>
              </ion-list-header>

              <!-- Products coverage warning (only in full mode) -->
              <div
                v-if="!isEntryMode && hasProductsWithQuantity"
                class="ion-padding-start ion-padding-end ion-margin-bottom"
              >
                <ion-item
                  lines="none"
                  :class="
                    productsCoverage.falta > 0
                      ? 'border-warning'
                      : 'border-success'
                  "
                  style="margin-top: 8px"
                >
                  <ion-icon
                    slot="start"
                    :icon="
                      productsCoverage.falta > 0
                        ? warningOutline
                        : checkmarkCircleOutline
                    "
                    :color="productsCoverage.falta > 0 ? 'warning' : 'success'"
                  ></ion-icon>
                  <ion-label
                    :color="productsCoverage.falta > 0 ? 'warning' : 'success'"
                  >
                    <h3>Productos: {{ formatPrice(productsTotal) }}</h3>

                    <p v-if="productsCoverage.falta > 0">
                      Faltante: {{ formatPrice(productsCoverage.falta) }}
                    </p>

                    <p v-else>Cubierto</p>
                  </ion-label>
                </ion-item>
              </div>

              <template v-for="(item, index) in items" :key="index">
                <ion-card class="shadow1">
                  <div
                    v-if="items.length > 1"
                    style="display: flex; justify-content: flex-end"
                  >
                    <ion-button
                      fill="clear"
                      size="small"
                      @click="removeItem({ index })"
                    >
                      <ion-icon :icon="closeOutline" color="danger"></ion-icon>
                    </ion-button>
                  </div>

                  <ion-item lines="full" class="transparent">
                    <ion-input
                      v-model="item.amount"
                      label="Cantidad"
                      label-placement="floating"
                      type="number"
                      placeholder="0"
                      :class="{
                        'ion-invalid': isAmountInvalid({ index }),
                        'ion-touched': isAmountTouched({ index }),
                      }"
                      :error-text="getAmountError({ index })"
                    ></ion-input>
                  </ion-item>

                  <ion-item lines="full" class="transparent">
                    <ion-select
                      v-model="item.accountId"
                      label="Cuenta"
                      label-placement="stacked"
                      interface="popover"
                      :compare-with="compareAccounts"
                      :class="{
                        'ion-invalid': isAccountInvalid({ index }),
                        'ion-touched': isAccountTouched({ index }),
                      }"
                      :error-text="getAccountError({ index })"
                    >
                      <!-- Placeholder forces explicit selection when model is null -->
                      <ion-select-option :value="null">
                        Seleccionar cuenta
                      </ion-select-option>

                      <ion-select-option
                        v-for="acc in availableAccountsForItem({
                          currentIndex: index,
                        })"
                        :key="acc.id"
                        :value="isEntryMode ? acc.id : acc"
                      >
                        {{ acc.name }} {{ acc.type ? `(${acc.type})` : '' }}
                      </ion-select-option>
                    </ion-select>

                    <ion-button
                      slot="end"
                      fill="clear"
                      size="small"
                      @click="$emit('quick-account', index)"
                    >
                      <ion-icon :icon="addOutline"></ion-icon>
                    </ion-button>
                  </ion-item>
                </ion-card>
              </template>
            </ion-list>
          </div>
        </template>

        <!-- Products section (only in full mode) -->
        <div
          v-if="!isEntryMode && selectedSegment === 'productos'"
          class="ion-margin-top"
        >
          <template v-if="selectedProvider?.products?.length">
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-card class="shadow1">
                <ion-item
                  v-for="product in selectedProvider.products"
                  :key="product.name"
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
                    :error-text="
                      getProductQuantityError({ productId: product.id })
                    "
                    @ion-input="
                      e => {
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
              </ion-card>
            </ion-list>
          </template>

          <template v-else>
            <ion-item lines="none">
              <ion-label>Este proveedor no tiene productos</ion-label>
            </ion-item>
          </template>
        </div>
      </div>
    </ion-content>
    <!-- end content -->

    <!-- popovers -->
    <ion-popover
      :is-open="popoverReassign.open"
      :event="popoverReassign.event"
      @did-dismiss="closeReassignPopover"
    >
      <ion-content class="ion-padding">
        <ion-datetime
          v-if="showPicker"
          :key="tempPickerDateISO"
          v-model="tempPickerDateISO"
          presentation="date"
          style="background: transparent; width: 100%"
        ></ion-datetime>

        <ion-item>
          <ion-button
            slot="start"
            fill="clear"
            size="small"
            @click="closeReassignPopover"
            >Cancelar</ion-button
          >
          <ion-button
            slot="end"
            size="small"
            color="primary"
            :disabled="!canApplyReassign"
            @click="applyPopoverReassign"
            >Aplicar</ion-button
          >
        </ion-item>
      </ion-content>
    </ion-popover>

    <ion-popover
      :is-open="popoverMenu.open"
      :event="popoverMenu.event"
      @did-dismiss="closeMenuPopover"
    >
      <ion-content>
        <ion-item lines="full" button @click="handleDeleteFromPopover">
          <ion-icon slot="start" color="danger" :icon="trashOutline"></ion-icon>

          <ion-label color="danger">Eliminar proveedor</ion-label>
        </ion-item>
      </ion-content>
    </ion-popover>
    <!-- end popovers -->

    <!-- alerts -->
    <!-- end alerts -->
  </ion-modal>
</template>

<script lang="ts" setup>
// imports
import {
  IonModal,
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
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonCard,
  IonPopover,
  IonDatetime,
} from '@ionic/vue';
import {
  closeOutline,
  trashOutline,
  addOutline,
  warningOutline,
  saveOutline,
  ellipsisVerticalOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { ref, computed, watch, toRefs, reactive, nextTick } from 'vue';
import { format } from 'date-fns';
// end imports

// controllers
// end controllers

// components
// end components

// interface and types imports
export interface ProviderItem {
  amount: number;
  accountId: string | number | Account | null;
}

export interface Account {
  id: string | number;
  name: string;
  type?: string;
}

export interface Supplier {
  id?: string | number;
  sync_id?: string | number;
  name: string;
  products?: Array<Product>;
}

export interface Product {
  id?: string | number;
  sync_id?: string;
  supplierProductId?: string | number;
  name: string;
  price: number;
}

export interface ProviderProduct {
  supplierProductId: string | number;
  productName: string;
  productPrice: number;
  quantity: number;
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
}

// Type aliases for external usage
export type AccountWithBalance = Account & { balance?: number };
export type EntryGroup = ProviderItem;
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

// main
interface Props {
  isOpen: boolean;
  provider?: ProviderData;
  entryData?: {
    name: string;
    entryId: string | number | null;
    items: ProviderItem[];
  };
  suppliers?: Supplier[];
  accounts: Account[];
  mode?: 'entry' | 'provider';
}

const props = withDefaults(defineProps<Props>(), {
  provider: undefined,
  entryData: undefined,
  suppliers: () => [],
  mode: 'provider',
});

const emit = defineEmits<{
  (e: 'dismiss'): void;
  (
    e: 'saved',
    payload: {
      providerId?: string | number;
      providerName?: string;
      entryId?: string | number | null;
      items: ProviderItem[];
      totalAmount: number;
      products?: ProviderProduct[];
      date?: string;
    }
  ): void;
  // 'deleted' can be emitted either as a plain entry id (when editing an entry)
  // or as an object with provider id and optional _supplierId (when deleting a provider).
  (
    e: 'deleted',
    payload:
      | string
      | number
      | { id: string | number; _supplierId?: string | number }
  ): void;
  (e: 'reassign-date', date: string): void;
  (e: 'quick-account', index: number): void;
}>();

const { isOpen, provider, entryData, suppliers, accounts, mode } =
  toRefs(props);
// end main

// vars and const
const searchQuery = ref('');
const selectedProvider = ref<Supplier | null>(null);
const isSelectingProvider = ref(false);
const selectedSegment = ref('inicio');
const providerProducts = ref<ProviderProduct[]>([]);
const items = ref<
  Array<{
    amount: number | string;
    accountId: string | number | Account | { id: string | number } | null;
  }>
>([{ amount: '', accountId: null }]);
const popoverReassign = reactive({ open: false, event: null as Event | null });
const popoverMenu = reactive({ open: false, event: null as Event | null });
const reassignDate = ref<string | null>(null);
const reassignDateISO = ref<string | null>(null);
const showPicker = ref(true);
const tempPickerDateISO = ref<string | null>(null);

const productQuantityRawValues = ref<Map<string | number, string>>(new Map());
// end vars and const

// watch
watch(isOpen, async newVal => {
  if (!newVal) return;
  resetModalState();

  if (isEntryMode.value && entryData.value) {
    initializeEntryMode();
  } else if (provider.value) {
    initializeProviderMode();
  } else {
    initializeNewProviderMode();
  }
});

// Watch for external provider data updates
watch(
  () => props.provider,
  newProvider => {
    if (isOpen.value && newProvider && !isEntryMode.value) {
      updateProviderFromProps({ newProvider });
    }
  },
  { deep: true }
);

// Sync short date when ISO changes
watch(
  () => reassignDateISO.value,
  newValue => {
    if (newValue) {
      reassignDate.value = String(newValue).slice(0, 10);
    }
  }
);

// Watch isOpen to reset if parent closes the modal programmatically
watch(
  () => props.isOpen,
  opened => {
    if (!opened) {
      setTimeout(() => resetFormState(), 80);
    }
  }
);
// end watch

// computed
const isEntryMode = computed(() => mode.value === 'entry');

const modalTitle = computed(() => {
  if (isEntryMode.value) {
    return 'Editar Proveedor';
  }
  return provider.value ? 'Editar Proveedor' : 'Agregar Proveedor';
});

const providerName = computed(() => {
  if (selectedProvider.value?.name) {
    return selectedProvider.value.name;
  }
  if (isEntryMode.value) {
    return entryData.value?.name || '';
  }
  return selectedProvider.value?.name || '';
});

const filteredProviders = computed(() => {
  if (!searchQuery.value) return suppliers.value;
  return suppliers.value.filter(p =>
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const productsTotal = computed(() => {
  if (!selectedProvider.value?.products) return 0;
  return selectedProvider.value.products.reduce(
    (sum: number, product: Product) => {
      // Match providerProducts entries by the product's sync_id or id
      const productId = product.sync_id ?? product.id;
      const providerProduct = providerProducts.value.find(
        p => String(p.supplierProductId) === String(productId)
      );
      const qty = providerProduct?.quantity || 0;
      return sum + qty * (product.price || 0);
    },
    0
  );
});

const hasProductsWithQuantity = computed(() => {
  if (!selectedProvider.value?.products) return false;
  return providerProducts.value.some(p => (p.quantity || 0) > 0);
});

const productsCoverage = computed(() => {
  const totalEntered = items.value.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  return {
    falta: productsTotal.value - totalEntered,
    total: productsTotal.value,
    entered: totalEntered,
  };
});

const canAddMoreItems = computed(() => {
  return items.value.length < accounts.value.length;
});

const isItemsValid = computed(() => {
  return items.value.every(item => {
    const val = String(item.amount).trim();
    return (
      val !== '' &&
      !isNaN(Number(val)) &&
      Number(val) > 0 &&
      item.accountId != null
    );
  });
});

const isFormValid = computed(() => {
  if (isEntryMode.value) {
    return isItemsValid.value;
  }
  return selectedProvider.value != null && isItemsValid.value;
});

const canApplyReassign = computed(() => {
  const short = tempPickerDateISO.value?.slice(0, 10);
  return short?.length === 10;
});

// true cuando estamos editando una entrada existente (no creando una nueva)
const isEditingEntry = computed(() => {
  // Verifica si tenemos un entryId válido (entrada existente)
  const hasEntryId = entryData.value?.entryId != null;
  // También verificamos mode === 'entry' o si provider tiene un id
  const isEditing = hasEntryId || provider.value?.id != null;
  return isEditing;
});
// end computed

// onmounted
// end onmounted

// functions
// Helper functions
function getDefaultAccountId() {
  if (accounts.value.length === 0) return null;
  return isEntryMode.value ? accounts.value[0].id : accounts.value[0];
}

function resetModalState() {
  isSelectingProvider.value = false;
  selectedProvider.value = null;
  selectedSegment.value = 'inicio';
  searchQuery.value = '';
}

function initializeEntryMode() {
  items.value.splice(0, items.value.length);
  entryData.value!.items.forEach(item => {
    items.value.push({
      amount: Number(item.amount) || 0,
      accountId: item.accountId,
    });
  });
  providerProducts.value.splice(0, providerProducts.value.length);
  initReassignDate();
}

function initReassignDate() {
  const entryWithDate = entryData.value as { date?: string } | undefined;
  const raw = entryWithDate?.date;
  if (raw) {
    reassignDateISO.value = parseDateValue({ raw });
    reassignDate.value = String(reassignDateISO.value).slice(0, 10);
  } else {
    setTodayDate();
  }
}

function setTodayDate() {
  reassignDateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
  reassignDate.value = String(reassignDateISO.value).slice(0, 10);
}

function initializeNewProviderMode() {
  selectedProvider.value = null;
  isSelectingProvider.value = true;
  providerProducts.value.splice(0, providerProducts.value.length);
  items.value.splice(0, items.value.length);
  items.value.push({ amount: '', accountId: null });
}

function initializeProviderMode() {
  const supplierSyncId = provider.value!._supplierId || provider.value!.id;
  const fullSupplier =
    suppliers.value.find(
      (s: Supplier) => String(s.sync_id) === String(supplierSyncId)
    ) ||
    suppliers.value.find(
      (s: Supplier) => String(s.id) === String(supplierSyncId)
    ) ||
    suppliers.value.find(
      (s: Supplier) =>
        s.name?.toLowerCase() === provider.value?.name?.toLowerCase()
    );

  selectedProvider.value = {
    id: fullSupplier?.id || supplierSyncId,
    sync_id: fullSupplier?.sync_id || supplierSyncId,
    name: provider.value!._supplierName || provider.value!.name,
    products: fullSupplier?.products || [],
  };

  // Initialize date from provider
  const providerDate = (provider.value as ProviderData & { date?: string })
    ?.date;
  if (providerDate) {
    reassignDateISO.value = parseDateValue({ raw: providerDate });
    reassignDate.value = String(reassignDateISO.value).slice(0, 10);
  } else {
    setTodayDate();
  }

  // Load items from provider if available
  items.value.splice(0, items.value.length);

  if (
    provider.value!.items &&
    Array.isArray(provider.value!.items) &&
    provider.value!.items.length > 0
  ) {
    provider.value!.items.forEach(item => {
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
      amount: provider.value!.estimated ?? '',
      accountId: provider.value!.accountId
        ? { id: provider.value!.accountId }
        : getDefaultAccountId(),
    });
  }

  // Load existing products
  if (fullSupplier?.products && Array.isArray(fullSupplier.products)) {
    providerProducts.value = fullSupplier.products.map((p: Product) => ({
      supplierProductId: p.sync_id ?? p.id,
      productName: p.name,
      productPrice: p.price,
      quantity: 0,
    }));
  } else if (
    provider.value!.products &&
    Array.isArray(provider.value!.products)
  ) {
    providerProducts.value = provider.value!.products.map(
      (p: PendingProduct) => ({
        supplierProductId:
          p.supplierProductId ||
          p.supplier_product_id ||
          p.sync_id ||
          p.id ||
          `manual_${String(p.productName || p.name)
            .toLowerCase()
            .replace(/\s+/g, '_')}_${p.productPrice || p.price}`,
        productName: p.productName || p.product_name || p.name || '',
        productPrice: p.productPrice || p.product_price || p.price || 0,
        quantity: p.quantity || 0,
      })
    );
  } else {
    providerProducts.value = [];
  }
}

function updateProviderFromProps(params: { newProvider: ProviderData }) {
  const { newProvider } = params;
  const supplierSyncId = newProvider._supplierId || newProvider.id;
  const fullSupplier =
    suppliers.value.find(
      (s: Supplier) => String(s.sync_id) === String(supplierSyncId)
    ) ||
    suppliers.value.find(
      (s: Supplier) => String(s.id) === String(supplierSyncId)
    ) ||
    suppliers.value.find(
      (s: Supplier) =>
        s.name?.toLowerCase() === newProvider?.name?.toLowerCase()
    );

  selectedProvider.value = {
    id: fullSupplier?.id || supplierSyncId,
    sync_id: String(fullSupplier?.sync_id || supplierSyncId),
    name: newProvider._supplierName || newProvider.name,
    products: (fullSupplier?.products ||
      newProvider.products ||
      []) as Product[],
  };

  // Load items from provider if available
  items.value.splice(0, items.value.length);
  if (
    newProvider.items &&
    Array.isArray(newProvider.items) &&
    newProvider.items.length > 0
  ) {
    newProvider.items.forEach(item => {
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
    const accountIdValue = newProvider.accountId;
    items.value.push({
      amount: newProvider.estimated ?? '',
      accountId: accountIdValue
        ? typeof accountIdValue === 'object'
          ? { id: (accountIdValue as Account).id }
          : { id: accountIdValue }
        : getDefaultAccountId(),
    });
  }

  if (newProvider.products && Array.isArray(newProvider.products)) {
    providerProducts.value = newProvider.products.map((p: PendingProduct) => ({
      supplierProductId:
        p.supplierProductId || p.sync_id || p.id || `${p.name}-${p.price}`,
      productName: p.productName || p.name || '',
      productPrice: p.productPrice || p.price || 0,
      quantity: p.quantity || 0,
    }));
  } else {
    providerProducts.value = [];
  }
}

function parseDateValue(params: {
  raw: string | number | null | undefined;
}): string {
  const { raw } = params;
  if (!raw) return format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';

  if (typeof raw === 'string') {
    if (raw.includes('T')) {
      return raw.length >= 19 ? raw.slice(0, 19) : raw + 'T00:00:00';
    }
    return `${raw.slice(0, 10)}T00:00:00`;
  }

  if (typeof raw === 'number') {
    return format(new Date(raw), 'yyyy-MM-dd') + 'T00:00:00';
  }

  return format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
}

// Format ISO date to short localized string (dd/MM/yy)
function formatShortDate(params: { isoDate: string | null }): string {
  const { isoDate } = params;
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return String(isoDate).slice(0, 10);
  }
}

// Validation functions
function isNumericValue(params: {
  value: string | number | null | undefined;
}): boolean {
  const { value } = params;
  if (value === null || value === undefined || value === '') return true;
  return /^-?\d*\.?\d+$/.test(String(value));
}

function isPositiveValue(params: {
  value: string | number | null | undefined;
}): boolean {
  const { value } = params;
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

function getAmountError(params: { index: number }): string {
  const { index } = params;
  const amount = items.value[index]?.amount;
  if (!isNumericValue({ value: amount })) return 'Solo se permiten números';
  if (!isPositiveValue({ value: amount })) return 'El valor debe ser mayor a 0';
  return '';
}

function isAmountInvalid(params: { index: number }): boolean {
  const { index } = params;
  const amount = items.value[index]?.amount;
  return (
    !isNumericValue({ value: amount }) || !isPositiveValue({ value: amount })
  );
}

function isAmountTouched(params: { index: number }): boolean {
  const { index } = params;
  const amount = items.value[index]?.amount;
  return amount !== null && amount !== undefined && String(amount) !== '';
}

// Validación para cuenta seleccionada
function isAccountInvalid(params: { index: number }): boolean {
  const { index } = params;
  const accountId = items.value[index]?.accountId;
  return accountId === null || accountId === undefined;
}

function isAccountTouched(params: { index: number }): boolean {
  const { index } = params;
  const amount = items.value[index]?.amount;
  return amount !== null && amount !== undefined && String(amount) !== '';
}

function getAccountError(params: { index: number }): string {
  const { index } = params;
  if (isAccountInvalid({ index }) && isAccountTouched({ index })) {
    return 'Debe seleccionar una cuenta';
  }
  return '';
}

// Product quantity validation functions
function getProductRawValue(params: { productId: string | number }): string {
  const { productId } = params;
  return productQuantityRawValues.value.get(productId) ?? '';
}

function setProductRawValue(params: {
  productId: string | number;
  value: string;
}): void {
  const { productId, value } = params;
  productQuantityRawValues.value.set(productId, value);
}

function getProductQuantityError(params: {
  productId: string | number;
}): string {
  const { productId } = params;
  const rawValue = getProductRawValue({ productId });
  if (rawValue === '') return '';
  if (!isNumericValue({ value: rawValue })) return 'Solo números';
  return '';
}

function isProductQuantityInvalid(params: {
  productId: string | number;
}): boolean {
  const { productId } = params;
  const rawValue = getProductRawValue({ productId });
  if (rawValue === '') return false;
  return !isNumericValue({ value: rawValue });
}

function isProductQuantityTouched(params: {
  productId: string | number;
}): boolean {
  const { productId } = params;
  const rawValue = getProductRawValue({ productId });
  return rawValue !== '';
}

const availableAccountsForItem = (params: { currentIndex: number }) => {
  const { currentIndex } = params;
  const usedAccountIds = items.value
    .filter((_, idx: number) => idx !== currentIndex)
    .map((item: ProviderItem) => {
      if (isEntryMode.value) {
        return String(item.accountId);
      }
      return String((item.accountId as Account)?.id ?? item.accountId);
    })
    .filter((id: string) => id !== 'null' && id !== 'undefined' && id !== '');

  return accounts.value.filter(
    (acc: Account) => !usedAccountIds.includes(String(acc.id))
  );
};

function selectProvider(params: { p: Supplier | SelectProviderData }) {
  const { p } = params;
  selectedProvider.value = p as Supplier;
  isSelectingProvider.value = false;

  const providerData = p as SelectProviderData;

  // Load products
  providerProducts.value =
    providerData.products?.map((prod: SelectProviderProduct) => ({
      supplierProductId: prod.sync_id ?? prod.id ?? prod.supplierProductId,
      productName: prod.name,
      productPrice: prod.price ?? prod.productPrice,
      quantity: prod.quantity || 0,
    })) || [];

  // Load items (quantities by account) if available
  if (
    providerData.items &&
    Array.isArray(providerData.items) &&
    providerData.items.length > 0
  ) {
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

function changeProvider() {
  isSelectingProvider.value = true;
  selectedProvider.value = null;
  selectedSegment.value = 'inicio';
}

function handleProviderClick() {
  changeProvider();
  closeMenuPopover();
}

function compareAccounts(
  o1: Account | string | number | null,
  o2: Account | string | number | null
): boolean {
  if (o1 === o2) return true;
  if (o1 != null && o2 != null) {
    if (typeof o1 === 'object' && typeof o2 === 'object') {
      return (o1 as Account).id === (o2 as Account).id;
    }
    return String(o1) === String(o2);
  }
  return false;
}

function formatPrice(price: number | { price: number }): string {
  const value = typeof price === 'object' ? price.price : price;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value || 0);
}

function addItem() {
  if (canAddMoreItems.value) {
    items.value.push({ amount: '', accountId: null });
  }
}

function removeItem(params: { index: number }) {
  const { index } = params;
  if (items.value.length > 1) {
    items.value.splice(index, 1);
  }
}

function getProductQuantity(params: { product: Product }): number {
  const { product } = params;
  const productId = product?.sync_id ?? product?.id;
  const productName = product?.name;
  const productPrice = product?.price;
  const found = providerProducts.value.find(p => {
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
  const productId =
    product?.sync_id ?? product?.id ?? product?.supplierProductId;
  const productName = product?.name;
  const existing = providerProducts.value.find(p => {
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

function handleSave() {
  const totalAmount = items.value.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const products = providerProducts.value.filter(p => (p.quantity || 0) > 0);

  const selectedDate =
    reassignDate.value || reassignDateISO.value?.slice(0, 10);

  emit('saved', {
    providerId: selectedProvider.value?.sync_id || selectedProvider.value?.id,
    providerName: selectedProvider.value?.name,
    entryId: entryData.value?.entryId,
    items: items.value.map(item => ({
      amount: Number(item.amount) || 0,
      accountId: isEntryMode.value
        ? (item.accountId as string | number | null)
        : (((item.accountId as Account)?.id ?? item.accountId) as
            | string
            | number
            | null),
    })) as ProviderItem[],
    totalAmount,
    products: products.length > 0 ? products : undefined,
    date: selectedDate || undefined,
  });
}

function handleDelete() {
  if (isEntryMode.value && entryData.value?.entryId) {
    emit('deleted', entryData.value.entryId as string | number);
    return;
  }

  if (provider.value?.id) {
    const providerValue = provider.value as ProviderData & {
      _supplierId?: string | number;
    };
    const payload: { id: string | number; _supplierId?: string | number } = {
      id: provider.value.id,
    };

    if (providerValue._supplierId)
      payload._supplierId = providerValue._supplierId;
    else if (selectedProvider.value?.sync_id)
      payload._supplierId = selectedProvider.value.sync_id;

    emit('deleted', payload);
  }
}

// Reassign date functions
async function openReassignPopover(params: { e: Event }) {
  const { e } = params;
  if (!reassignDateISO.value) {
    if (entryData.value && (entryData.value as { date?: string }).date) {
      reassignDateISO.value = parseDateValue({
        raw: (entryData.value as { date?: string }).date,
      });
    } else {
      reassignDateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
    }
  }

  tempPickerDateISO.value = reassignDateISO.value;

  showPicker.value = false;
  await nextTick();
  showPicker.value = true;

  popoverReassign.event = e;
  popoverReassign.open = true;
}

function applyPopoverReassign() {
  const finalDate = tempPickerDateISO.value?.slice(0, 10);
  if (!finalDate) return;

  reassignDateISO.value = tempPickerDateISO.value;
  reassignDate.value = finalDate;

  emit('reassign-date', finalDate);
  popoverReassign.open = false;
  popoverReassign.event = null;
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

function closeReassignPopover() {
  popoverReassign.open = false;
  popoverReassign.event = null;
}

function closeMenuPopover() {
  popoverMenu.open = false;
  popoverMenu.event = null;
}

function handleDeleteFromPopover() {
  handleDelete();
  closeMenuPopover();
}

function resetFormState() {
  try {
    searchQuery.value = '';
    selectedProvider.value = null;
    isSelectingProvider.value = false;
    selectedSegment.value = 'inicio';
    providerProducts.value.splice(0, providerProducts.value.length);
    items.value.splice(0, items.value.length);
    items.value.push({ amount: '', accountId: null });
    reassignDate.value = null;
    reassignDateISO.value = null;
    tempPickerDateISO.value = null;
    showPicker.value = true;
  } catch (err) {
    // noop
  }
}

function onModalDidDismiss() {
  emit('dismiss');
  resetFormState();
}
// end functions
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
</style>
