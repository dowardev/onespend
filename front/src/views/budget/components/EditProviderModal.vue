<template>
  <ion-modal
    :is-open="isOpen"
    :keep-contents-mounted="true"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="$emit('dismiss')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{ modalTitle }}</ion-title>

        <ion-buttons slot="end">
          <ion-button v-if="canDelete" color="danger" @click="handleDelete">
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>

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
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Provider search (only in full mode when no provider selected) -->
      <template v-if="!isEntryMode && !selectedProvider">
        <ion-item lines="none">
          <ion-searchbar
            v-model="searchQuery"
            mode="ios"
            placeholder="Buscar proveedor"
            class="ion-no-padding"
          ></ion-searchbar>
        </ion-item>

        <ion-list class="transparent">
<ion-item
              v-for="p in filteredProviders"
              :key="p.id"
              lines="full"
              button
              class="transparent"
              @click="selectProvider({ p })"
            >
            <ion-label>{{ p.name }}</ion-label>
          </ion-item>
        </ion-list>
      </template>

      <!-- Provider form (when provider is selected or in entry mode) -->
      <div v-else>
        <ion-item button lines="full" @click="changeProvider">
          <ion-label>
            {{ providerName }}
          </ion-label>
        </ion-item>

        <div class="ion-padding-start ion-padding-end">
          <!-- Segment for full mode (always show when provider is selected) -->
          <ion-segment v-if="!isEntryMode" v-model="selectedSegment">
            <ion-segment-button value="inicio">
              <ion-label>Inicio</ion-label>
            </ion-segment-button>

            <ion-segment-button value="productos">
              <ion-label>Productos</ion-label>
            </ion-segment-button>
          </ion-segment>

          <!-- Amounts by account section -->
          <div v-if="selectedSegment === 'inicio'" class="ion-margin-top">
            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>Cantidades por Cuenta</ion-label>

                <ion-button :disabled="!canAddMoreItems" @click="addItem">
                  <ion-icon :icon="addOutline"></ion-icon>
                  Agregar
                </ion-button>
              </ion-list-header>

              <div class="list-content">
                <ion-card
                  v-for="(item, index) in items"
                  :key="index"
                  class="shadow2"
                >
                  <ion-item lines="full" class="transparent">
                    <ion-label position="stacked">Cantidad</ion-label>

                    <ion-input
                      v-model.number="item.amount"
                      type="number"
                      placeholder="0"
                    ></ion-input>
                  </ion-item>

                  <ion-item lines="full" class="transparent">
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
                        :value="isEntryMode ? acc.id : acc"
                      >
                        {{ acc.name }} {{ acc.type ? `(${acc.type})` : '' }}
                      </ion-select-option>
                    </ion-select>
                  </ion-item>

                  <ion-item
                    v-if="items.length > 1"
                    class="transparent"
                    lines="none"
                  >
                    <ion-button
                      slot="end"
                      fill="clear"
                      color="danger"
                      @click="removeItem({ index })"
                    >
                      <ion-icon :icon="trashOutline"></ion-icon>
                    </ion-button>
                  </ion-item>
                </ion-card>
              </div>
            </ion-list>

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
          </div>

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
                      @ion-input="e => setProductQuantity({ product, productPrice: product.price, quantity: Number(e.detail.value) })"
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
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
// Imports
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
} from '@ionic/vue';
import {
  closeOutline,
  trashOutline,
  addOutline,
  warningOutline,
  saveOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
import { ref, computed, watch, toRefs } from 'vue';
// End Imports

// Components

// End Components

// Vars
interface ProviderItem {
  amount: number;
  accountId: string | number | null;
}

interface Account {
  id: string | number;
  name: string;
  type?: string;
}

interface Supplier {
  id?: string | number;
  sync_id?: string;
  name: string;
  products?: Array<Product>;
}

interface Product {
  id?: string | number;
  sync_id?: string;
  name: string;
  price: number;
}

interface ProviderProduct {
  supplierProductId: string | number;
  productName: string;
  productPrice: number;
  quantity: number;
}

interface PendingProduct {
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

interface ProviderData {
  id?: string | number;
  _supplierId?: string | number;
  _supplierName?: string;
  _supplier?: Supplier;
  name: string;
  estimated?: number;
  accountId?: string | number;
  products?: Array<PendingProduct>;
}

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
}>();

const { isOpen, provider, entryData, suppliers, accounts, mode } =
  toRefs(props);

const searchQuery = ref('');
const selectedProvider = ref<Supplier | null>(null);
const selectedSegment = ref('inicio');
const providerProducts = ref<ProviderProduct[]>([]);
const productQuantities = ref<Record<string, number>>({});
const items = ref<ProviderItem[]>([{ amount: 0, accountId: null }]);
// End Vars

// Functions
const getDefaultAccountId = () => {
  if (accounts.value.length === 0) return null;
  return isEntryMode.value ? accounts.value[0].id : accounts.value[0];
};

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

function selectProvider(params: { p: Supplier }) {
  const { p } = params;
  console.log('selectProvider - supplier:', JSON.stringify({
    id: p.id,
    sync_id: p.sync_id,
    name: p.name,
    products: p.products?.map((prod: Product) => ({
      id: prod.id,
      sync_id: prod.sync_id,
      name: prod.name,
      price: prod.price
    }))
  }));
  
  selectedProvider.value = p;
  
  providerProducts.value = p.products?.map((prod: Product) => ({
    supplierProductId: prod.sync_id ?? prod.id,
    productName: prod.name,
    productPrice: prod.price,
    quantity: 0,
  })) || [];
  
  console.log('selectProvider - providerProducts reset:', JSON.stringify(providerProducts.value));
}

function changeProvider() {
  selectedProvider.value = null;
  selectedSegment.value = 'inicio';
  productQuantities.value = {};
}

function compareAccounts(params: { o1: Account | string | number; o2: Account | string | number }) {
  const { o1, o2 } = params;
  if (o1 === o2) return true;
  if (o1 && o2) {
    if (typeof o1 === 'object' && typeof o2 === 'object') {
      return o1.id === o2.id;
    }
    return String(o1) === String(o2);
  }
  return false;
}

function formatPrice(params: { price: number }) {
  const { price } = params;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(price || 0);
}

function addItem() {
  if (canAddMoreItems.value) {
    items.value.push({ amount: 0, accountId: getDefaultAccountId() });
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

function setProductQuantity(params: { product: Product; productPrice: number; quantity: number }) {
  const { product, productPrice, quantity } = params;
  const productId = product?.sync_id ?? product?.id ?? product?.supplierProductId;
  const productName = product?.name;
  console.log('setProductQuantity - product:', JSON.stringify({
    id: product?.id,
    sync_id: product?.sync_id,
    supplierProductId: product?.supplierProductId,
    name: product?.name,
    price: product?.price
  }), 'productName:', productName, 'productId:', productId, 'quantity:', quantity);
  const existing = providerProducts.value.find(p => {
    if (productId) {
      return String(p.supplierProductId) === String(productId);
    }
    return p.productName === productName && p.productPrice === productPrice;
  });
  
  if (existing) {
    existing.quantity = quantity;
  } else {
    const fallbackId = productId 
      ? productId 
      : `manual_${String(productName).toLowerCase().replace(/\s+/g, '_')}_${productPrice}`;
    
    providerProducts.value.push({
      supplierProductId: fallbackId,
      productName,
      productPrice,
      quantity,
    });
  }
}

function handleSave() {
  const totalAmount = items.value.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const products = providerProducts.value.filter(p => (p.quantity || 0) > 0);
  
  console.log('EditProviderModal.handleSave - providerProducts.value:', providerProducts.value);
  console.log('EditProviderModal.handleSave - filtered products:', products);

  emit('saved', {
    providerId: selectedProvider.value?.sync_id || selectedProvider.value?.id,
    providerName: selectedProvider.value?.name,
    entryId: entryData.value?.entryId,
    items: items.value.map(item => ({
      amount: Number(item.amount) || 0,
      accountId: isEntryMode.value
        ? item.accountId
        : (item.accountId?.id ?? item.accountId),
    })),
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
// End Functions

// Life cycle

// End Life cycle

// Computed
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
  return selectedProvider.value.products.reduce((sum: number, product: Product) => {
    const providerProduct = providerProducts.value.find(p => p.supplierProductId === product.id);
    const qty = providerProduct?.quantity || 0;
    return sum + qty * (product.price || 0);
  }, 0);
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
  return items.value.every(
    item => Number(item.amount) > 0 && item.accountId != null
  );
});

const isFormValid = computed(() => {
  if (isEntryMode.value) {
    return isItemsValid.value;
  }
  return selectedProvider.value != null && isItemsValid.value;
});
// End Computed

// Watch
watch(isOpen, async newVal => {
  if (newVal) {
    // Modal opened - initialize state
    if (isEntryMode.value && entryData.value) {
      // Entry mode - use provided entry data
      items.value = entryData.value.items.map(item => ({
        amount: Number(item.amount) || 0,
        accountId: item.accountId,
      }));
      providerProducts.value = [];
    } else if (provider.value) {
      // Provider mode with existing provider - load data
      // _supplierId ahora contiene el sync_id del supplier (ID de MySQL)
      const supplierSyncId = provider.value._supplierId || provider.value.id;
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
        name: provider.value._supplierName || provider.value.name,
        products: fullSupplier?.products || [],
      };
      items.value = [
        {
          amount: provider.value.estimated || 0,
          accountId: provider.value.accountId
            ? { id: provider.value.accountId }
            : getDefaultAccountId(),
        },
      ];
      // Load existing products
      if (fullSupplier?.products && Array.isArray(fullSupplier.products)) {
        providerProducts.value = fullSupplier.products.map((p: Product) => ({
          supplierProductId: p.sync_id ?? p.id,
          productName: p.name,
          productPrice: p.price,
          quantity: 0,
        }));
      } else if (provider.value.products && Array.isArray(provider.value.products)) {
        providerProducts.value = provider.value.products.map((p: PendingProduct) => ({
          supplierProductId: p.supplierProductId || p.supplier_product_id || p.sync_id || p.id || `manual_${String(p.productName || p.name).toLowerCase().replace(/\s+/g, '_')}_${p.productPrice || p.price}`,
          productName: p.productName || p.product_name || p.name || '',
          productPrice: p.productPrice || p.product_price || p.price || 0,
          quantity: p.quantity || 0,
        }));
      } else {
        providerProducts.value = [];
      }
    } else {
      // Provider mode - new provider
      selectedProvider.value = null;
      providerProducts.value = [];
      items.value = [{ amount: 0, accountId: getDefaultAccountId() }];
    }
    selectedSegment.value = 'inicio';
    searchQuery.value = '';
  }
});

// Watch for external provider data updates
watch(
  () => props.provider,
  newProvider => {
    if (isOpen.value && newProvider && !isEntryMode.value) {
      // _supplierId ahora contiene el sync_id del supplier (ID de MySQL)
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
        sync_id: fullSupplier?.sync_id || supplierSyncId,
        name: newProvider._supplierName || newProvider.name,
        products: fullSupplier?.products || newProvider.products || [],
      };
      items.value = [
        {
          amount: newProvider.estimated || 0,
          accountId: newProvider.accountId
            ? { id: newProvider.accountId }
            : getDefaultAccountId(),
        },
      ];
      if (newProvider.products && Array.isArray(newProvider.products)) {
        providerProducts.value = newProvider.products.map((p: PendingProduct) => ({
          supplierProductId: p.supplierProductId || p.sync_id || p.id || `${p.name}-${p.price}`,
          productName: p.productName || p.name || '',
          productPrice: p.productPrice || p.price || 0,
          quantity: p.quantity || 0,
        }));
      } else {
        providerProducts.value = [];
      }
    }
  },
  { deep: true }
);
// End Watch
</script>

<style scoped>
.warning-item {
  margin-top: 8px;
  border: 1px solid var(--ion-color-warning);
  border-radius: 8px;
}
</style>
