<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="handleBack">
            <ion-icon :icon="arrowBackOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{ pageTitle }}</ion-title>

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
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="4">
            <!-- Provider form -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-card class="shadow1">
                <ion-item
                  class="transparent"
                  button
                  lines="full"
                  @click="showProviderModal = true"
                >
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
                  <ion-label slot="end">{{
                    formatShortDate({ isoDate: reassignDateISO })
                  }}</ion-label>
                </ion-item>
              </ion-card>
            </ion-list>

            <!-- Products section (only in full mode) -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-card class="shadow1">
                <!-- Segment for full mode -->
                <template v-if="!isEntryMode">
                  <ion-item class="transparent" lines="full">
                    <ion-label>Tipo de gasto</ion-label>
                    <ion-select
                      v-model="expenseType"
                      interface="popover"
                      slot="end"
                      style="width: auto"
                      :disabled="!selectedProvider"
                    >
                      <ion-select-option value="simple"
                        >Simple</ion-select-option
                      >
                      <ion-select-option
                        value="multiple"
                        :disabled="!hasProviderProducts"
                        >Múltiple</ion-select-option
                      >
                    </ion-select>

                    <ion-button
                      slot="end"
                      fill="clear"
                      :disabled="!selectedProvider"
                      @click="openInfoPopover({ e: $event })"
                    >
                      <ion-icon
                        slot="icon-only"
                        :icon="informationCircleSharp"
                      ></ion-icon>
                    </ion-button>
                  </ion-item>
                </template>

                <template v-if="selectedProvider">
                  <template v-if="selectedProvider?.products?.length">
                    <template v-if="!isEntryMode && expenseType === 'multiple'">
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
                    </template>
                  </template>
                </template>
              </ion-card>
            </ion-list>

            <!-- Simple mode: single amount -->
            <template
              v-if="
                selectedProvider && !isEntryMode && expenseType === 'simple'
              "
            >
              <div class="ion-padding-start ion-padding-end">
                <ion-list class="transparent">
                  <ion-list-header>
                    <ion-label>Monto</ion-label>
                  </ion-list-header>

                  <ion-card class="shadow1">
                    <ion-item
                      lines="full"
                      class="transparent"
                      button
                      @click="openAccountModal(0)"
                    >
                      <ion-label>
                        Cuenta
                        <p>
                          {{
                            getAccountName(items[0].accountId) ||
                            'Seleccionar cuenta'
                          }}
                        </p>
                      </ion-label>
                    </ion-item>

                    <ion-item lines="full" class="transparent">
                      <ion-input
                        v-model="items[0].amount"
                        label="Cantidad"
                        label-placement="floating"
                        type="number"
                        placeholder="0"
                        :class="{
                          'ion-invalid': isAmountInvalid({ index: 0 }),
                          'ion-touched': isAmountTouched({ index: 0 }),
                        }"
                        :error-text="getAmountError({ index: 0 })"
                      ></ion-input>
                    </ion-item>
                  </ion-card>
                </ion-list>
              </div>
            </template>

            <!-- Products coverage summary (only in multiple mode) -->

            <!-- Items by account section (only in multiple mode) -->
            <template
              v-if="
                selectedProvider && !isEntryMode && expenseType === 'multiple'
              "
            >
              <div class="ion-padding-start ion-padding-end ion-margin-top">
                <ion-list class="transparent">
                  <ion-list-header>
                    <ion-label>
                      Distribución por Cuenta
                      <p class="ion-note" style="margin-top: 4px; opacity: 0.7">
                        Distribuye el total de productos entre las cuentas
                      </p>
                    </ion-label>

                    <ion-button @click="handleAddItem" :disabled="!hasProductsWithQuantity">
                      <ion-icon :icon="addOutline"></ion-icon>
                    </ion-button>
                  </ion-list-header>

                  <!-- Products coverage summary banner -->
                  <ion-card
                    v-if="selectedProvider?.products?.length"
                    class="shadow1 no-shadow"
                    :class="
                      productsCoverage.falta > 0
                        ? 'coverage-card-warning'
                        : 'coverage-card-success'
                    "
                  >
                    <ion-item lines="none">
                      <ion-icon
                        slot="start"
                        :icon="
                          productsCoverage.falta > 0
                            ? warningOutline
                            : checkmarkCircleOutline
                        "
                        :color="
                          productsCoverage.falta > 0 ? 'warning' : 'success'
                        "
                        style="font-size: 24px; margin-right: 12px"
                      ></ion-icon>
                      <ion-label>
                        <div class="coverage-info">
                          <span class="coverage-total"
                            >Total: {{ formatPrice(productsTotal) }}</span
                          >
                          <span class="coverage-entered"
                            >Cubierto:
                            {{ formatPrice(productsCoverage.entered) }}</span
                          >
                          <template v-if="productsCoverage.falta > 0">
                            <span class="coverage-shortage"
                              >Faltante:
                              {{ formatPrice(productsCoverage.falta) }}</span
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

                  <template v-for="(item, index) in reversedItems" :key="index">
                    <ion-card class="shadow1">
                      <div
                        v-if="items.length > 1"
                        style="display: flex; justify-content: flex-end"
                      >
                        <ion-button
                          fill="clear"
                          size="small"
                          :disabled="!hasProductsWithQuantity"
                          @click="
                            removeItem({ index: items.length - 1 - index })
                          "
                        >
                          <ion-icon
                            :icon="closeOutline"
                            color="danger"
                          ></ion-icon>
                        </ion-button>
                      </div>

                      <ion-item
                        lines="full"
                        class="transparent"
                        button
                        :disabled="!hasProductsWithQuantity"
                        @click="openAccountModal(items.length - 1 - index)"
                      >
                        <ion-label>
                          Cuenta
                          <p>
                            {{
                              getAccountName(item.accountId) ||
                              'Seleccionar cuenta'
                            }}
                          </p>
                        </ion-label>
                      </ion-item>

                      <ion-item lines="full" class="transparent">
                        <ion-input
                          v-model="item.amount"
                          label="Cantidad"
                          label-placement="floating"
                          type="number"
                          placeholder="0"
                          :disabled="!hasProductsWithQuantity"
                          :class="{
                            'ion-invalid': isAmountInvalid({
                              index: items.length - 1 - index,
                            }),
                            'ion-touched': isAmountTouched({
                              index: items.length - 1 - index,
                            }),
                          }"
                          :error-text="
                            getAmountError({ index: items.length - 1 - index })
                          "
                        ></ion-input>
                      </ion-item>
                    </ion-card>
                  </template>
                </ion-list>
              </div>
            </template>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
    <!-- end content -->

    <!-- Provider Selection Modal -->
    <ion-modal
      :is-open="showProviderModal"
      @will-dismiss="onProviderModalDismiss"
    >
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
    <ion-modal
      :is-open="showAccountModal"
      @will-dismiss="onAccountModalDismiss"
    >
      <ion-header class="ion-no-border" mode="ios">
        <ion-toolbar>
          <ion-buttons>
            <ion-button @click="showAccountModal = false">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>Seleccionar Cuenta</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="openQuickAccountAlert">
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
          v-if="filteredAccounts.length"
          class="transparent ion-padding-start ion-padding-end"
        >
          <ion-card class="shadow1">
            <ion-item
              v-for="acc in filteredAccounts"
              :key="acc.id"
              lines="full"
              button
              class="transparent"
              @click="selectAccount(acc)"
            >
              <ion-label>{{ acc.name }}</ion-label>
              <ion-label slot="end">{{ acc.type || '' }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-list>

        <div
          v-if="!filteredAccounts.length"
          class="ion-text-center ion-padding"
        >
          <ion-label color="medium">
            Presiona '+' para agregar una nueva cuenta
          </ion-label>
        </div>
      </ion-content>
    </ion-modal>

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

          <ion-label>Eliminar proveedor</ion-label>
        </ion-item>
      </ion-content>
    </ion-popover>

    <ion-popover
      :is-open="popoverInfo.open"
      :event="popoverInfo.event"
      @did-dismiss="popoverInfo.open = false"
    >
      <ion-content>
        <ion-list class="transparent">
          <ion-item lines="full">
            <ion-label>
              <strong>Simple:</strong> Ingresa un monto único para este
              proveedor
            </ion-label>
          </ion-item>

          <ion-item lines="none">
            <ion-label>
              <strong>Múltiple:</strong> Selecciona productos y distribúyelos
              entre múltiples cuentas
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>
    <!-- end popovers -->

    <!-- alerts -->
    <ion-alert
      :is-open="showDeleteAlert"
      header="Confirmar eliminación"
      message="¿Estás seguro de que deseas eliminar este proveedor?"
      :buttons="deleteAlertButtons"
      @did-dismiss="showDeleteAlert = false"
    ></ion-alert>

    <ion-alert
      :is-open="showQuickAccountAlert"
      header="Nueva Cuenta"
      :inputs="quickAccountInputs"
      :buttons="quickAccountButtons"
      @did-dismiss="showQuickAccountAlert = false"
    ></ion-alert>

    <ion-alert
      :is-open="showCoverageAlert"
      header="Total cubierto"
      message="Ya has distribuido el monto total de los productos entre las cuentas existentes."
      :buttons="[{ text: 'Entendido', role: 'cancel' }]"
      @did-dismiss="showCoverageAlert = false"
    ></ion-alert>
    <!-- end alerts -->
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
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonPopover,
  IonDatetime,
  IonAlert,
  IonModal,
  IonGrid,
  IonCol,
} from '@ionic/vue';
import {
  arrowBackOutline,
  closeOutline,
  trashOutline,
  addOutline,
  warningOutline,
  saveOutline,
  ellipsisVerticalOutline,
  checkmarkCircleOutline,
  informationCircleSharp,
} from 'ionicons/icons';
import { ref, computed, reactive, nextTick, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { format } from 'date-fns';
import accountsController from '@/controllers/accountsController';
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

// router
const router = useRouter();
const route = useRoute();
// end router

// main
// end main

// vars and const
const searchQuery = ref('');
const selectedProvider = ref<Supplier | null>(null);
const expenseType = ref<'simple' | 'multiple'>('simple');
const providerProducts = ref<ProviderProduct[]>([]);
const items = ref<
  Array<{
    amount: number | string;
    accountId: string | number | Account | { id: string | number } | null;
  }>
>([{ amount: '', accountId: null }]);
const popoverReassign = reactive({ open: false, event: null as Event | null });
const popoverMenu = reactive({ open: false, event: null as Event | null });
const popoverInfo = reactive({ open: false, event: null as Event | null });
const reassignDate = ref<string | null>(null);
const reassignDateISO = ref<string | null>(null);
const showPicker = ref(true);
const tempPickerDateISO = ref<string | null>(null);

const productQuantityRawValues = ref<Map<string | number, string>>(new Map());

const showProviderModal = ref(false);
const showAccountModal = ref(false);
const selectedAccountIndex = ref<number | null>(null);
const accountSearchQuery = ref('');
const showQuickAccountAlert = ref(false);
const showDeleteAlert = ref(false);
const showCoverageAlert = ref(false);
const quickAccountTargetIndex = ref<number | null>(null);

const quickAccountInputs = ref([
  {
    name: 'accountName',
    type: 'text',
    placeholder: 'Nombre de la cuenta',
    value: '',
  },
  {
    name: 'initialBalance',
    type: 'number',
    placeholder: 'Balance inicial (opcional)',
    value: 0,
  },
]);

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
      createQuickAccount(
        data.accountName.trim(),
        Number(data.initialBalance) || 0
      );
      return true;
    },
  },
];

