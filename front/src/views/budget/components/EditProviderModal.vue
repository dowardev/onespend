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

          <ion-button @click="openHeaderPopover($event)">
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
          <ion-card v-for="p in filteredProviders" :key="p.id" class="shadow1">
            <ion-item
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
              @click="openReassignPopover($event)"
            >
              <ion-label>Fecha</ion-label>

              <ion-label slot="end">{{
                formatShortDate(reassignDateISO)
              }}</ion-label>
            </ion-item>

            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>Cantidades por Cuenta</ion-label>

                <ion-button :disabled="!canAddMoreItems" @click="addItem">
                  <ion-icon :icon="addOutline"></ion-icon>
                  Agregar
                </ion-button>
              </ion-list-header>

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
                        'ion-invalid': isAmountInvalid(index),
                        'ion-touched': isAmountTouched(index),
                      }"
                      :error-text="getAmountError(index)"
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
                        'ion-invalid': isAccountInvalid(index),
                        'ion-touched': isAccountTouched(index),
                      }"
                      :error-text="getAccountError(index)"
                    >
                      <!-- Placeholder forces explicit selection when model is null -->
                      <ion-select-option :value="null" disabled>
                        Seleccionar cuenta
                      </ion-select-option>

                      <ion-select-option
                        v-for="acc in availableAccountsForItem(index)"
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

        <!-- Products coverage warning (only in full mode) -->
        <ion-item
          v-if="!isEntryMode && hasProductsWithQuantity"
          lines="none"
          class="warning-item"
        >
          <ion-icon
            slot="start"
            :icon="warningOutline"
            color="warning"
          ></ion-icon>
          <ion-label color="warning">
            <h3>Productos: {{ formatPrice(productsTotal) }}</h3>

            <p v-if="productsCoverage.falta > 0">
              Faltante: {{ formatPrice(productsCoverage.falta) }}
            </p>

            <p v-else>Cubierto</p>
          </ion-label>
        </ion-item>

        <!-- Products section (only in full mode) -->
        <div
          v-if="!isEntryMode && selectedSegment === 'productos'"
          class="ion-margin-top"
        >
          <template v-if="selectedProvider?.products?.length">
            <ion-list>
              <div class="list-content">
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
                      'ion-invalid': isProductQuantityInvalid(product.id),
                      'ion-touched': isProductQuantityTouched(product.id),
                    }"
                    :error-text="getProductQuantityError(product.id)"
                    @ion-input="
                      e => {
                        setProductRawValue(product.id, e.detail.value || '');
                        setProductQuantity({
                          product,
                          productPrice: product.price,
                          quantity: e.detail.value,
                        });
                      }
                    "
                  ></ion-input>
                </ion-item>
              </div>
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

    <!-- popover: reassign date -->
    <ion-popover
      :is-open="popoverReassign.open"
      :event="popoverReassign.event"
      @did-dismiss="closeReassignPopover"
    >
      <ion-content class="ion-padding">
        <div style="min-width: 220px; max-width: 320px">
          <ion-item lines="none">
            <ion-label position="stacked">Seleccionar fecha</ion-label>
            <ion-datetime
              v-if="showPicker"
              ref="reassignPicker"
              :key="reassignDateISO"
              v-model="reassignDateISO"
              presentation="date"
              style="background: transparent; width: 100%"
              @ion-change="onReassignDatetimeChange"
            ></ion-datetime>
          </ion-item>

          <ion-item lines="full" style="margin-top: 8px">
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
        </div>
      </ion-content>
    </ion-popover>

    <!-- popover: header menu -->
    <ion-popover
      :is-open="popoverMenu.open"
      :event="popoverMenu.event"
      @did-dismiss="closeMenuPopover"
    >
      <ion-content>
        <ion-item
          v-if="!isSelectingProvider"
          button
          lines="full"
          @click="handleProviderClick"
        >
          <ion-label class="truncate">
            Provedo seleccionado
            <p class="truncate">{{ providerName }}</p>
          </ion-label>
        </ion-item>

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

<script setup lang="ts">
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
  createOutline,
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
    }
  ): void;
  (e: 'deleted', id: string | number): void;
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
const productQuantities = ref<Record<string, number>>({});
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
const reassignPicker = ref<any>(null);
const showPicker = ref(true);
const reassignInitialShort = ref<string | null>(null);

// Validación simple para amount
function isNumericValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  return /^-?\d*\.?\d+$/.test(String(value));
}

function isPositiveValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

function getAmountError(index: number): string {
  const amount = items.value[index]?.amount;
  if (!isNumericValue(amount)) return 'Solo se permiten números';
  if (!isPositiveValue(amount)) return 'El valor debe ser mayor a 0';
  return '';
}

