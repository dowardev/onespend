<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="12" size-md="4" size-lg="6" size-xl="4">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Registro</ion-label>

            <ion-button
              :disabled="isDayClosed"
              @click="openAddEntryModal"
            >
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>
          </ion-list-header>

          <div class="list-content" style="flex: 1 1 auto; min-height: 0">
            <div
              class="color-legend"
              style="
                border-bottom: 1px solid var(--ion-background-color-step-200);
              "
            >
              <span class="legend-item">
                <span class="legend-color success"></span>
                Ingreso
              </span>

              <span class="legend-item">
                <span class="legend-color danger"></span>
                Egreso
              </span>
            </div>

            <div class="scroll-content">
              <template v-if="budgetController.getEntries().length > 0">
                <template
                  v-for="(block, bIdx) in renderedEntries"
                  :key="blockKey(block, bIdx)"
                >
                  <ion-item
                    v-if="block.type === 'item'"
                    :lines="
                      bIdx === renderedEntries.length - 1 ? 'none' : 'full'
                    "
                    class="transparent"
                    button
                    :disabled="isDayClosed"
                    @click="handleEntryClick(block.item)"
                  >
                    <ion-label>
                      {{ block.item._providerName || block.item.name || '-' }}
                      <p>{{ formatTimeLocal(block.item.createdAt) }}</p>
                    </ion-label>

                    <ion-label
                      slot="end"
                      class="ion-text-end"
                      :style="`color: ${block.item.entryType === 'egreso' ? 'var(--ion-color-danger)' : 'var(--ion-color-success)'}`"
                    >
                      {{ formatCurrencyLocal({ v: block.item.amount || 0 }) }}

                      <p>
                        {{ getEntryAccountInfo(block.item).name }}:
                        {{
                          formatCurrencyLocal({
                            v: getAccountRemaining(
                              getEntryAccountInfo(block.item).accountId,
                              block.item.id
                            ),
                          })
                        }}
                      </p>
                    </ion-label>
                  </ion-item>
                </template>
              </template>

              <template v-else>
                <div class="ion-padding">
                  <ion-label
                    >Pulsa el botón "+" para agregar un nuevo ingreso</ion-label
                  >
                </div>
              </template>
            </div>
          </div>
        </ion-list>
      </ion-col>

      <ion-col size="12" size-md="4" size-lg="6" size-xl="4">
        <AccountCards :accounts="accountsWithBalance" />

        <!-- Resultado Total Card -->
        <ion-card class="shadow1">
          <div
            class="ion-padding-start ion-padding-top"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
            "
          >
            <div style="display: flex; align-items: center">
              <ion-card-title :color="totalDifferenceColor">{{
                totalDifferenceLabel
              }}</ion-card-title>
            </div>

            <ion-button fill="clear">
              <ion-icon :icon="informationCircleOutline"></ion-icon>
            </ion-button>
          </div>

          <ion-card-content>
            <p>
              <span style="color: var(--ion-color-success)"
                >Ingresos: {{ formatCurrencyLocal({ v: totalIngresos }) }}</span
              >
              <br>
              <span style="color: var(--ion-color-danger)"
                >Gastos: {{ formatCurrencyLocal({ v: totalEgresos }) }}</span
              >
            </p>
          </ion-card-content>
        </ion-card>
      </ion-col>
    </ion-row>
  </ion-grid>

  <!-- Edit Provider Entry Modal -->
  <EditProviderModal
    :is-open="editProviderModalOpen"
    :provider="editProviderData"
    :suppliers="allSuppliers"
    :accounts="accountsList"
    mode="provider"
    @dismiss="editProviderModalOpen = false"
    @saved="handleProviderEntrySaved"
    @deleted="handleProviderEntryDeleted"
  />

  <EditEntryModal
    :is-open="editEntryModalOpen"
    :entry-data="editEntryModalData"
    :accounts-list="accountsList"
    :is-day-closed="isDayClosed"
    :providers-today-with-data="providersTodayWithData"
    @dismiss="editEntryModalOpen = false"
    @save="saveEntryChanges"
    @delete="deleteEntry"
    @quick-account="openQuickAccountAlert"
    @select-provider="selectProvider"
  />

  <ion-alert
    :is-open="showDeleteAlert"
    header="Confirmar eliminación"
    message="¿Estás seguro de que deseas eliminar esta entrada?"
    :buttons="[
      {
        text: 'Cancelar',
        role: 'cancel',
        handler: () => {
          showDeleteAlert = false;
        },
      },
      { text: 'Eliminar', role: 'confirm', handler: confirmDelete },
    ]"
    @did-dismiss="showDeleteAlert = false"
  ></ion-alert>

  <ion-alert
    :is-open="showQuickAccountAlert"
    header="Nueva Cuenta"
    :inputs="quickAccountInputs"
    :buttons="quickAccountButtons"
    @did-dismiss="showQuickAccountAlert = false"
  ></ion-alert>
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
  IonSelect,
  IonSelectOption,
  IonInput,
  IonNote,
  IonItem,
  IonContent,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonCard,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonAlert,
} from '@ionic/vue';
import {
  addOutline,
  closeOutline,
  saveOutline,
  transgenderOutline,
  trashOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import AccountCards from './components/AccountCards.vue';
import EditProviderModal from './components/EditProviderModal.vue';
import EditEntryModal from './components/EditEntryModal.vue';
import { computed, ref, onMounted, reactive, watch } from 'vue';
import budgetController from '@/controllers/budgetController';
import { BudgetController } from '@/controllers/budgetController';
import accountsController from '@/controllers/accountsController';
import suppliersController from '@/controllers/suppliersController';

// Components

// Vars
const budgetCtrl = new BudgetController();

const addEntrySegment = ref('entry');
const showDeleteAlert = ref(false);

const showQuickAccountAlert = ref(false);
const quickAccountTargetIndex = ref<number | null>(null);

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
      createQuickAccount(
        data.accountName.trim(),
        Number(data.initialBalance) || 0
      );
      return true;
    },
  },
];

