<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-list class="transparent">
    <ion-list-header>
      <ion-label>
        {{ headerLabel }}
        <p v-if="headerSubtitle" class="ion-note" style="margin-top: 4px; opacity: 0.7">
          {{ headerSubtitle }}
        </p>
      </ion-label>
      <ion-button @click="handleAddClick">
        <ion-icon :icon="addOutline" />
      </ion-button>
    </ion-list-header>

    <template v-for="(item, displayIdx) in displayItems" :key="displayIdx">
      <ion-card class="shadow1">
        <div v-if="items.length > 1" style="display: flex; justify-content: flex-end">
          <ion-button
            fill="clear"
            size="small"
            @click="$emit('removeItem', { index: realIndex(displayIdx) })"
          >
            <ion-icon :icon="closeOutline" color="danger" />
          </ion-button>
        </div>

        <ion-item lines="full" class="transparent" :class="{ 'ion-invalid ion-touched': forceValidation && !getAccountIdValue(item.accountId) }" button data-cy="entry-account-selector" @click="openAccountModal({ index: realIndex(displayIdx) })">
          <ion-label>
            {{ t("budget.account.title") }}
            <p>{{ getAccountName({ accountId: item.accountId }) || t('common.selectAccount') }}</p>
          </ion-label>
        </ion-item>

        <ion-item lines="full" class="transparent">
          <ion-input
            :model-value="item.amount"
            data-cy="entry-amount-input"
            :label="t('budget.components.accountdistributionpicker.text')"
            label-placement="floating"
            type="number"
            placeholder="0"
            :class="{
              'ion-invalid': forceValidation || isAmountInvalid({ value: item.amount }),
              'ion-touched': forceValidation || isAmountTouched({ value: item.amount }),
            }"
            :error-text="getAmountError({ value: item.amount })"
            @update:model-value="$emit('updateItemAmount', { index: realIndex(displayIdx), amount: $event })"
          />
        </ion-item>
      </ion-card>
    </template>
  </ion-list>

  <ion-modal :is-open="showAccountModal" @will-dismiss="onAccountModalDismiss">
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="showAccountModal = false">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t("budget.account.selectAccount") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openQuickAccountAlert({ targetIndex: selectedAccountIndex })">
            <ion-icon :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-item lines="none">
        <ion-searchbar
          v-model="accountSearchQuery"
          mode="ios"
          :placeholder="t('budget.components.accountdistributionpicker.searchAccount')"
          class="ion-no-padding"
        />
      </ion-item>

      <ion-list
        v-if="sortedAccounts.available.length || sortedAccounts.selected.length"
        class="transparent ion-padding-start ion-padding-end"
      >
        <ion-card class="shadow1">
          <ion-item
            v-for="acc in sortedAccounts.available"
            :key="'avail-' + acc.id"
            lines="full"
            button
            class="transparent"
            @click="selectAccount({ acc })"
          >
            <ion-label>{{ acc.name }}</ion-label>
            <ion-label slot="end"></ion-label>
          </ion-item>
          <ion-item
            v-for="acc in sortedAccounts.selected"
            :key="'sel-' + acc.id"
            lines="full"
            class="transparent"
            :disabled="true"
          >
            <ion-label>{{ acc.name }}</ion-label>
            <ion-note slot="end" color="medium">{{ t('budget.components.accountdistributionpicker.selected') }}</ion-note>
          </ion-item>
        </ion-card>
      </ion-list>

      <div
        v-if="!sortedAccounts.available.length && !sortedAccounts.selected.length"
        class="ion-text-center ion-padding"
      >
        <ion-label color="medium">Presiona '+' para agregar una nueva cuenta</ion-label>
      </div>
    </ion-content>
  </ion-modal>

  <ion-alert
    :is-open="showQuickAccountAlert"
    :header="t('budget.account.newAccount')"
    :inputs="quickAccountInputs"
    :buttons="quickAccountButtons"
    @did-dismiss="showQuickAccountAlert = false"
  />

  <ion-toast
    :is-open="showIncompleteToast"
    :message="t('budget.components.accountdistributionpicker.pendingFields')"
    :duration="3000"
    color="warning"
    @did-dismiss="showIncompleteToast = false"
  />
</template>

