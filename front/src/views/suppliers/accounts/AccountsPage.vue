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
        <AddAccountComponent
          :account="modalAccount"
          :transactions="modalTransactions"
          :current-balance="modalCurrentBalance"
          @dismiss="cancelModal"
          @saved="onModalSaved"
          @delete="onDeleteAccount"
        />
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
import { onMounted, ref, computed } from 'vue';
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
  IonButtons,
  IonIcon,
  IonMenuButton,
  IonSearchbar,
} from '@ionic/vue';
import { addOutline, searchOutline } from 'ionicons/icons';
// End Imports

// 2. Controllers / Composables
import systemController from '@/controllers/systemConfigController';
import accountsController from '@/controllers/accountsController';
import budgetEntriesController from '@/controllers/budgetEntriesController';
// End Controllers / Composables

// 3. Components
import AddAccountComponent from './modals/AddAccountComponent.vue';
// End Components

// 4. Interface and types imports
import type { Account } from '@/stores/accountsStore';
import { computeAccountsBalances } from '@/utils/accountBalance';
import { planBalanceAdjustment } from '@/utils/accountBalance';
import { accountTransactions } from '@/utils/accountTransactions';
import type { TransactionRow } from '@/types/account';
import { formatCurrency } from '@/utils/currency';
import { formatLocalDate } from '@/utils/date';

const { t } = useLocale();

interface AccountFormData {
  name: string;
  initialBalance: number;
  id?: string | number;
  sync_id?: string;
  targetBalance?: number;
}
// End Types

// 5. Main (props, emits, etc.)
// End Main

// 6. Vars and const
const showModal = ref(false);
const modalAccount = ref<Account | null>(null);
const searchTerm = ref('');
const showSearch = ref(false);
// End Vars

// 7. Watch
// End Watch

// 8. Computed
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

function transactionsForAccount(accountId: string | number): TransactionRow[] {
  return accountTransactions({
    entries: budgetEntriesController.getAllEntries(),
    accountId,
  });
}

const modalTransactions = computed(() => {
  if (!modalAccount.value?.id) return [];
  return transactionsForAccount(modalAccount.value.id);
});

const modalCurrentBalance = computed(() => {
  if (!modalAccount.value) return 0;
  return currentBalanceFor({ account: modalAccount.value });
});

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

// 9. OnMounted
onMounted(() => {
  accountsController.loadAll();
});
// End Life cycle

// 10. Functions
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

async function onModalSaved(payload: AccountFormData) {
  if (!payload) return;

  const accountId = payload.id as string | number;
  const isEditing = accountId != null;

  // Create or update the account (without mutating initialBalance on edit)
  if (isEditing) {
    // When editing, only update the name, keep initialBalance as-is
    await accountsController.updateAccount({
      account: { name: payload.name, initialBalance: payload.initialBalance, id: accountId },
    });
  } else {
    await accountsController.addAccount({ account: payload as AccountFormData });
  }

  // If editing and a target balance was provided, create an adjustment entry (S5)
  if (isEditing && payload.targetBalance != null) {
    const currentBalance = currentBalanceFor({ account: { id: accountId } as Account });
    const plan = planBalanceAdjustment({
      currentBalance,
      targetBalance: payload.targetBalance,
    });

    if (plan) {
      const name = t('accounts.balanceAdjustment.entryName');
      const date = formatLocalDate({ d: new Date() });

      if (plan.entryType === 'ingreso') {
        await budgetEntriesController.addIngreso({
          name,
          amount: plan.amount,
          accountId,
          date,
          paymentType: 'cash',
        });
      } else {
        await budgetEntriesController.addEgreso({
          name,
          amount: plan.amount,
          accountId,
          date,
          paymentType: 'cash',
        });
      }
    }
  }

  cancelModal();
  await accountsController.loadAll();
}

async function onDeleteAccount(accountId: string | number) {
  await accountsController.deleteAccount({ id: accountId });
  await accountsController.loadAll();
  cancelModal();
}
// End Functions
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