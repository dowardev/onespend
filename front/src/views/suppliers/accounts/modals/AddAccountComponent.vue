<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="cancelModal">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{ selectedId ? t('suppliers.accounts.modals.addaccountcomponent.editTitle') : t('suppliers.accounts.modals.addaccountcomponent.newTitle') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button
            v-if="selectedId"
            fill="clear"
            color="danger"
            data-cy="delete-account"
            :title="t('suppliers.accounts.modals.addaccountcomponent.deleteAction')"
            :aria-label="t('suppliers.accounts.modals.addaccountcomponent.deleteAction')"
            @click="confirmRemove"
          >
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>

          <ion-button
            :disabled="!isFormValid"
            data-cy="save-account"
            :title="t('common.save')"
            :aria-label="t('common.save')"
            @click="onSubmit"
          >
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-top ion-padding-bottom">
      <ion-card class="shadow1">
        <ion-item class="transparent" lines="none">
          <ion-input
            v-model="form.name"
            :label="t('suppliers.accounts.modals.addaccountcomponent.text1')"
            label-placement="floating"
            required
          ></ion-input>
        </ion-item>

        <!-- Initial balance: only when creating (S1) -->
        <ion-item v-if="!selectedId" class="transparent" lines="none">
          <ion-input
            v-model.number="form.initialBalance"
            :label="t('suppliers.accounts.modals.addaccountcomponent.text2')"
            label-placement="floating"
            type="number"
          ></ion-input>
        </ion-item>

        <!-- Apply new balance: only when editing (S1, S3) -->
        <ion-item v-if="selectedId" class="transparent" lines="none">
          <ion-input
            v-model.number="form.targetBalance"
            :label="t('suppliers.accounts.modals.addaccountcomponent.text3')"
            :placeholder="t('suppliers.accounts.modals.addaccountcomponent.text3Placeholder')"
            label-placement="floating"
            type="number"
            inputmode="decimal"
          ></ion-input>
        </ion-item>
      </ion-card>

      <!-- Transactions accordion: only when editing (S2, S6, S11, S13) -->
      <ion-accordion-group v-if="selectedId && dayBlocks.length > 0" expand="inset" class="transactions-accordion">
        <ion-accordion value="transactions" class="shadow1">
          <ion-item slot="header" class="transparent">
            <ion-label>{{ t('suppliers.accounts.modals.addaccountcomponent.transactionsTitle') }}</ion-label>

            <ion-badge slot="end" color="secondary">{{ movementsCount }}</ion-badge>
          </ion-item>

          <div slot="content">
            <template v-for="block in dayBlocks" :key="block.dateKey">
              <ion-item-divider sticky class="day-divider">
                <ion-label>{{ block.label }}</ion-label>

                <ion-label
                  slot="end"
                  class="ion-text-end"
                  :style="{
                    color: block.dayTotal >= 0 ? 'var(--ion-color-success)' : 'var(--ion-color-danger)',
                  }"
                >
                  {{ formatCurrency({ value: block.dayTotal }) }}
                </ion-label>
              </ion-item-divider>

              <ion-card class="shadow1">
                <ion-item
                  v-for="(item, iIdx) in block.items"
                  :key="`${item.id}-${iIdx}`"
                  :lines="iIdx === block.items.length - 1 ? 'none' : 'full'"
                  class="transparent agenda-item"
                >
                  <div
                    slot="start"
                    class="item-indicator"
                    :style="{ backgroundColor: item.color }"
                  ></div>

                  <ion-label>
                    {{ item.name }}
                    <p>
                      {{ item.entryType === 'ingreso' ? t('budget.entryType.income') : t('budget.entryType.expense') }}
                    </p>
                  </ion-label>

                  <ion-label slot="end" class="ion-text-end" :style="{ color: item.color }">
                    {{ formatCurrency({ value: item.amount }) }}
                    <p>{{ formatCurrency({ value: item.runningBalance }) }}</p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </template>
          </div>
        </ion-accordion>
      </ion-accordion-group>

      <div v-if="selectedId && dayBlocks.length === 0" class="ion-padding ion-text-center ion-text-muted">
        {{ t('common.noData') }}
      </div>
    </ion-content>

    <ion-alert
      :is-open="showDeleteAlert"
      :message="t('suppliers.accounts.modals.addaccountcomponent.deleteConfirm')"
      :buttons="alertButtons"
      @did-dismiss="showDeleteAlert = false"
    ></ion-alert>
  </ion-page>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonCard,
  IonItem,
  IonLabel,
  IonInput,
  IonAlert,
  IonAccordionGroup,
  IonAccordion,
  IonItemDivider,
  IonBadge,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { reactive, computed, watch, ref } from 'vue';
import { closeOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { required, minValue, maxLength, helpers } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import { formatCurrency } from '@/utils/currency';
import { formatLocalDate } from '@/utils/date';
// End Imports

// 2. Controllers / Composables
const { t } = useLocale();
// End Controllers / Composables

// 3. Components
// End Components

// 4. Interface and types imports
import type { Account } from '@/stores/accountsStore';
import type { TransactionRow } from '@/types/account';
// End Interface and types imports

// 5. Main (props, emits, etc.)
interface AccountPayload {
  name: string;
  initialBalance: number;
  id?: IDBValidKey;
  sync_id?: string;
  targetBalance?: number;
}

interface DayBlock {
  dateKey: string;
  label: string;
  dayTotal: number;
  items: AgendaItemDisplay[];
}

interface AgendaItemDisplay {
  id: string | number;
  name: string;
  amount: number;
  entryType: 'ingreso' | 'egreso';
  runningBalance: number;
  color: string;
  createdAt: number;
}

const props = defineProps<{
  account: Account | null;
  transactions: TransactionRow[];
  currentBalance: number;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
  (e: 'saved', payload: AccountPayload): void;
  (e: 'delete', id: string | number): void;
}>();
// End Main

// 6. Vars and const
const form = reactive({ name: '', initialBalance: 0, targetBalance: null as number | null });
const selectedId = computed(() => props.account?.id ?? null);
const showDeleteAlert = ref(false);

const formRules = computed(() => ({
  name: { required: helpers.withMessage('El nombre es obligatorio', required), maxLength: maxLength(255) },
  initialBalance: { minValue: minValue(0) },
  targetBalance: { minValue: minValue(0) },
}));

const v$ = useVuelidate(formRules, form);

const isFormValid = computed(() => {
  return !v$.value.$invalid;
});

const alertButtons = [
  { text: t('suppliers.accounts.modals.addaccountcomponent.alert.cancel'), role: 'cancel' },
  {
    text: t('suppliers.accounts.modals.addaccountcomponent.deleteAction'),
    role: 'destructive',
    handler: () => {
      if (selectedId.value != null) emit('delete', selectedId.value);
    },
  },
];
// End Vars and const

// 7. Watch
watch(
  () => props.account,
  (a) => {
    if (a) {
      form.name = a.name || '';
      form.initialBalance = a.initialBalance ?? 0;
      form.targetBalance = null; // Reset target balance when switching accounts
    } else {
      form.name = '';
      form.initialBalance = 0;
      form.targetBalance = null;
    }
  },
  { immediate: true },
);
// End Watch

// 8. Computed
const movementsCount = computed(() => props.transactions?.length || 0);

const dayBlocks = computed<DayBlock[]>(() => {
  const transactions = props.transactions || [];
  if (transactions.length === 0) return [];

  // Sort transactions by createdAt ascending to compute running balance
  // (oldest first for balance computation, then we'll reverse for display)
  const sortedAsc = [...transactions].sort((a, b) => {
    const createdA = Number(a.createdAt) || 0;
    const createdB = Number(b.createdAt) || 0;
    if (createdA !== createdB) return createdA - createdB;
    // Fallback to date then id
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

  // Compute running balance from initial balance + all transactions in chronological order
  let runningBalance = Number(props.account?.initialBalance) || 0;
  const itemsWithBalance: (AgendaItemDisplay & { date: string | Date; dateKey: string })[] = [];

  for (const tx of sortedAsc) {
    const effect = tx.type === 'ingreso' ? tx.amount : -tx.amount;
    runningBalance += effect;

    let label = tx.date;
    try {
      const d = new Date(tx.date + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        label = formatLocalDate({ d });
      }
    } catch (e) {
      console.warn('failed to parse date', tx.date, e);
    }

    const color = tx.type === 'ingreso' ? 'var(--ion-color-success)' : 'var(--ion-color-danger)';

    const dateKey = typeof tx.date === 'string' ? tx.date : String(tx.date);
    itemsWithBalance.push({
      id: tx.id,
      name: tx.name || '-',
      amount: tx.amount,
      entryType: tx.type,
      runningBalance,
      color,
      createdAt: Number(tx.createdAt) || 0,
      date: tx.date,
      dateKey,
    });
  }

  // Group by date (dateKey)
  const groups = new Map<string, (AgendaItemDisplay & { dateKey: string })[]>();
  for (const item of itemsWithBalance) {
    if (!groups.has(item.dateKey)) groups.set(item.dateKey, []);
    groups.get(item.dateKey)!.push(item);
  }

  // Build day blocks (newest date first)
  const blocks: DayBlock[] = [];
  for (const [dateKey, items] of groups) {
    // Day total = sum of effects for that day
    const dayTotal = items.reduce((sum, item) => {
      return item.entryType === 'ingreso' ? sum + item.amount : sum - item.amount;
    }, 0);

    let label = dateKey;
    try {
      const d = new Date(dateKey + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        label = formatLocalDate({ d });
      }
    } catch (e) {
      console.warn('failed to parse date', dateKey, e);
    }

    // Items within day: newest first (by createdAt)
    const sortedDesc = [...items].sort((a, b) => b.createdAt - a.createdAt);

    blocks.push({ dateKey, label, dayTotal, items: sortedDesc });
  }

  // Sort blocks by dateKey descending (newest first)
  blocks.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  return blocks;
});
// End Computed

// 9. OnMounted
// End OnMounted

// 10. Functions
function cancelModal() {
  emit('dismiss');
}

function confirmRemove() {
  showDeleteAlert.value = true;
}

async function onSubmit() {
  const isValid = await v$.value.$validate();
  if (!isValid) return;

  const payload: AccountPayload = {
    name: form.name,
    initialBalance: form.initialBalance,
  };
  if (selectedId.value != null) payload.id = selectedId.value;
  if (props.account?.sync_id) payload.sync_id = props.account.sync_id;
  if (selectedId.value != null && form.targetBalance != null) {
    payload.targetBalance = form.targetBalance;
  }

  emit('saved', payload);
}
// End Functions
</script>

<style scoped>
.transactions-accordion {
  margin-top: 16px;
}

.day-divider {
  cursor: default;
}

.item-indicator {
  width: 4px;
  height: 24px;
  border-radius: 2px;
  flex-shrink: 0;
}

.agenda-item {
  --min-height: 44px;
}
</style>