<script lang="ts" setup>
import {
  IonList,
  IonListHeader,
  IonLabel,
  IonButton,
  IonIcon,
  IonCard,
  IonItem,
  IonInput,
  IonNote,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonSearchbar,
  IonAlert,
  IonToast,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { addOutline, closeOutline } from 'ionicons/icons';
import { ref, computed, watch } from 'vue';
import { isAmountInvalid, isAmountTouched, getAmountError } from '@/utils/amountValidation';
import accountsController, { type Account } from '@/controllers/accountsController';
import { useQuickAccount } from '@/composables/useQuickAccount';


const { t } = useLocale();
export interface DistributionItem {
  amount: number | string;
  accountId: string | number | { id: string | number } | null;
}

const props = defineProps<{
  items: DistributionItem[];
  headerLabel: string;
  headerSubtitle?: string;
  reverseOrder?: boolean;
}>();

const emit = defineEmits<{
  addItem: [];
  removeItem: [params: { index: number }];
  updateItemAmount: [params: { index: number; amount: string }];
  updateItemAccount: [params: { index: number; accountId: { id: string | number } | null }];
}>();

const displayItems = computed(() => {
  return props.reverseOrder ? [...props.items].reverse() : props.items;
});

const forceValidation = ref(false);
const showIncompleteToast = ref(false);

function hasIncompleteItems(params?: { items: DistributionItem[] }): boolean {
  const { items: checkItems = props.items } = params ?? {};
  return checkItems.some(item => {
    const amount = String(item.amount).trim();
    const hasAmount = amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0;
    const hasAccount = getAccountIdValue(item.accountId) != null;
    return !hasAmount || !hasAccount;
  });
}

watch(() => props.items, () => {
  if (!hasIncompleteItems()) {
    forceValidation.value = false;
  }
}, { deep: true });

function realIndex(displayIndex: number): number {
  if (props.reverseOrder) {
    return props.items.length - 1 - displayIndex;
  }
  return displayIndex;
}

// Account selection modal state
const showAccountModal = ref(false);
const accountSearchQuery = ref('');
const selectedAccountIndex = ref<number | null>(null);

// Accounts from controller
const accounts = computed(() => {
  const list = accountsController.getAccounts();
  if (!list || !Array.isArray(list)) return [];
  return list.filter((acc: any) => acc != null && acc.id != null) as Account[];
});

function getAccountIdValue(accountId: unknown): string | number | null {
  if (!accountId) return null;
  if (typeof accountId === 'object' && accountId !== null && 'id' in accountId) {
    return (accountId as { id: string | number }).id ?? null;
  }
  return accountId as string | number;
}

const selectedAccountIds = computed(() => {
  const skipIndex = selectedAccountIndex.value;
  return new Set(
    props.items
      .filter((_, i) => i !== skipIndex)
      .map((item) => getAccountIdValue(item.accountId))
      .filter((id): id is string | number => id !== null),
  );
});

const sortedAccounts = computed(() => {
  const query = accountSearchQuery.value?.toLowerCase() || '';
  const available: Account[] = [];
  const selected: Account[] = [];
  for (const acc of accounts.value) {
    if (query && !acc.name?.toLowerCase().includes(query)) continue;
    if (selectedAccountIds.value.has(acc.id as string | number)) {
      selected.push(acc);
    } else {
      available.push(acc);
    }
  }
  return { available, selected };
});

function getAccountName(params: { accountId: unknown }): string {
  const { accountId } = params;
  if (!accountId) return '';
  const id = getAccountIdValue(accountId);
  if (!id) return '';
  const acc = accounts.value.find((a) => String(a.id) === String(id));
  return acc?.name || '';
}

function handleAddClick() {
  if (hasIncompleteItems()) {
    forceValidation.value = true;
    showIncompleteToast.value = true;
    return;
  }
  selectedAccountIndex.value = null;
  accountSearchQuery.value = '';
  showAccountModal.value = true;
}

function openAccountModal(params: { index: number }) {
  const { index } = params;
  selectedAccountIndex.value = index;
  accountSearchQuery.value = '';
  showAccountModal.value = true;
}

function onAccountModalDismiss() {
  showAccountModal.value = false;
  accountSearchQuery.value = '';
  selectedAccountIndex.value = null;
}

function selectAccount(params: { acc: Account }) {
  const { acc } = params;
  const accountIdValue = acc.id as string | number;
  if (selectedAccountIndex.value !== null) {
    emit('updateItemAccount', { index: selectedAccountIndex.value, accountId: { id: accountIdValue } });
  } else {
    const newIndex = props.items.length;
    emit('addItem');
    emit('updateItemAccount', { index: newIndex, accountId: { id: accountIdValue } });
  }
  showAccountModal.value = false;
  selectedAccountIndex.value = null;
}

// Quick account creation via composable
const {
  showQuickAccountAlert,
  quickAccountInputs,
  quickAccountButtons,
  openQuickAccountAlert,
} = useQuickAccount({
  onAccountCreated: (params: { newAccount: { id: IDBValidKey }; targetIndex: number }) => {
    const { newAccount, targetIndex } = params;
    const accountIdValue = newAccount.id as string | number;
    if (targetIndex !== null && targetIndex !== undefined) {
      emit('updateItemAccount', { index: targetIndex, accountId: { id: accountIdValue } });
    } else {
      const newIndex = props.items.length;
      emit('addItem');
      emit('updateItemAccount', { index: newIndex, accountId: { id: accountIdValue } });
    }
  },
});
</script>