const editProviderModalOpen = ref(false);
const editProviderData = ref<any>(null);
const allSuppliers = computed(() => suppliersController.getSuppliers());

const editingProviderEntryId = ref<string | number | null>(null);

const editEntryModalOpen = ref(false);
const editEntryModalData = ref({
  id: null as string | number | null,
  entryType: 'ingreso' as 'ingreso' | 'egreso',
  name: '',
});

const entryItems = ref<Array<{ amount: number; accountId: any }>>([
  { amount: 0, accountId: null },
]);

const entryFormState = reactive({
  name: '',
  entryType: 'ingreso',
  items: [{ amount: 0, accountId: null }],
});

const editingProviderId = ref<string | number | null>(null);

// Computed
const isDayClosed = computed(() => budgetCtrl.getIsDayClosed());
const frozenSnapshot = computed(() => budgetCtrl.getFrozenSnapshot());

const accountsList = computed(() => {
  const list = accountsController.getAccounts();
  if (!list || !Array.isArray(list)) return [] as any[];
  return list.filter((acc: any) => acc != null && acc.id != null) as any[];
});

const isItemsValid = computed(() => {
  return entryFormState.items.every(
    item => Number(item.amount) > 0 && item.accountId != null
  );
});

const isFormValid = computed(() => {
  return (
    editEntryModalData.value.name.trim().length > 0 &&
    editEntryModalData.value.entryType &&
    entryItems.value.length > 0 &&
    entryItems.value.every(item => Number(item.amount) > 0 && item.accountId != null)
  );
});

const availableAccountsForItem = (currentIndex: number) => {
  const usedAccountIds = entryItems.value
    .filter((_: any, idx: number) => idx !== currentIndex)
    .map((item: any) => String(item.accountId))
    .filter((id: string) => id !== 'null' && id !== 'undefined' && id !== '');
  return accountsList.value.filter(
    (acc: any) => !usedAccountIds.includes(String(acc.id))
  );
};

const canAddMoreItems = computed(() => {
  const availableAccounts = accountsList.value.length;
  return entryItems.value.length < availableAccounts + 2;
});

function calculateAccountBalance(acc: any, accountId: string | number) {
  const initialBalance = Number(acc.initialBalance) || 0;

  const entries = isDayClosed.value && frozenSnapshot.value
    ? frozenSnapshot.value.entries
    : budgetController.getEntries();

  const entriesForAccount = entries.filter((e: any) => {
    if (String(e.accountId) === String(accountId)) return true;
    if (e.groups && Array.isArray(e.groups)) {
      return e.groups.some(
        (g: any) => String(g.accountId) === String(accountId)
      );
    }
    return false;
  });

  const ingresos = entriesForAccount
    .filter((e: any) => e.entryType === 'ingreso')
    .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  const egresos = entriesForAccount
    .filter((e: any) => e.entryType === 'egreso')
    .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  return {
    ...acc,
    initialBalance,
    ingresos,
    egresos,
    balance: initialBalance + ingresos - egresos,
    hasTransactions: ingresos > 0 || egresos > 0,
  };
}

