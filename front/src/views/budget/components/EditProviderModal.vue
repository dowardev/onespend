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
            @click="selectProvider(p)"
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
                      @click="removeItem(index)"
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
                      <p>{{ formatPrice(product.price) }}</p>
                    </ion-label>

                    <ion-input
                      slot="end"
                      type="number"
                      placeholder="0"
                      :value="productQuantities[product.name]"
                      style="width: 80px; text-align: end"
                      @ion-input="
                        productQuantities[product.name] = Number(
                          $event.detail.value
                        )
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
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
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

interface ProviderItem {
  amount: number;
  accountId: any;
}

interface Account {
  id: string | number;
  name: string;
  type?: string;
}

interface Supplier {
  id?: string | number;
  name: string;
  products?: Array<{ name: string; price: number }>;
}

interface Props {
  isOpen: boolean;
  // For editing existing provider/entry
  provider?: any;
  // For entry mode (editing an entry from the registry)
  entryData?: {
    name: string;
    entryId: string | number | null;
    items: ProviderItem[];
  };
  // List of available suppliers (for search)
  suppliers?: Supplier[];
  // List of available accounts
  accounts: Account[];
  // Mode: 'entry' for editing entries, 'provider' for full provider management
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
      productQuantities?: Record<string, number>;
    }
  ): void;
  (e: 'deleted', id: string | number): void;
}>();

const { isOpen, provider, entryData, suppliers, accounts, mode } =
  toRefs(props);

// State
const searchQuery = ref('');
const selectedProvider = ref<Supplier | null>(null);
const selectedSegment = ref('inicio');
const productQuantities = ref<Record<string, number>>({});
const items = ref<ProviderItem[]>([{ amount: 0, accountId: null }]);

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
  return selectedProvider.value.products.reduce((sum: number, product: any) => {
    const qty = productQuantities.value[product.name] || 0;
    return sum + qty * (product.price || 0);
  }, 0);
});

const hasProductsWithQuantity = computed(() => {
  if (!selectedProvider.value?.products) return false;
  return selectedProvider.value.products.some((product: any) => {
    return (productQuantities.value[product.name] || 0) > 0;
  });
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

// Methods
const getDefaultAccountId = () => {
  if (accounts.value.length === 0) return null;
  return isEntryMode.value ? accounts.value[0].id : accounts.value[0];
};

const availableAccountsForItem = (currentIndex: number) => {
  const usedAccountIds = items.value
    .filter((_: any, idx: number) => idx !== currentIndex)
    .map((item: any) => {
      if (isEntryMode.value) {
        return String(item.accountId);
      }
      return String(item.accountId?.id ?? item.accountId);
    })
    .filter((id: string) => id !== 'null' && id !== 'undefined' && id !== '');

  return accounts.value.filter(
    (acc: Account) => !usedAccountIds.includes(String(acc.id))
  );
};

function selectProvider(p: Supplier) {
  selectedProvider.value = p;
}

function changeProvider() {
  selectedProvider.value = null;
  selectedSegment.value = 'inicio';
  productQuantities.value = {};
}

function compareAccounts(o1: any, o2: any) {
  if (o1 === o2) return true;
  if (o1 && o2) {
    if (typeof o1 === 'object' && typeof o2 === 'object') {
      return o1.id === o2.id;
    }
    return String(o1) === String(o2);
  }
  return false;
}

function formatPrice(price: number) {
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

function removeItem(index: number) {
  if (items.value.length > 1) {
    items.value.splice(index, 1);
  }
}

function handleSave() {
  const totalAmount = items.value.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  emit('saved', {
    providerId: selectedProvider.value?.id,
    providerName: selectedProvider.value?.name,
    entryId: entryData.value?.entryId,
    items: items.value.map(item => ({
      amount: Number(item.amount) || 0,
      accountId: isEntryMode.value
        ? item.accountId
        : (item.accountId?.id ?? item.accountId),
    })),
    totalAmount,
    productQuantities: productQuantities.value,
  });
}

function handleDelete() {
  if (isEntryMode.value && entryData.value?.entryId) {
    emit('deleted', entryData.value.entryId);
  } else if (provider.value?.id) {
    emit('deleted', provider.value.id);
  }
}

// Watchers - reset state when modal opens/closes or data changes
watch(isOpen, async newVal => {
  if (newVal) {
    // Modal opened - initialize state
    if (isEntryMode.value && entryData.value) {
      // Entry mode - use provided entry data
      items.value = entryData.value.items.map(item => ({
        amount: Number(item.amount) || 0,
        accountId: item.accountId,
      }));
    } else if (provider.value) {
      // Provider mode with existing provider - load data
      // Find the full supplier from the suppliers list to get products
      const supplierId = provider.value._supplierId || provider.value.id;
      const fullSupplier =
        suppliers.value.find(
          (s: Supplier) => String(s.id) === String(supplierId)
        ) ||
        suppliers.value.find(
          (s: Supplier) =>
            s.name?.toLowerCase() === provider.value?.name?.toLowerCase()
        );

      selectedProvider.value = {
        id: supplierId,
        name: provider.value._supplierName || provider.value.name,
        products: fullSupplier?.products || provider.value.products || [],
      };
      items.value = [
        {
          amount: provider.value.estimated || 0,
          accountId: provider.value.accountId
            ? { id: provider.value.accountId }
            : getDefaultAccountId(),
        },
      ];
    } else {
      // Provider mode - new provider
      selectedProvider.value = null;
      items.value = [{ amount: 0, accountId: getDefaultAccountId() }];
    }
    selectedSegment.value = 'inicio';
    productQuantities.value = {};
    searchQuery.value = '';
  }
});

// Watch for external provider data updates
watch(
  () => props.provider,
  newProvider => {
    if (isOpen.value && newProvider && !isEntryMode.value) {
      // Find the full supplier from the suppliers list to get products
      const supplierId = newProvider._supplierId || newProvider.id;
      const fullSupplier =
        suppliers.value.find(
          (s: Supplier) => String(s.id) === String(supplierId)
        ) ||
        suppliers.value.find(
          (s: Supplier) =>
            s.name?.toLowerCase() === newProvider?.name?.toLowerCase()
        );

      selectedProvider.value = {
        id: supplierId,
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
    }
  },
  { deep: true }
);
</script>

<style scoped>
.warning-item {
  margin-top: 8px;
  border: 1px solid var(--ion-color-warning);
  border-radius: 8px;
}
</style>