function isAmountInvalid(index: number): boolean {
  const amount = items.value[index]?.amount;
  return !isNumericValue(amount) || !isPositiveValue(amount);
}

function isAmountTouched(index: number): boolean {
  const amount = items.value[index]?.amount;
  return amount !== null && amount !== undefined && String(amount) !== '';
}

// Validación para cuenta seleccionada
function isAccountInvalid(index: number): boolean {
  const accountId = items.value[index]?.accountId;
  return accountId === null || accountId === undefined;
}

function isAccountTouched(index: number): boolean {
  // Consideramos que el campo ha sido "tocado" si el amount ya tiene valor
  // (el usuario ya empezó a llenar el formulario)
  const amount = items.value[index]?.amount;
  return amount !== null && amount !== undefined && String(amount) !== '';
}

function getAccountError(index: number): string {
  if (isAccountInvalid(index) && isAccountTouched(index)) {
    return 'Debe seleccionar una cuenta';
  }
  return '';
}

// Validación para cantidad de productos
const productQuantityRawValues = ref<Map<string | number, string>>(new Map());

function getProductRawValue(productId: string | number): string {
  return productQuantityRawValues.value.get(productId) ?? '';
}

function setProductRawValue(productId: string | number, value: string): void {
  productQuantityRawValues.value.set(productId, value);
}

function getProductQuantityError(productId: string | number): string {
  const rawValue = getProductRawValue(productId);
  if (rawValue === '') return '';
  if (!isNumericValue(rawValue)) return 'Solo números';
  return '';
}

function isProductQuantityInvalid(productId: string | number): boolean {
  const rawValue = getProductRawValue(productId);
  if (rawValue === '') return false;
  return !isNumericValue(rawValue);
}

function isProductQuantityTouched(productId: string | number): boolean {
  const rawValue = getProductRawValue(productId);
  return rawValue !== '';
}
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
      updateProviderFromProps(newProvider);
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
// end watch

// computed
const isEntryMode = computed(() => mode.value === 'entry');

const modalTitle = computed(() => {
  if (isEntryMode.value) {
    return 'Editar Proveedor';
  }
  return provider.value ? 'Editar Proveedor' : 'Agregar Proveedor';
});

