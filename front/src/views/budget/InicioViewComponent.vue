<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="12" size-md="4" size-lg="6" size-xl="4">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Registro</ion-label>

            <ion-button :disabled="isDayClosed" @click="openAddEntryModal">
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
              <br />
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
    :entry-data="editProviderEntryData"
    :suppliers="allSuppliers"
    :accounts="accountsList"
    :mode="editingProviderEntryId ? 'entry' : 'provider'"
    @dismiss="editProviderModalOpen = false"
    @saved="handleProviderEntrySaved"
    @deleted="handleProviderEntryDeleted"
    @reassign-date="reassignProviderFromModal"
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
import { reassignEntry } from '@/composables/useReassignEntry';
import { computed, ref, onMounted, reactive, watch } from 'vue';
// AccountsController not needed here (use BudgetView's test data helper)
// End Imports

// Controllers
import budgetController from '@/controllers/budgetController';
import { BudgetController } from '@/controllers/budgetController';
import accountsController from '@/controllers/accountsController';
import suppliersController from '@/controllers/suppliersController';
import type { Supplier } from '@/controllers/suppliersController';
import type { Account } from '@/stores/accountsStore';
import type {
  Income,
  EntryType,
  PaymentType,
  Provider,
} from '@/stores/budgetStore';
import type {
  AccountWithBalance,
  EntryGroup,
  PendingProduct,
  ProviderEditData,
  ProviderProduct,
} from './components/EditProviderModal.vue';

// Components

// Vars

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
const editProviderData = ref<ProviderEditData | null>(null);
const editProviderEntryData = ref<{
  name: string;
  entryId: string | number | null;
  items: Array<{ amount: number; accountId: string | number | null }>;
} | null>(null);
const allSuppliers = computed(() => suppliersController.getSuppliers());

const editingProviderEntryId = ref<string | number | null>(null);

const editEntryModalOpen = ref(false);
const editEntryModalData = ref({
  id: null as string | number | null,
  entryType: 'ingreso' as 'ingreso' | 'egreso',
  name: '',
});

// dev flag removed from this component (use BudgetView's test helper)

const entryItems = ref<Array<EntryGroup>>([{ amount: 0, accountId: null }]);

const entryFormState = reactive({
  name: '',
  entryType: 'ingreso',
  items: [{ amount: 0, accountId: null }],
});

const editingProviderId = ref<string | number | null>(null);

// End Vars

// Computed
// Day-close concept removed; always treat as open
const isDayClosed = computed(() => false);
const frozenSnapshot = computed(() => budgetController.getFrozenSnapshot());

const accountsList = computed(() => {
  const list = accountsController.getAccounts();
  if (!list || !Array.isArray(list)) return [];
  return list.filter((acc: Account) => acc != null && acc.id != null);
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
    entryItems.value.every(
      item => Number(item.amount) > 0 && item.accountId != null
    )
  );
});

const availableAccountsForItem = (currentIndex: number) => {
  const usedAccountIds = entryItems.value
    .filter((_: unknown, idx: number) => idx !== currentIndex)
    .map((item: EntryItem) => String(item.accountId))
    .filter((id: string) => id !== 'null' && id !== 'undefined' && id !== '');
  return accountsList.value.filter(
    (acc: Account) => !usedAccountIds.includes(String(acc.id))
  );
};

const canAddMoreItems = computed(() => {
  const availableAccounts = accountsList.value.length;
  return entryItems.value.length < availableAccounts + 2;
});