const accountsWithBalance = computed(() => {
  const result = accountsList.value.map((acc: any) =>
    calculateAccountBalance(acc, acc.id)
  );

  const withTransactions = result
    .filter((acc: any) => acc.hasTransactions)
    .sort((a: any, b: any) => b.balance - a.balance);

  const withoutTransactions = result
    .filter((acc: any) => !acc.hasTransactions)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return [...withTransactions, ...withoutTransactions];
});

const totalIngresos = computed(() => {
  const entries = isDayClosed.value && frozenSnapshot.value
    ? frozenSnapshot.value.entries
    : budgetController.getEntries();
  return entries
    .filter((e: any) => e.entryType === 'ingreso')
    .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
});

const totalEgresos = computed(() => {
  const entries = isDayClosed.value && frozenSnapshot.value
    ? frozenSnapshot.value.entries
    : budgetController.getEntries();
  return entries
    .filter((e: any) => e.entryType === 'egreso')
    .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
});

const totalDifference = computed(() => {
  return totalIngresos.value - totalEgresos.value;
});

const totalDifferenceLabel = computed(() => {
  const d = totalDifference.value;
  if (d === 0) return '$0';
  const formatted = formatCurrencyLocal({ v: Math.abs(d) });
  return d > 0 ? `+${formatted}` : `-${formatted}`;
});

const totalDifferenceColor = computed(() => {
  const d = totalDifference.value;
  if (d === 0) return undefined;
  return d > 0 ? 'success' : 'danger';
});

const providersToday = computed(() => {
  const sel = String(budgetController.getSelectedDate() || '').slice(0, 10);
  if (!sel) return [];
  const addedIds = budgetController.getProviderIdsWithEntries();
  return budgetController
    .getProviders()
    .filter(
      (p: any) =>
        String(p.date || '').slice(0, 10) === sel && !addedIds.has(p.id)
    );
});

const providersTodayWithData = computed(() => {
  return providersToday.value.filter((p: any) => {
    return Number(p?.estimated) > 0;
  });
});

const renderedEntries = computed(() => {
  const entries = isDayClosed.value && frozenSnapshot.value
    ? frozenSnapshot.value.entries
    : budgetController.getEntries();
  return entries.map((item: any) => ({ type: 'item', item }));
});

// Watch
watch(
  () => entryItems.value,
  newItems => {
    entryFormState.items = newItems.map(item => ({
      amount: Number(item.amount) || 0,
      accountId: item.accountId,
    }));
  },
  { deep: true }
);

watch(
  () => editEntryModalData.value.name,
  newName => {
    entryFormState.name = newName;
  }
);

watch(
  () => editEntryModalData.value.entryType,
  newType => {
    entryFormState.entryType = newType;
  }
);

// Life cycle
onMounted(() => {
  accountsController.loadAll();
});

// Functions
function getDefaultAccountId() {
  const accounts = accountsList.value;
  return accounts.length > 0 ? accounts[0].id : null;
}

function openQuickAccountAlert(itemIndex: number) {
  quickAccountTargetIndex.value = itemIndex;
  showQuickAccountAlert.value = true;
}

async function createQuickAccount(name: string, initialBalance: number) {
  const newAccount = await accountsController.addAccount({
    name,
    initialBalance,
  });

  if (newAccount && quickAccountTargetIndex.value !== null) {
    const idx = quickAccountTargetIndex.value;
    if (entryItems.value[idx]) {
      entryItems.value[idx].accountId = newAccount.id;
    }
  }

  quickAccountTargetIndex.value = null;
}

function formatCurrencyLocal(params: { v: number }) {
  const { v } = params || { v: 0 };
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(v || 0);
}

