<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode" />
        </ion-buttons>

        <ion-title>{{ t('accounts.title') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="openModal()">
            <ion-icon :icon="addOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid class="accounts__grid">
        <ion-row class="ion-justify-content-center">
          <ion-col size-xs="12" size-md="10" size-lg="8" size-xl="6" class="accounts__col">
            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>{{ t('suppliers.accounts.accountspage.label') }}</ion-label>

                <ion-button v-if="!showSearch" @click="showSearch = true">
                  <ion-icon :icon="searchOutline"></ion-icon>
                </ion-button>
              </ion-list-header>

              <!-- search accounts -->
              <div class="search-row" :class="{ 'search-row--open': showSearch }">
                <div class="search-row__inner">
                  <ion-item lines="none">
                    <ion-searchbar
                      v-model="searchTerm"
                      mode="ios"
                      :placeholder="t('suppliers.accounts.accountspage.placeholder')"
                      show-clear-button="focus"
                    ></ion-searchbar>

                    <ion-button fill="clear" @click="showSearch = false">{{ t('common.cancel') }}</ion-button>
                  </ion-item>
                </div>
              </div>

              <div class="list-content accounts__content">
                <template v-for="group in groupedAccounts" :key="group.letter">
                  <ion-item-group>
                    <ion-item-divider sticky>
                      <ion-label>{{ group.letter }}</ion-label>
                    </ion-item-divider>

                    <ion-item
                      v-for="c in group.items"
                      :key="c.id"
                      button
                      class="transparent"
                      @click="edit({ account: c })"
                    >
                      <ion-label>
                        <h3>{{ c.name }}</h3>
                        <p>{{ t('suppliers.accounts.accountspage.initialBalance', { amount: c.initialBalance ?? 0 }) }}</p>
                        <p>{{ t('suppliers.accounts.accountspage.currentBalance', { amount: formatCurrency({ value: currentBalanceFor({ account: c }) }) }) }}</p>
                      </ion-label>

                      <ion-buttons slot="end" class="account-actions">
                        <ion-button
                          fill="clear"
                          :title="t('accounts.balanceAdjustment.action')"
                          @click.stop="openBalanceModal({ account: c })"
                        >
                          <ion-icon :icon="scaleOutline"></ion-icon>
                        </ion-button>

                        <ion-button
                          color="danger"
                          fill="clear"
                          @click.stop="confirmRemoveAccount({ id: c.id, name: c.name })"
                        >
                          <ion-icon :icon="trashOutline" color="danger"></ion-icon>
                        </ion-button>
                      </ion-buttons>
                    </ion-item>
                  </ion-item-group>
                </template>
              </div>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-modal
        class="accounts__modal"
        :is-open="showModal"
        :backdrop-dismiss="false"
        @did-dismiss="cancelModal"
      >
        <AddAccountComponent :account="modalAccount" @dismiss="cancelModal" @saved="onModalSaved" />
      </ion-modal>

      <!-- LBDS-277: set the balance of the account through an adjustment entry -->
      <ion-modal
        class="accounts__modal"
        :is-open="showBalanceModal"
        :backdrop-dismiss="false"
        @did-dismiss="cancelBalanceModal"
      >
        <SetBalanceModal
          :account-id="balanceAccountId"
          :account-name="balanceAccountName"
          :current-balance="balanceAccountCurrentBalance"
          @dismiss="cancelBalanceModal"
          @submit="(p) => onBalanceSubmit({ payload: p })"
        />
      </ion-modal>

      <ion-alert
        :is-open="deleteConfirmAccount.open"
        :message="t('suppliers.accounts.accountspage.deleteConfirm', { name: deleteConfirmAccount.accountName })"
        :buttons="getAlertButtonsAccount()"
        @did-dismiss="onDeleteAlertDidDismissAccount"
      ></ion-alert>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import { onMounted, ref, computed, unref, reactive,  } from 'vue';
import { useLocale } from '@/composables/useLocale';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonList,
  IonListHeader,
  IonItemGroup,
  IonItemDivider,
  IonModal,
  IonAlert,
  IonButtons,
  IonIcon,
  IonMenuButton,
  IonSearchbar,
} from '@ionic/vue';
import { addOutline, searchOutline, trashOutline, scaleOutline } from 'ionicons/icons';
// End Imports

// Controllers
import systemController from '@/controllers/systemConfigController';
import accountsController from '@/controllers/accountsController';
import budgetEntriesController from '@/controllers/budgetEntriesController';
// End Controllers

// Components
import AddAccountComponent from './modals/AddAccountComponent.vue';
import SetBalanceModal from './modals/SetBalanceModal.vue';
// End Components

// Types
import type { Account } from '@/stores/accountsStore';
import type { BalanceAdjustmentEntryType } from '@/utils/accountBalance';
import { computeAccountsBalances } from '@/utils/accountBalance';
import { formatCurrency } from '@/utils/currency';
import { formatLocalDate } from '@/utils/date';


const { t } = useLocale();
interface AccountFormData {
  name: string;
  initialBalance: number;
  id?: string | number;
  sync_id?: string;
}
// End Types

// Vars
const showModal = ref(false);
const modalAccount = ref<any | null>(null);
const searchTerm = ref('');
const showSearch = ref(false);
const deleteConfirmAccount = reactive({
  open: false,
  accountId: null as string | number | null,
  accountName: '' as string,
});

const showBalanceModal = ref(false);
const balanceAccountId = ref<string | number | null>(null);
const balanceAccountName = ref('');
const balanceAccountCurrentBalance = ref(0);

// End Vars

// Functions
function openModal() {
  modalAccount.value = null;
  showModal.value = true;
}

function edit(params: { account: Account | null }) {
  const { account } = params;
  modalAccount.value = account;
  showModal.value = true;
}

function cancelModal() {
  showModal.value = false;
  modalAccount.value = null;
}

// LBDS-277: the balance of an account is cumulative (opening balance plus
// every movement of the account), so the adjustment is computed against that
// balance and creates a regular entry dated today.
function openBalanceModal(params: { account: Account }) {
  const { account } = params;
  balanceAccountId.value = account.id ?? null;
  balanceAccountName.value = account.name || '';
  balanceAccountCurrentBalance.value = currentBalanceFor({ account });
  showBalanceModal.value = true;
}

function cancelBalanceModal() {
  showBalanceModal.value = false;
  balanceAccountId.value = null;
  balanceAccountName.value = '';
  balanceAccountCurrentBalance.value = 0;
}

async function onBalanceSubmit(params: {
  payload: { accountId: string | number; entryType: BalanceAdjustmentEntryType; amount: number };
}) {
  const { accountId, entryType, amount } = params.payload;
  const name = t('accounts.balanceAdjustment.entryName');
  const date = formatLocalDate({ d: new Date() });

  if (entryType === 'ingreso') {
    await budgetEntriesController.addIngreso({ name, amount, accountId, date, paymentType: 'cash' });
  } else {
    await budgetEntriesController.addEgreso({ name, amount, accountId, date, paymentType: 'cash' });
  }

  cancelBalanceModal();
}

function confirmRemoveAccount(params: { id: string | number | null | undefined; name?: string }) {
  const { id, name } = params;
  deleteConfirmAccount.open = true;
  deleteConfirmAccount.accountId = id ?? null;
  deleteConfirmAccount.accountName = name ?? '';
}

function getAlertButtonsAccount() {
  return [
    {
      text: t('suppliers.accounts.accountspage.text1'),
      role: 'cancel',
      handler: () => {},
    },
    {
      text: t('suppliers.accounts.accountspage.text2'),
      role: 'destructive',
      handler: () => {
        void removeAccountConfirmed();
      },
    },
  ];
}

async function removeAccountConfirmed() {
  const id = deleteConfirmAccount.accountId;
  deleteConfirmAccount.open = false;
  deleteConfirmAccount.accountId = null;
  deleteConfirmAccount.accountName = '';

  if (id == null) return;
  await remove({ id: id as string | number });
}

function onDeleteAlertDidDismissAccount() {
  deleteConfirmAccount.open = false;
  deleteConfirmAccount.accountId = null;
  deleteConfirmAccount.accountName = '';
}

async function onModalSaved(payload: AccountFormData) {
  if (!payload) return;
  if (payload.id != null) {
    await accountsController.updateAccount({ account: payload as AccountFormData });
  } else {
    await accountsController.addAccount({ account: payload as AccountFormData });
  }

  cancelModal();
  await accountsController.loadAll();
}

async function remove(params: { id: IDBValidKey | undefined }) {
  const { id } = params;
  if (id == null) return;
  await accountsController.deleteAccount({ id });
  await accountsController.loadAll();
}

// End Functions

// Life cycle
onMounted(() => {
  accountsController.loadAll();
});

// End Life cycle

// Computed
const designMode = computed(() => systemController.getDesignMode());

const accounts = computed(() => accountsController.getAccounts());

// LBDS-277: the balance of every account, derived from its entries.
const accountsBalances = computed(() =>
  computeAccountsBalances({
    accounts: accounts.value || [],
    entries: budgetEntriesController.getAllEntries(),
  }),
);

function currentBalanceFor(params: { account: Account }): number {
  const { account } = params;
  if (account.id == null) return 0;
  const balance = accountsBalances.value.get(String(account.id));
  return balance ?? (Number(account.initialBalance) || 0);
}

const filteredAccounts = computed(() => {
  const term = (searchTerm.value || '').toString().toLowerCase().trim();
  const list = accounts.value || [];
  if (!term) return list;
  return list.filter((a: Account) => {
    const name = (a.name || '').toString().toLowerCase();
    return name.includes(term);
  });
});

const groupedAccounts = computed(() => {
  const list = (filteredAccounts.value || []).slice();
  list.sort((a: Account, b: Account) => {
    const na = (a.name || '').toString().toLowerCase();
    const nb = (b.name || '').toString().toLowerCase();
    return na.localeCompare(nb);
  });

  const map = new Map<string, any[]>();
  list.forEach((a: Account) => {
    const name = (a.name || '').toString().trim();
    const letter = name ? name[0].toUpperCase() : '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(a);
  });

  return Array.from(map.keys())
    .sort()
    .map((letter) => ({ letter, items: map.get(letter) || [] }));
});

// End Computed

// Watch
</script>

<style scoped>
/* cadena de altura: grid/row/col ocupan todo el alto del content */
.accounts__grid {
  height: 100%;
}

.accounts__grid ion-row {
  height: 100%;
}

.accounts__col {
  height: 100%;
}

/* el list ocupa todo el alto disponible del content */
ion-list.transparent {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* scroll interno: el div se adapta al espacio restante (searchbar abierto/cerrado) */
/* y activa su scroll solo cuando el contenido choca con el borde */
.accounts__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* searchbar show/hide animation */
.search-row {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms ease;
}

.search-row--open {
  grid-template-rows: 1fr;
}

.search-row__inner {
  min-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 200ms ease;
}

.search-row--open .search-row__inner {
  opacity: 1;
}

.account-actions {
  opacity: 0;
  transition: opacity 150ms ease;
}

ion-item:hover .account-actions,
ion-item:focus-within .account-actions {
  opacity: 1;
  pointer-events: auto;
}

@media (pointer: fine) {
  ion-item:hover .account-actions,
  ion-item:focus-within .account-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

@media (pointer: coarse) {
  .account-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

@media (min-width: 1025px) and (max-width: 1440px) {
  .accounts__modal {
    --height: 80dvh;
  }
}

@media (min-width: 1441px) {
  .accounts__modal {
    --height: 80dvh;
  }
}
</style>