function calculateAccountBalance(acc: Account, accountId: string | number) {
  const initialBalance = Number(acc.initialBalance) || 0;

  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();

  const entriesForAccount = entries.filter((e: Income) => {
    if (String(e.accountId) === String(accountId)) return true;
    if (e.groups && Array.isArray(e.groups)) {
      return e.groups.some(
        (g: EntryGroup) => String(g.accountId) === String(accountId)
      );
    }
    return false;
  });

  const ingresos = entriesForAccount
    .filter((e: Income) => e.entryType === 'ingreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);

  const egresos = entriesForAccount
    .filter((e: Income) => e.entryType === 'egreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);

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
  const result = accountsList.value.map((acc: Account) =>
    calculateAccountBalance(acc, acc.id)
  );

  const withTransactions = result
    .filter((acc: AccountWithBalance) => acc.hasTransactions)
    .sort(
      (a: AccountWithBalance, b: AccountWithBalance) => b.balance - a.balance
    );

  const withoutTransactions = result
    .filter((acc: AccountWithBalance) => !acc.hasTransactions)
    .sort((a: AccountWithBalance, b: AccountWithBalance) =>
      a.name.localeCompare(b.name)
    );

  return [...withTransactions, ...withoutTransactions];
});

const totalIngresos = computed(() => {
  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();
  return entries
    .filter((e: Income) => e.entryType === 'ingreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);
});

const totalEgresos = computed(() => {
  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();
  return entries
    .filter((e: Income) => e.entryType === 'egreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);
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
  // Allow re-adding providers multiple times - removed !addedIds.has(p.id) filter
  return budgetController
    .getProviders()
    .filter(
      (p: Provider) =>
        String(p.date || '').slice(0, 10) === sel
    );
});

const providersTodayWithData = computed(() => {
  return providersToday.value.filter((p: Provider) => {
    return Number(p?.estimated) > 0;
  });
});

const renderedEntries = computed(() => {
  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();
  return entries.map((item: Income) => ({ type: 'item', item }));
});

// End Computed

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

// End Watch

// Life cycle
// Note: Data loading handled by parent component (BudgetView) to avoid lifecycle conflicts

// End Life cycle

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
    a: {
      name,
      initialBalance,
    },
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

// sample entry helper removed from this component to avoid duplication

function formatProviderAmount(provider: Provider) {
  return formatCurrencyLocal({ v: Number(provider?.estimated) || 0 });
}

function selectProvider(provider: Provider) {
  if (!provider.accountId) {
    return;
  }
  budgetController.addProviderEgresos({ provider });
  budgetController.saveData();
  editEntryModalOpen.value = false;
}

function blockKey(block: { type: string; item: Income }, idx: number) {
  if (!block) return `b-${idx}`;
  return `i-${String((block.item && block.item.id) || idx)}`;
}

function getAccountName(accountId: string | number | null | undefined) {
  if (!accountId) return '';
  const account = accountsList.value.find(
    (a: Account) => String(a.id) === String(accountId)
  );
  return account?.name || '';
}

function getEntryAccountInfo(item: Income) {
  if (item.groups && Array.isArray(item.groups) && item.groups.length > 0) {
    const accountIds = item.groups
      .map((g: EntryGroup) => g.accountId)
      .filter((id: unknown) => id != null);
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
    (a: Account) => String(a.id) === String(accountId)
  );
  if (!account) return 0;

  const initialBalance = Number(account.initialBalance) || 0;

  const entries =
    isDayClosed.value && frozenSnapshot.value
      ? frozenSnapshot.value.entries
      : budgetController.getEntries();

  const entriesForAccount = entries.filter((e: Income) => {
    if (String(e.accountId) === String(accountId)) return true;
    if (e.groups && Array.isArray(e.groups)) {
      return e.groups.some(
        (g: EntryGroup) => String(g.accountId) === String(accountId)
      );
    }
    return false;
  });

  let cutoffTime = Infinity;
  if (entryId) {
    const currentEntry = entriesForAccount.find(
      (e: Income) => e.id === entryId
    );
    if (currentEntry) {
      cutoffTime = Number(currentEntry.createdAt) || Infinity;
    }
  }

  const filteredEntries =
    cutoffTime === Infinity
      ? entriesForAccount
      : entriesForAccount.filter(
          (e: Income) => Number(e.createdAt) <= cutoffTime
        );

  const ingresos = filteredEntries
    .filter((e: Income) => e.entryType === 'ingreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);

  const egresos = filteredEntries
    .filter((e: Income) => e.entryType === 'egreso')
    .reduce((sum: number, e: Income) => sum + Number(e.amount || 0), 0);

  return initialBalance + ingresos - egresos;
}

function isProviderEntry(item: Income) {
  return (
    item.entryType === 'egreso' &&
    (item._fromProviderGroupId || item._providerName)
  );
}

function handleEntryClick(item: Income) {
  if (isProviderEntry(item)) {
    openEditProviderModal(item);
  } else {
    openEditEntryModal(item);
  }
}

async function openEditProviderModal(item: Income) {
  editingProviderEntryId.value = item.id;

  await suppliersController.listSuppliers();

  const providerName = item._providerName || item.name || '';
  const supplierSyncId = item._supplierId || item._fromProviderGroupId;

  let fullSupplier: Supplier | null = null;
  if (supplierSyncId) {
    fullSupplier =
      allSuppliers.value.find(
        (s: Supplier) => String(s.sync_id) === String(supplierSyncId)
      ) ||
      allSuppliers.value.find(
        (s: Supplier) => String(s.id) === String(supplierSyncId)
      );
  }
  if (!fullSupplier) {
    fullSupplier = allSuppliers.value.find(
      (s: Supplier) => s.name?.toLowerCase() === providerName.toLowerCase()
    );
  }

  // If this is an entry (editing an existing provider entry) populate entry-data for the modal
  const groups = (item.groups && Array.isArray(item.groups) && item.groups.length > 0)
    ? item.groups.map((g: EntryGroup) => ({ amount: Number(g.amount) || 0, accountId: g.accountId ?? null }))
    : [{ amount: Number(item.amount) || 0, accountId: item.accountId ?? null }];

  editProviderEntryData.value = {
    name: providerName,
    entryId: item.id,
    items: groups,
    date: item.date || budgetController.getSelectedDate(),
  };

  // keep provider metadata too (useful when switching modes)
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
  items: Array<EntryGroup>;
  totalAmount: number;
  products?: Array<ProviderProduct>;
}) {
  const entryId = editingProviderEntryId.value;
  if (entryId) {
    const groups = payload.items.map(item => ({
      amount: Number(item.amount) || 0,
      accountId: item.accountId,
    }));

    budgetController.updateIngreso({
      id: entryId,
      changes: {
        amount: payload.totalAmount,
        accountId: groups[0]?.accountId || null,
        groups: groups.length > 1 ? groups : undefined,
        _providerName: payload.providerName,
      },
    });
    budgetController.saveData();
  } else if (editingProviderId.value) {
    budgetController.updateProvider({
      id: editingProviderId.value,
      changes: {
        estimated: payload.totalAmount,
        products: payload.products,
      },
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
  budgetController.removeIngreso({ id: entryId });
  budgetController.saveData();
  editProviderModalOpen.value = false;
  editProviderData.value = null;
  editingProviderEntryId.value = null;
  editProviderEntryData.value = null;
}

function openEditEntryModal(item: Income) {
  editEntryModalData.value = {
    id: item.id,
    entryType: item.entryType || 'ingreso',
    name: item.name || '',
    amount: item.amount,
    groups: item.groups,
    date: item.date || budgetController.getSelectedDate(),
  };

  if (item.groups && Array.isArray(item.groups) && item.groups.length > 0) {
    entryItems.value = item.groups.map((g: EntryGroup) => ({
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

// Handler for reassign-date emitted by EditEntryModal
async function reassignEntryFromModal(newDate: string | null) {
  if (!newDate || !editEntryModalData.value.id) return;
  try {
    const res = await reassignEntry({
      entryId: editEntryModalData.value.id,
      newDate: String(newDate).slice(0, 10),
      originalDate: editEntryModalData.value.date || undefined,
      restoreSelectedDate: true,
      verbose: false,
    });
    try {
      console.log('InicioViewComponent.reassignEntryFromModal - result', res);
    } catch (e) {}
  } catch (err) {
    console.error('InicioViewComponent.reassignEntryFromModal error', err);
  }

  // close modal and refresh current bucket
  editEntryModalOpen.value = false;
  editEntryModalData.value = { id: null, entryType: 'ingreso', name: '' };
  entryItems.value = [{ amount: 0, accountId: getDefaultAccountId() }];
  try {
    const sel =
      budgetController.getSelectedDate && budgetController.getSelectedDate();
    if (sel) await budgetController.loadDataForDate({ date: sel });
  } catch (_e) {}
}

// Handler for reassign-date emitted by EditProviderModal (when editing a provider entry)
async function reassignProviderFromModal(newDate: string | null) {
  if (!newDate || !editingProviderEntryId.value) return;
  try {
    const originalDate = (editProviderEntryData.value && (editProviderEntryData.value as any).date)
      ? (editProviderEntryData.value as any).date
      : (editProviderData.value as any)?.date;

    console.log('InicioViewComponent.reassignProviderFromModal called', {
      editingProviderEntryId: editingProviderEntryId.value,
      newDate,
      originalDateResolved: originalDate,
      editProviderEntryData: editProviderEntryData.value,
      editProviderData: editProviderData.value,
    });

    const res = await reassignEntry({
      entryId: editingProviderEntryId.value,
      newDate: String(newDate).slice(0, 10),
      originalDate: originalDate || undefined,
      restoreSelectedDate: true,
      verbose: true,
    });

    console.log('InicioViewComponent.reassignProviderFromModal - result', res);
    if (!res || !res.moved) {
      console.warn('InicioViewComponent.reassignProviderFromModal - move did not occur, performing fallback remove+create', res && res.error ? res.error : res);
      // Fallback: perform explicit remove + create to ensure the entry moves buckets
      try {
        const srcDate = originalDate ? String(originalDate).slice(0,10) : (budgetController.getSelectedDate && budgetController.getSelectedDate()) || String(new Date()).slice(0,10);
        const destDate = String(newDate).slice(0,10);

        // load source bucket
        try { budgetController.setDate({ date: srcDate }); } catch (err) {}
        await budgetController.loadDataForDate({ date: srcDate });

        const srcEntries = budgetController.getEntries();
        const srcEntry = srcEntries.find((en: any) => String(en.id) === String(editingProviderEntryId.value));
        if (srcEntry) {
          const payload: any = {
            name: srcEntry.name,
            amount: srcEntry.amount,
            paymentType: srcEntry.paymentType,
            accountId: srcEntry.accountId ?? null,
            groups: srcEntry.groups ?? [],
            // preserve provider metadata
            _providerName: srcEntry._providerName,
            _fromProviderGroupId: srcEntry._fromProviderGroupId,
          };

          // remove from source
          budgetController.removeIngreso({ id: srcEntry.id });
          await budgetController.saveData();

          // add to dest
          try { budgetController.setDate({ date: destDate }); } catch (err) {}
          await budgetController.loadDataForDate({ date: destDate });
          if ((srcEntry as any).entryType === 'ingreso') budgetController.addIngreso(payload);
          else budgetController.addEgreso(payload);
          await budgetController.saveData();

          console.log('InicioViewComponent.reassignProviderFromModal - fallback move completed');
        } else {
          console.warn('InicioViewComponent.reassignProviderFromModal - fallback: source entry not found');
        }
      } catch (err) {
        console.error('InicioViewComponent.reassignProviderFromModal - fallback error', err);
      }
    }
  } catch (err) {
    console.error('InicioViewComponent.reassignProviderFromModal error', err);
  }

  // close modal and refresh current bucket
  editProviderModalOpen.value = false;
  editProviderEntryData.value = null;
  editingProviderEntryId.value = null;
  editProviderData.value = null;
  try {
    const sel = budgetController.getSelectedDate && budgetController.getSelectedDate();
    if (sel) await budgetController.loadDataForDate({ date: sel });
  } catch (_e) {}
}

function addEntryItem() {
  if (canAddMoreItems.value) {
    entryItems.value.push({ amount: 0, accountId: getDefaultAccountId() });
  }
}

function saveEntryChanges(data: {
  entryType: EntryType;
  name: string;
  amount: number;
  accountId: string | number | null;
  groups: Array<EntryGroup>;
}) {
  try {
    console.log('InicioViewComponent.saveEntryChanges called with:', data);
  } catch (e) {}
  const { entryType, name, amount, accountId, groups } = data;

  if (editEntryModalData.value.id) {
    budgetController.updateIngreso({
      id: editEntryModalData.value.id,
      changes: {
        entryType,
        name,
        amount,
        accountId,
        groups,
      },
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
    entryType: 'ingreso' as EntryType,
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
    budgetController.removeIngreso({ id: editEntryModalData.value.id });
  }
  budgetController.saveData();
  showDeleteAlert.value = false;
  editEntryModalOpen.value = false;
  editEntryModalData.value = {
    id: null,
    entryType: 'ingreso' as EntryType,
    name: '',
  };
  entryItems.value = [{ amount: 0, accountId: getDefaultAccountId() }];
  entryFormState.items = [...entryItems.value];
  entryFormState.name = '';
  entryFormState.entryType = 'ingreso' as EntryType;
}
// End Functions
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