function formatTimeLocal(ms?: number) {
  if (!ms) return '';
  return new Date(Number(ms)).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function openAddEntryModal() {
  console.log('=== openAddEntryModal called ===');
  addEntrySegment.value = 'entry';
  editEntryModalData.value = {
    id: null,
    entryType: 'ingreso',
    name: '',
  };
  entryFormState.name = '';
  entryFormState.entryType = 'ingreso';
  entryFormState.items = [{ amount: 0, accountId: getDefaultAccountId() }];
  entryItems.value = [...entryFormState.items];
  editEntryModalOpen.value = true;
  console.log('editEntryModalData.id after set:', editEntryModalData.value.id);
}

function formatProviderAmount(provider: any) {
  return formatCurrencyLocal({ v: Number(provider?.estimated) || 0 });
}

function selectProvider(provider: any) {
  if (!provider.accountId) {
    return;
  }
  budgetController.addProviderEgresos(provider);
  budgetController.saveData();
  editEntryModalOpen.value = false;
}

function blockKey(block: any, idx: number) {
  if (!block) return `b-${idx}`;
  return `i-${String((block.item && block.item.id) || idx)}`;
}

function getAccountName(accountId: string | number | null | undefined) {
  if (!accountId) return '';
  const account = accountsList.value.find(
    (a: any) => String(a.id) === String(accountId)
  );
  return account?.name || '';
}

function getEntryAccountInfo(item: any) {
  if (item.groups && Array.isArray(item.groups) && item.groups.length > 0) {
    const accountIds = item.groups
      .map((g: any) => g.accountId)
      .filter((id: any) => id != null);
    const uniqueAccountIds = [...new Set(accountIds.map(String))];

    if (uniqueAccountIds.length > 1) {
      return { name: 'Varios', accountId: null };
    }
    const accountId =
      (uniqueAccountIds[0] as string | number | undefined) ?? null;
    return { name: getAccountName(accountId), accountId };
  }
  return {
    name: getAccountName(item.accountId),
    accountId: item.accountId ?? null,
  };
}

function getAccountRemaining(
  accountId: string | number | null | undefined,
  entryId?: string | number | null
) {
  if (!accountId) return 0;
  const account = accountsList.value.find(
    (a: any) => String(a.id) === String(accountId)
  );
  if (!account) return 0;

  const initialBalance = Number(account.initialBalance) || 0;

  const entries = isDayClosed.value && frozenSnapshot.value
    ? frozenSnapshot.value.entries
    : budgetController.getEntries();

  const entriesForAccount = entries.filter((e: any) => {
    if (String(e.accountId) === String(accountId)) return true;
    if (e.groups && Array.isArray(e.groups)) {
      return e.groups.some(
        (g: any) => String(g.accountId) === String(accountId)
      );
    }
    return false;
  });

  let cutoffTime = Infinity;
  if (entryId) {
    const currentEntry = entriesForAccount.find((e: any) => e.id === entryId);
    if (currentEntry) {
      cutoffTime = Number(currentEntry.createdAt) || Infinity;
    }
  }

  const filteredEntries =
    cutoffTime === Infinity
      ? entriesForAccount
      : entriesForAccount.filter((e: any) => Number(e.createdAt) <= cutoffTime);

  const ingresos = filteredEntries
    .filter((e: any) => e.entryType === 'ingreso')
    .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  const egresos = filteredEntries
    .filter((e: any) => e.entryType === 'egreso')
    .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  return initialBalance + ingresos - egresos;
}

function isProviderEntry(item: any) {
  return (
    item.entryType === 'egreso' &&
    (item._fromProviderGroupId || item._providerName)
  );
}

function handleEntryClick(item: any) {
  if (isProviderEntry(item)) {
    openEditProviderModal(item);
  } else {
    openEditEntryModal(item);
  }
}

async function openEditProviderModal(item: any) {
  editingProviderEntryId.value = item.id;

  await suppliersController.listSuppliers();

  const providerName = item._providerName || item.name || '';
  const supplierSyncId = item._supplierId || item._fromProviderGroupId;

  let fullSupplier: any = null;
  if (supplierSyncId) {
    fullSupplier =
      allSuppliers.value.find(
        (s: any) => String(s.sync_id) === String(supplierSyncId)
      ) ||
      allSuppliers.value.find(
        (s: any) => String(s.id) === String(supplierSyncId)
      );
  }
  if (!fullSupplier) {
    fullSupplier = allSuppliers.value.find(
      (s: any) => s.name?.toLowerCase() === providerName.toLowerCase()
    );
  }

  editProviderData.value = {
    id: item.id,
    name: providerName,
    estimated: Number(item.amount) || 0,
    accountId: item.accountId,
    _supplierId: fullSupplier?.sync_id || supplierSyncId || fullSupplier?.id,
    _supplierName: providerName,
    products: fullSupplier?.products || [],
  };

  editProviderModalOpen.value = true;
}

function handleProviderEntrySaved(payload: {
  providerId?: string | number;
  providerName?: string;
  items: Array<{ amount: number; accountId: any }>;
  totalAmount: number;
  products?: Array<{
    supplierProductId: string | number;
    productName: string;
    productPrice: number;
    quantity: number;
  }>;
}) {
  const entryId = editingProviderEntryId.value;
  if (entryId) {
    const groups = payload.items.map(item => ({
      amount: Number(item.amount) || 0,
      accountId: item.accountId,
    }));

    budgetController.updateIngreso(entryId, {
      amount: payload.totalAmount,
      accountId: groups[0]?.accountId || null,
      groups: groups.length > 1 ? groups : undefined,
      _providerName: payload.providerName,
    });
    budgetController.saveData();
  } else if (editingProviderId.value) {
    budgetController.updateProvider(editingProviderId.value, {
      estimated: payload.totalAmount,
      products: payload.products,
    });
    budgetController.saveData();
  } else {
    console.log('InicioViewComponent.onProviderSaved - payload:', payload);
    budgetController.addProvider({
      name: payload.providerName || 'Proveedor',
      estimated: payload.totalAmount,
      products: payload.products,
    });
    budgetController.saveData();
  }
  editProviderModalOpen.value = false;
  editProviderData.value = null;
  editingProviderEntryId.value = null;
  editingProviderId.value = null;
}

function handleProviderEntryDeleted(entryId: string | number) {
  budgetController.removeIngreso(entryId);
  budgetController.saveData();
  editProviderModalOpen.value = false;
  editProviderData.value = null;
  editingProviderEntryId.value = null;
}

function openEditEntryModal(item: any) {
  editEntryModalData.value = {
    id: item.id,
    entryType: item.entryType || 'ingreso',
    name: item.name || '',
    amount: item.amount,
    groups: item.groups,
  };

  if (item.groups && Array.isArray(item.groups) && item.groups.length > 0) {
    entryItems.value = item.groups.map((g: any) => ({
      amount: Number(g.amount) || 0,
      accountId: g.accountId ?? getDefaultAccountId(),
    }));
  } else {
    entryItems.value = [
      {
        amount: Number(item.amount) || 0,
        accountId: item.accountId || getDefaultAccountId(),
      },
    ];
  }
  entryFormState.items = [...entryItems.value];
  entryFormState.name = item.name || '';
  entryFormState.entryType = item.entryType || 'ingreso';
  editEntryModalOpen.value = true;
}

function addEntryItem() {
  if (canAddMoreItems.value) {
    entryItems.value.push({ amount: 0, accountId: getDefaultAccountId() });
  }
}

async function saveEntryChanges(data: {
  entryType: string;
  name: string;
  amount: number;
  accountId: any;
  groups: Array<{ amount: number; accountId: any }>;
}) {
  const { entryType, name, amount, accountId, groups } = data;

  if (editEntryModalData.value.id) {
    budgetController.updateIngreso(editEntryModalData.value.id, {
      entryType,
      name,
      amount,
      accountId,
      groups,
    });
  } else {
    if (amount > 0) {
      if (entryType === 'ingreso') {
        budgetController.addIngreso({
          name,
          amount,
          accountId,
          groups,
        });
      } else {
        budgetController.addEgreso({
          name,
          amount,
          accountId,
          groups,
        });
      }
    }
  }
  budgetController.saveData();
  editEntryModalOpen.value = false;
  editEntryModalData.value = {
    id: null,
    entryType: 'ingreso',
    name: '',
  };
  entryItems.value = [{ amount: 0, accountId: null }];
}

function deleteEntry() {
  if (editEntryModalData.value.id) {
    showDeleteAlert.value = true;
  }
}

function confirmDelete() {
  if (editEntryModalData.value.id) {
    budgetController.removeIngreso(editEntryModalData.value.id);
  }
  budgetController.saveData();
  showDeleteAlert.value = false;
  editEntryModalOpen.value = false;
  editEntryModalData.value = {
    id: null,
    entryType: 'ingreso',
    name: '',
  };
  entryItems.value = [{ amount: 0, accountId: getDefaultAccountId() }];
  entryFormState.items = [...entryItems.value];
  entryFormState.name = '';
  entryFormState.entryType = 'ingreso';
}
</script>

<style scoped>
.compact-icon {
  min-height: 16px;
  height: 16px;
  align-self: center;
}

.income-item {
  flex: 1;
  --min-height: 40px;
  position: relative;
  border-left: none !important;
}

.income-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background-color: var(--indicator-color);
  border-radius: 1px;
  z-index: 10;
}

.color-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 8px;
  font-size: 12px;
}

.list-content {
  max-height: calc(100vh - 210px);
}

.scroll-content {
  overflow-y: auto;
  max-height: calc(100vh - 245px);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-color {
  width: 4px;
  height: 12px;
  border-radius: 1px;
}

.legend-color.success {
  background-color: var(--ion-color-success);
}

.legend-color.danger {
  background-color: var(--ion-color-danger);
}
</style>