const canDelete = computed(() => {
  if (isEntryMode.value) {
    return entryData.value?.entryId != null;
  }
  return provider.value != null;
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

const hasProducts = computed(() => {
  return (
    selectedProvider.value?.products &&
    selectedProvider.value.products.length > 0
  );
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
      const providerProduct = providerProducts.value.find(
        p => p.supplierProductId === product.id
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
  const short = reassignDate.value || reassignDateISO.value?.slice(0, 10);
  return short?.length === 10;
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
  const raw = (entryData.value as any)?.date;
  if (raw) {
    reassignDateISO.value = parseDateValue(raw);
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
  // Do not preselect an account when creating a new provider
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

  // Load items from provider if available, otherwise create single item from estimated/accountId
  // Clear the array first to ensure reactivity with keep-contents-mounted
  items.value.splice(0, items.value.length);
  
  if (provider.value!.items && Array.isArray(provider.value!.items) && provider.value!.items.length > 0) {
    provider.value!.items.forEach(item => {
      items.value.push({
        amount: Number(item.amount) || 0,
        accountId: item.accountId ? { id: item.accountId } : null,
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

function updateProviderFromProps(newProvider: ProviderData) {
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

  // Load items from provider if available, otherwise create single item from estimated/accountId
  items.value.splice(0, items.value.length);
  if (newProvider.items && Array.isArray(newProvider.items) && newProvider.items.length > 0) {
    newProvider.items.forEach(item => {
      items.value.push({
        amount: Number(item.amount) || 0,
        accountId: item.accountId ? { id: item.accountId } : null,
      });
    });
  } else {
    items.value.push({
      amount: newProvider.estimated ?? '',
      accountId: newProvider.accountId
        ? { id: newProvider.accountId }
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

function parseDateValue(raw: unknown): string {
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
// end Helper functions

// Format ISO date to short localized string (dd/MM/yy)
function formatShortDate(isoDate: string | null): string {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch (e) {
    return String(isoDate).slice(0, 10);
  }
}

const availableAccountsForItem = (currentIndex: number) => {
  const usedAccountIds = items.value
    .filter((_: unknown, idx: number) => idx !== currentIndex)
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

function selectProvider(params: { p: Supplier | any }) {
  const { p } = params;
  selectedProvider.value = p;
  isSelectingProvider.value = false;

  // Load products
  providerProducts.value =
    p.products?.map((prod: any) => ({
      supplierProductId: prod.sync_id ?? prod.id ?? prod.supplierProductId,
      productName: prod.name,
      productPrice: prod.price ?? prod.productPrice,
      quantity: prod.quantity || 0,
    })) || [];

  // Load items (quantities by account) if available
  if (p.items && Array.isArray(p.items) && p.items.length > 0) {
    items.value = p.items.map((item: any) => ({
      amount: Number(item.amount) || 0,
      // Preserve provided accountId, otherwise leave null so user must select
      accountId: item.accountId ?? null,
    }));
  } else if (p.estimated && Number(p.estimated) > 0) {
    // If provider has estimated amount, create one item
    items.value = [
      {
        amount: Number(p.estimated) || 0,
        accountId: p.accountId ?? null,
      },
    ];
  }
}

function changeProvider() {
  isSelectingProvider.value = true;
  selectedProvider.value = null;
  selectedSegment.value = 'inicio';
  productQuantities.value = {};
}

function handleProviderClick() {
  changeProvider();
  // Close the header popover after selecting the option
  closeMenuPopover();
}

function compareAccounts(
  o1: Account | string | number | null | undefined,
  o2: Account | string | number | null | undefined
) {
  // Handle cases where ion-select passes arguments directly or a single object
  // Normalize if a single object param was provided
  if (arguments.length === 1 && typeof o1 === 'object' && o1 != null) {
    const obj = o1 as any;
    o1 = obj.o1 ?? obj.o1;
    o2 = obj.o2 ?? obj.o2;
  }

  if (o1 === o2) return true;
  if (o1 != null && o2 != null) {
    if (typeof o1 === 'object' && typeof o2 === 'object') {
      return (o1 as any).id === (o2 as any).id;
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
    // New rows should not auto-select an account
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
  const productId = product?.id ?? product?.sync_id;
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
  });
}

function handleDelete() {
  if (isEntryMode.value && entryData.value?.entryId) {
    emit('deleted', entryData.value.entryId);
  } else if (provider.value?.id) {
    emit('deleted', provider.value.id);
  }
}

// Reassign date functions
async function openReassignPopover(e: Event) {
  // Prepare ISO value for the picker
  if (!reassignDateISO.value) {
    if (entryData.value && (entryData.value as any).date) {
      reassignDateISO.value = parseDateValue((entryData.value as any).date);
    } else {
      reassignDateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
    }
  }

  reassignInitialShort.value = reassignDateISO.value?.slice(0, 10) || null;
  reassignDate.value = reassignInitialShort.value;

  // Force remount of picker
  showPicker.value = false;
  await nextTick();
  showPicker.value = true;

  popoverReassign.event = e;
  popoverReassign.open = true;
}

function onReassignDatetimeChange(e: any) {
  const val = e?.detail?.value ?? e;
  if (!val) return;

  let iso: string;
  if (typeof val === 'string') {
    iso = val.includes('T') ? val : `${val.slice(0, 10)}T00:00:00`;
  } else if (val instanceof Date) {
    iso = format(val, 'yyyy-MM-dd') + 'T00:00:00';
  } else {
    iso = String(val).slice(0, 10) + 'T00:00:00';
  }

  reassignDateISO.value = iso;
  reassignDate.value = iso.slice(0, 10);
}

function applyPopoverReassign() {
  const finalDate = reassignDate.value || reassignDateISO.value?.slice(0, 10);
  if (!finalDate) return;

  emit('reassign-date', finalDate);
  popoverReassign.open = false;
  popoverReassign.event = null;
}

function openHeaderPopover(e: Event) {
  popoverMenu.event = e;
  popoverMenu.open = true;
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
  // call the same delete flow and close menu popover
  handleDelete();
  closeMenuPopover();
}

// Reset modal internals when closed
function resetFormState() {
  try {
    searchQuery.value = '';
    selectedProvider.value = null;
    isSelectingProvider.value = false;
    selectedSegment.value = 'inicio';
    providerProducts.value.splice(0, providerProducts.value.length);
    productQuantities.value = {};
    items.value.splice(0, items.value.length);
    items.value.push({ amount: '', accountId: null });
    reassignDate.value = null;
    reassignDateISO.value = null;
    showPicker.value = true;
    reassignInitialShort.value = null;
  } catch (err) {
    // noop
  }
}

// Handler invoked when the ion-modal fires did-dismiss
function onModalDidDismiss() {
  emit('dismiss');
  resetFormState();
}

// Watch isOpen to reset if parent closes the modal programmatically
watch(
  () => props.isOpen,
  opened => {
    if (!opened) {
      setTimeout(() => resetFormState(), 80);
    }
  }
);
// end functions
</script>

<style scoped>
.warning-item {
  margin-top: 8px;
  border: 1px solid var(--ion-color-warning);
  border-radius: 8px;
}

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
