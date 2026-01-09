<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="12" size-md="4">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Registro</ion-label>

            <ion-button @click="openAddEntryModal">
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>
          </ion-list-header>

          <div
            class="list-content"
            style="flex: 1 1 auto; overflow-y: auto; min-height: 0"
          >
            <div class="color-legend">
              <span class="legend-item">
                <span class="legend-color success"></span>
                Ingreso
              </span>
              <span class="legend-item">
                <span class="legend-color danger"></span>
                Egreso
              </span>
            </div>
            <hr />

            <template v-if="budgetController.getEntries().length > 0">
              <template
                v-for="(block, bIdx) in renderedEntries"
                :key="blockKey(block, bIdx)"
              >
                <ion-item
                  v-if="block.type === 'item'"
                  lines="full"
                  class="transparent"
                  button
                  @click="openEditEntryModal(block.item)"
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
        </ion-list>
      </ion-col>

      <ion-col size="12" size-md="4">
        <AccountCards :accounts="accountsWithBalance" />
      </ion-col>
    </ion-row>
  </ion-grid>

  <ion-modal
    :is-open="editProviderModalOpen"
    :keep-contents-mounted="true"
    @did-dismiss="editProviderModalOpen = false"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="editProviderModalOpen = false">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Editar Proveedor</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="saveProviderChanges">Guardar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1">
        <ion-list>
          <ion-item>
            <ion-label position="stacked">Nombre</ion-label>
            <ion-input
              v-model="editProviderModalData.name"
              placeholder="Nombre del proveedor"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Efectivo</ion-label>
            <ion-input
              v-model="editProviderModalData.efectivo"
              type="number"
              placeholder="0"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Tarjeta</ion-label>
            <ion-input
              v-model="editProviderModalData.tarjeta"
              type="number"
              placeholder="0"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Dólares</ion-label>
            <ion-input
              v-model="editProviderModalData.dollar"
              type="number"
              placeholder="0"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Estimado</ion-label>
            <ion-input
              v-model="editProviderModalData.estimated"
              type="number"
              placeholder="0"
            ></ion-input>
          </ion-item>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-modal>

  <ion-modal
    :is-open="editEntryModalOpen"
    :keep-contents-mounted="true"
    style="--height: 85%"
    @did-dismiss="editEntryModalOpen = false"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="editEntryModalOpen = false">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{
          editEntryModalData.id ? 'Editar Entrada' : 'Nueva Entrada'
        }}</ion-title>

        <ion-buttons slot="end">
          <ion-button
            v-if="editEntryModalData.id"
            fill="clear"
            color="danger"
            @click="deleteEntry"
          >
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>

          <ion-button @click="saveEntryChanges" :disabled="!isFormValid">
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-end">
      <ion-grid v-if="!editEntryModalData.id">
        <ion-row class="ion-justify-content-center">
          <ion-col size="6">
            <ion-segment v-model="addEntrySegment" scrollable>
              <ion-segment-button value="entry">
                <ion-label>Registro</ion-label>
              </ion-segment-button>

              <ion-segment-button value="provider">
                <ion-label>Proveedores</ion-label>
              </ion-segment-button>
            </ion-segment>
          </ion-col>
        </ion-row>
      </ion-grid>

      <template v-if="!editEntryModalData.id && addEntrySegment === 'entry'">
        <ion-list class="transparent">
          <div class="list-content">
            <ion-item lines="none" class="transparent">
              <ion-select
                v-model="editEntryModalData.entryType"
                label="Tipo"
                label-placement="stacked"
              >
                <ion-select-option value="ingreso">Ingreso</ion-select-option>

                <ion-select-option value="egreso">Egreso</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item class="transparent" lines="none">
              <ion-label position="stacked">Nombre</ion-label>

              <ion-input
                v-model="editEntryModalData.name"
                placeholder="Nombre"
              ></ion-input>
            </ion-item>
          </div>
        </ion-list>

        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>etalles</ion-label>
            <ion-button :disabled="!canAddMoreItems" @click="addEntryItem">
              <ion-icon :icon="addOutline"></ion-icon>
              Agregar
            </ion-button>
          </ion-list-header>

          <div class="list-content">
            <div
              v-for="(item, index) in entryItems"
              :key="index"
              :class="{ 'ion-padding-bottom': index !== entryItems.length - 1 }"
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
                    :validate="true"
                    error-text="Selecciona una cuenta"
                  >
                    <ion-select-option
                      v-for="acc in availableAccountsForItem(index)"
                      :key="acc.id"
                      :value="acc.id"
                    >
                      {{ acc.name }}
                    </ion-select-option>
                  </ion-select>
                </ion-item>
            </div>
          </div>
        </ion-list>
      </template>

      <template v-if="!editEntryModalData.id && addEntrySegment === 'provider'">
        <ion-list>
          <template v-if="providersTodayWithData.length">
            <ion-item
              v-for="p in providersTodayWithData"
              :key="p.id"
              lines="full"
              button
              @click="() => selectProvider(p)"
            >
              <ion-label>{{ p.name }}</ion-label>
              <ion-note slot="end" color="primary">
                {{ formatProviderAmount(p) }}
              </ion-note>
            </ion-item>
          </template>

          <template v-else>
            <div class="ion-padding ion-text-center">
              <ion-label>No hay proveedores con datos para este día</ion-label>
            </div>
          </template>
        </ion-list>
      </template>

      <template v-if="editEntryModalData.id">
        <ion-list class="transparent">
          <div class="list-content">
            <ion-item class="transparent" lines="none">
              <ion-select
                v-model="editEntryModalData.entryType"
                label="Tipo"
                label-placement="stacked"
              >
                <ion-select-option value="ingreso">Ingreso</ion-select-option>
                <ion-select-option value="egreso">Egreso</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item class="transparent" lines="none">
              <ion-label position="stacked">Nombre</ion-label>
              <ion-input
                v-model="editEntryModalData.name"
                placeholder="Nombre"
              ></ion-input>
            </ion-item>
          </div>
        </ion-list>

        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Detalles</ion-label>
            <ion-button :disabled="!canAddMoreItems" @click="addEntryItem">
              <ion-icon :icon="addOutline"></ion-icon>
              Agregar
            </ion-button>
          </ion-list-header>

          <div class="list-content">
            <ion-card
              v-for="(item, index) in entryItems"
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
                  :validate="true"
                  error-text="Selecciona una cuenta"
                >
                  <ion-select-option
                    v-for="acc in availableAccountsForItem(index)"
                    :key="acc.id"
                    :value="acc.id"
                  >
                    {{ acc.name }}
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item class="transparent" lines="none">
                <ion-button slot="end" color="danger" fill="clear"
                  >Eliminar</ion-button
                >
              </ion-item>
            </ion-card>
          </div>
        </ion-list>
      </template>
    </ion-content>
  </ion-modal>

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
} from 'ionicons/icons';
import AccountCards from './components/AccountCards.vue';
import { computed, ref, onMounted, reactive, watch } from 'vue';
import budgetController from '@/controllers/budgetController';
import accountsController from '@/controllers/accountsController';