const deleteAlertButtons = [
  {
    text: 'Cancelar',
    role: 'cancel',
    handler: () => {
      showDeleteAlert.value = false;
    },
  },
  {
    text: 'Eliminar',
    cssClass: 'danger-alert-btn',
    handler: confirmDelete,
  },
];

// Data from route params
const routeMode = computed(() => route.query.mode as string | undefined);
const routeEntryId = computed(
  () => route.query.entryId as string | number | undefined
);
const routeProviderId = computed(
  () => route.query.providerId as string | number | undefined
);

const isEntryMode = computed(() => routeMode.value === 'entry');
// Suppliers list
const allSuppliersList = ref<Supplier[]>([]);

// Compute accounts from controller
const accounts = computed(() => {
  const list = accountsController.getAccounts();
  return list ? JSON.parse(JSON.stringify(list)) : [];
});
// end vars and const

// onMounted - initialize form based on route params
onMounted(async () => {
  // Sync suppliers
  const { SuppliersController } = await import(
    '@/controllers/suppliersController'
  );
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
  const { default: budgetController } = await import(
    '@/controllers/budgetController'
  );
  const { SuppliersController } = await import(
    '@/controllers/suppliersController'
  );
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
      allSuppliers.find(
        (s: Supplier) => String(s.sync_id) === String(supplierSyncId)
      ) ||
      allSuppliers.find(
        (s: Supplier) => String(s.id) === String(supplierSyncId)
      );
  }
  if (!fullSupplier) {
    fullSupplier = allSuppliers.find(
      (s: Supplier) => s.name?.toLowerCase() === providerName.toLowerCase()
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
  const { default: budgetController } = await import(
    '@/controllers/budgetController'
  );
  const { SuppliersController } = await import(
    '@/controllers/suppliersController'
  );
  const suppliersCtrl = new SuppliersController();

  const providerId = routeProviderId.value;
  const providers = budgetController.getProviders();
  const provider = providers.find(
    (p: any) => String(p.id) === String(providerId)
  );

  if (!provider) return;

  const supplierSyncId = provider._supplierId || provider.id;
  const allSuppliers = suppliersCtrl.getSuppliers();
  let fullSupplier: Supplier | null = null;

  if (supplierSyncId) {
    fullSupplier =
      allSuppliers.find(
        (s: Supplier) => String(s.sync_id) === String(supplierSyncId)
      ) ||
      allSuppliers.find(
        (s: Supplier) => String(s.id) === String(supplierSyncId)
      );
  }

  selectedProvider.value = fullSupplier
    ? {
        id: fullSupplier.id,
        sync_id: fullSupplier.sync_id,
        name: provider._supplierName || provider.name,
        products: fullSupplier.products || [],
      }
    : null;

  // Load items from provider
  items.value.splice(0, items.value.length);
  if (
    provider.items &&
    Array.isArray(provider.items) &&
    provider.items.length > 0
  ) {
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
      accountId: provider.accountId
        ? { id: provider.accountId }
        : getDefaultAccountId(),
    });
  }

  // Initialize date
  if (provider.date) {
    reassignDateISO.value = parseDateValue({ raw: provider.date });
    reassignDate.value = String(reassignDateISO.value).slice(0, 10);
  } else {
    await setTodayDate();
  }
}