const addEntrySegment = ref('entry');
const showDeleteAlert = ref(false);

const editProviderModalOpen = ref(false);
const editProviderModalData = ref({
  name: '',
  efectivo: '',
  tarjeta: '',
  dollar: '',
  estimated: '',
});
let editProviderModalProviderId: string | number | null = null;

const editEntryModalOpen = ref(false);
const editEntryModalData = ref({
  id: null as string | number | null,
  entryType: 'ingreso' as 'ingreso' | 'egreso',
  name: '',
});

const accountsList = computed(() => {
  const list = accountsController.getAccounts();
  if (!list || !Array.isArray(list)) return [] as any[];
  return list.filter((acc: any) => acc != null && acc.id != null) as any[];
});

const getDefaultAccountId = () => {
  const accounts = accountsList.value;
  return accounts.length > 0 ? accounts[0].id : null;
};

const entryItems = ref([{ amount: 0, accountId: null }]);

const entryFormState = reactive({
  name: '',
  entryType: 'ingreso',
  items: [{ amount: 0, accountId: null }],
});

const isItemsValid = computed(() => {
  return entryFormState.items.every(
    (item) => Number(item.amount) > 0 && item.accountId != null
  );
});

const isFormValid = computed(() => {
  return (
    entryFormState.name.trim().length > 0 &&
    entryFormState.entryType &&
    entryFormState.items.length > 0 &&
    isItemsValid.value
  );
});

watch(
  () => entryItems.value,
  (newItems) => {
    entryFormState.items = newItems.map((item) => ({
      amount: Number(item.amount) || 0,
      accountId: item.accountId,
    }));
  },
  { deep: true }
);

watch(
  () => editEntryModalData.value.name,
  (newName) => {
    entryFormState.name = newName;
  }
);