// watch
watch(expenseType, (newType, oldType) => {
  if (newType === 'simple' && oldType === 'multiple') {
    items.value = items.value.slice(0, 1);
    providerProducts.value = [];
  }
});

watch(selectedProvider, newProvider => {
  if (
    newProvider &&
    !hasProviderProducts.value &&
    expenseType.value === 'multiple'
  ) {
    expenseType.value = 'simple';
  }
});
// end watch

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
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const filteredAccounts = computed(() => {
  if (!accountSearchQuery.value) return accounts.value;
  return accounts.value.filter((acc: Account) =>
    acc.name.toLowerCase().includes(accountSearchQuery.value.toLowerCase())
  );
});

const productsTotal = computed(() => {
  if (!selectedProvider.value?.products) return 0;
  return selectedProvider.value.products.reduce(
    (sum: number, product: Product) => {
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
  if (items.value.length >= accounts.value.length) return false;
  const lastItem = items.value[items.value.length - 1];
  const hasAmount =
    String(lastItem?.amount).trim() !== '' &&
    !isNaN(Number(lastItem.amount)) &&
    Number(lastItem.amount) > 0;
  const hasAccount = lastItem?.accountId != null;
  return hasAmount && hasAccount;
});

const reversedItems = computed(() => {
  return [...items.value].reverse();
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
  if (!selectedProvider.value) return false;

  if (expenseType.value === 'simple') {
    const firstItem = items.value[0];
    const amount = Number(firstItem?.amount);
    const hasAccount = firstItem?.accountId != null;
    return amount > 0 && hasAccount;
  }

  const hasProductsWithQty = providerProducts.value.some(
    p => (p.quantity || 0) > 0
  );
  return hasProductsWithQty && isItemsValid.value;
});

const canApplyReassign = computed(() => {
  const short = tempPickerDateISO.value?.slice(0, 10);
  return short?.length === 10;
});

const hasProviderProducts = computed(() => {
  return selectedProvider.value?.products?.length > 0;
});
// end computed

// functions
function getDefaultAccountId() {
  if (accounts.value.length === 0) return null;
  return isEntryMode.value ? accounts.value[0].id : accounts.value[0];
}

async function setTodayDate() {
  const { default: budgetController } = await import(
    '@/controllers/budgetController'
  );
  const selectedDate = budgetController.getSelectedDate();
  const dateToUse = selectedDate || format(new Date(), 'yyyy-MM-dd');
  reassignDateISO.value = dateToUse + 'T00:00:00';
  reassignDate.value = dateToUse;
}

function initReassignDate() {
  const now = new Date();
  reassignDateISO.value = format(now, 'yyyy-MM-dd') + 'T00:00:00';
  reassignDate.value = String(reassignDateISO.value).slice(0, 10);
}

async function initializeNewProviderMode() {
  selectedProvider.value = null;
  providerProducts.value.splice(0, providerProducts.value.length);
  items.value.splice(0, items.value.length);
  items.value.push({ amount: '', accountId: null });
  await setTodayDate();
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
function _isAccountInvalid(params: { index: number }): boolean {
  const { index } = params;
  const accountId = items.value[index]?.accountId;
  return accountId === null || accountId === undefined;
}

function _isAccountTouched(params: { index: number }): boolean {
  const { index } = params;
  const amount = items.value[index]?.amount;
  return amount !== null && amount !== undefined && String(amount) !== '';
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

function openAccountModal(index: number) {
  selectedAccountIndex.value = index;
  accountSearchQuery.value = '';
  showAccountModal.value = true;
}

function selectAccount(acc: Account) {
  if (selectedAccountIndex.value !== null) {
    items.value[selectedAccountIndex.value].accountId = isEntryMode.value
      ? acc.id
      : { id: acc.id };
  }
  showAccountModal.value = false;
  selectedAccountIndex.value = null;
}

function getAccountName(
  accountId: string | number | Account | { id: string | number } | null
): string {
  if (!accountId) return '';
  const id =
    typeof accountId === 'object'
      ? (accountId as { id: string | number }).id
      : accountId;
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
  if (canAddMoreItems.value) {
    items.value.push({ amount: '', accountId: null });
  }
}

function handleAddItem() {
  if (canAddMoreItems.value) {
    if (productsCoverage.value.falta <= 0) {
      showCoverageAlert.value = true;
      return;
    }
    addItem();
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

async function handleSave() {
  const { default: budgetController } = await import(
    '@/controllers/budgetController'
  );

  const totalAmount = items.value.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const products = providerProducts.value.filter(p => (p.quantity || 0) > 0);

  const selectedDate =
    reassignDate.value || reassignDateISO.value?.slice(0, 10);

  const payload = {
    providerId: selectedProvider.value?.sync_id || selectedProvider.value?.id,
    providerName: selectedProvider.value?.name,
    entryId: routeEntryId.value,
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
  };

  if (isEntryMode.value && routeEntryId.value) {
    // Update existing entry
    const groups = payload.items.map(item => ({
      amount: Number(item.amount) || 0,
      accountId: item.accountId,
    }));

    budgetController.updateIngreso({
      id: Number(routeEntryId.value),
      changes: {
        amount: payload.totalAmount,
        accountId: groups[0]?.accountId || null,
        groups: groups.length > 1 ? groups : undefined,
        _providerName: payload.providerName,
        date: payload.date,
      },
    });
    budgetController.saveData();
  } else if (routeProviderId.value) {
    // Update existing provider
    const firstItem = payload.items[0];
    const firstAccountId = firstItem?.accountId;

    budgetController.updateProvider({
      id: Number(routeProviderId.value),
      changes: {
        estimated: payload.totalAmount,
        accountId: firstAccountId || 0,
        _supplierId: payload.providerId,
        _supplierName: payload.providerName,
        products: payload.products,
        items: payload.items,
        date: payload.date,
      },
    });
    budgetController.saveData();
  } else {
    // Create new provider
    const firstItem = payload.items[0];
    const firstAccountId = firstItem?.accountId;

    budgetController.addProvider({
      name: payload.providerName || '',
      estimated: payload.totalAmount,
      accountId: firstAccountId || 0,
      allowEmpty: true,
      _supplierId: payload.providerId,
      _supplierName: payload.providerName,
      products: payload.products,
      items: payload.items,
      date: payload.date,
    });
    budgetController.saveData();
  }

  router.back();
}

function handleBack() {
  router.back();
}

// Reassign date functions
async function openReassignPopover(params: { e: Event }) {
  const { e } = params;
  if (!reassignDateISO.value) {
    reassignDateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
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

  popoverReassign.open = false;
  popoverReassign.event = null;
}

function openHeaderPopover(params: { e: Event }) {
  const { e } = params;
  popoverMenu.event = e;
  popoverMenu.open = true;
}

function openInfoPopover(params: { e: Event }) {
  const { e } = params;
  popoverInfo.event = e;
  popoverInfo.open = true;
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
  closeMenuPopover();
  showDeleteAlert.value = true;
}

function confirmDelete() {
  return (async () => {
    const { default: budgetController } = await import(
      '@/controllers/budgetController'
    );

    if (isEntryMode.value && routeEntryId.value) {
      budgetController.removeIngreso({ id: Number(routeEntryId.value) });
      budgetController.saveData();
    } else if (routeProviderId.value) {
      budgetController.removeProvider({ id: Number(routeProviderId.value) });
      budgetController.saveData();
    }

    showDeleteAlert.value = false;
    router.back();
  })();
}

function openQuickAccountAlert(itemIndex?: number) {
  quickAccountInputs.value = [
    {
      name: 'accountName',
      type: 'text',
      placeholder: 'Nombre de la cuenta',
      value: '',
    },
    {
      name: 'initialBalance',
      type: 'number',
      placeholder: 'Balance inicial (opcional)',
      value: 0,
    },
  ];
  const indexToUse = itemIndex ?? selectedAccountIndex.value;
  if (indexToUse !== null) {
    quickAccountTargetIndex.value = indexToUse;
  }
  showQuickAccountAlert.value = true;
}

async function createQuickAccount(name: string, initialBalance: number) {
  const newAccount = await accountsController.addAccount({
    a: {
      name,
      initialBalance,
    },
  });

  if (newAccount) {
    if (quickAccountTargetIndex.value !== null && !canAddMoreItems.value) {
      addItem();
      const lastIdx = items.value.length - 1;
      items.value[lastIdx].accountId = isEntryMode.value
        ? newAccount.id
        : { id: newAccount.id };
    } else if (quickAccountTargetIndex.value !== null) {
      const idx = quickAccountTargetIndex.value;
      if (items.value[idx]) {
        items.value[idx].accountId = isEntryMode.value
          ? newAccount.id
          : { id: newAccount.id };
      }
    }
  }

  quickAccountTargetIndex.value = null;
}

// Expose for parent if needed
defineExpose({
  handleSave,
  handleBack,
});
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

<style>
button.alert-button.danger-alert-btn {
  color: var(--ion-color-danger);
}
</style>