watch(
  () => editEntryModalData.value.entryType,
  (newType) => {
    entryFormState.entryType = newType;
  }
);

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

  const entriesForAccount = budgetController.getEntries().filter((e: any) => {
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

function calculateNoAccountStats() {
  const entriesWithoutAccount = budgetController.getEntries().filter(
    (e: any) => e.accountId == null || e.accountId === ''
  );

  const noAccountIngresos = entriesWithoutAccount
    .filter((e: any) => e.entryType === 'ingreso')
    .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  const noAccountEgresos = entriesWithoutAccount
    .filter((e: any) => e.entryType === 'egreso')
    .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  return {
    id: null,
    name: 'Sin cuenta',
    initialBalance: 0,
    ingresos: noAccountIngresos,
    egresos: noAccountEgresos,
    balance: noAccountIngresos - noAccountEgresos,
    hasTransactions: noAccountIngresos > 0 || noAccountEgresos > 0,
  };
}

const accountsWithBalance = computed(() => {
  const result = accountsList.value.map((acc: any) =>
    calculateAccountBalance(acc, acc.id)
  );

  const noAccount = calculateNoAccountStats();

  const withTransactions = result
    .filter((acc: any) => acc.hasTransactions)
    .sort((a: any, b: any) => b.balance - a.balance);

  const withoutTransactions = result
    .filter((acc: any) => !acc.hasTransactions)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return [noAccount, ...withTransactions, ...withoutTransactions];
});

const providersToday = computed(() => {
  const sel = String(budgetController.getSelectedDate() || '').slice(0, 10);
  if (!sel) return [];
  const addedIds = budgetController.getProviderIdsWithEntries();
  return budgetController.getProviders().filter(
    (p: any) => String(p.date || '').slice(0, 10) === sel && !addedIds.has(p.id)
  );
});

const providersTodayWithData = computed(() => {
  return providersToday.value.filter((p: any) => {
    return (
      Number(p?.efectivo) > 0 ||
      Number(p?.tarjeta) > 0 ||
      Number(p?.dollar) > 0 ||
      Number(p?.estimated) > 0
    );
  });
});

const renderedEntries = computed(() => {
  const list = budgetController.getEntries();
  return list.map((item: any) => ({ type: 'item', item }));
});

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
  const amounts = [];
  if (Number(provider?.efectivo) > 0) amounts.push(`EF: $${provider.efectivo}`);
  if (Number(provider?.tarjeta) > 0) amounts.push(`TA: $${provider.tarjeta}`);
  if (Number(provider?.dollar) > 0) amounts.push(`USD: $${provider.dollar}`);
  if (Number(provider?.estimated) > 0)
    amounts.push(`EST: $${provider.estimated}`);
  return amounts.join(' | ');
}

function selectProvider(provider: any) {
  budgetController.addProviderEgresos(provider);
  editEntryModalOpen.value = false;
}

function blockKey(block: any, idx: number) {
  if (!block) return `b-${idx}`;
  return `i-${String((block.item && block.item.id) || idx)}`;
}

function getAccountName(accountId: string | number | null | undefined) {
  if (!accountId) return 'Sin cuenta';
  const account = accountsList.value.find(
    (a: any) => String(a.id) === String(accountId)
  );
  return account?.name || 'Sin cuenta';
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
    const accountId = (uniqueAccountIds[0] as string | number | undefined) ?? null;
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

  const entriesForAccount = budgetController.getEntries().filter((e: any) => {
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

function openEditProviderModal(item: any) {
  const groupId = item._fromProviderGroupId;
  let providerId: string | number | null = null;

  if (groupId) {
    const match = String(groupId).match(/^prov-(.+)-\d+$/);
    providerId = match ? match[1] : null;
  }

  let provider = providerId
    ? budgetController.getProviders().find((p: any) => String(p.id) === String(providerId))
    : null;

  if (!provider && item._providerName) {
    provider = budgetController.getProviders().find((p: any) => p.name === item._providerName);
  }

  if (provider) {
    editProviderModalProviderId = provider.id;
    editProviderModalData.value = {
      name: provider.name || '',
      efectivo: provider.efectivo?.toString() || '',
      tarjeta: provider.tarjeta?.toString() || '',
      dollar: provider.dollar?.toString() || '',
      estimated: provider.estimated?.toString() || '',
    };
    editProviderModalOpen.value = true;
  }
}

function saveProviderChanges() {
  if (editProviderModalProviderId) {
    budgetController.updateProvider(editProviderModalProviderId, {
      name: editProviderModalData.value.name,
      efectivo: Number(editProviderModalData.value.efectivo) || 0,
      tarjeta: Number(editProviderModalData.value.tarjeta) || 0,
      dollar: Number(editProviderModalData.value.dollar) || 0,
      estimated: Number(editProviderModalData.value.estimated) || 0,
    });
  }
  editProviderModalOpen.value = false;
  editProviderModalProviderId = null;
}

function openEditEntryModal(item: any) {
  if (isProviderEntry(item)) {
    openEditProviderModal(item);
  } else {
    editEntryModalData.value = {
      id: item.id,
      entryType: item.entryType || 'ingreso',
      name: item.name || '',
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
}

function addEntryItem() {
  if (canAddMoreItems.value) {
    entryItems.value.push({ amount: 0, accountId: getDefaultAccountId() });
  }
}

async function saveEntryChanges() {
  if (!isFormValid.value) return;

  const totalAmount = entryItems.value.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const accountIdToSave = entryItems.value[0]?.accountId ?? null;

  if (editEntryModalData.value.id) {
    budgetController.updateIngreso(editEntryModalData.value.id, {
      entryType: editEntryModalData.value.entryType,
      name: editEntryModalData.value.name,
      amount: totalAmount,
      accountId: accountIdToSave,
      groups: entryItems.value,
    });
  } else {
    if (totalAmount > 0) {
      if (editEntryModalData.value.entryType === 'ingreso') {
        budgetController.addIngreso({
          name: editEntryModalData.value.name,
          amount: totalAmount,
          accountId: accountIdToSave,
          groups: entryItems.value,
        });
      } else {
        budgetController.addEgreso({
          name: editEntryModalData.value.name,
          amount: totalAmount,
          accountId: accountIdToSave,
          groups: entryItems.value,
        });
      }
    }
  }
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

onMounted(() => {
  accountsController.loadAll();
});
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
  overflow-y: auto;
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
