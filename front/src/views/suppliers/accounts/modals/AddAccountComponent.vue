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

    <ion-content class="ion-padding-top ion-padding-bottom account-modal-content">
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

          <ion-button
            slot="end"
            fill="clear"
            data-cy="balance-help"
            :title="t('accounts.balanceAdjustment.title')"
            :aria-label="t('accounts.balanceAdjustment.title')"
            @click="openBalanceHelp($event)"
          >
            <ion-icon :icon="informationCircleOutline"></ion-icon>
          </ion-button>
        </ion-item>
      </ion-card>

      <!-- Transactions accordion: only when editing (S2, S6, S11, S13) -->
      <ion-accordion-group
        v-if="selectedId && dayBlocks.length > 0"
        expand="inset"
        class="transactions-accordion transactions-group"
      >
        <ion-accordion value="transactions" class="shadow1">
          <ion-item slot="header" class="transparent">
            <div class="transactions-header">
              <ion-label>{{ t('suppliers.accounts.modals.addaccountcomponent.transactionsTitle') }}</ion-label>

              <ion-badge color="secondary">{{ movementsCount }}</ion-badge>
            </div>
          </ion-item>

          <div slot="content" class="transactions-content">
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

                  <div slot="end" class="movement-end">
                    <ion-label class="ion-text-end" :style="{ color: item.color }">
                      {{ formatCurrency({ value: item.amount }) }}
                      <p>{{ formatCurrency({ value: item.runningBalance }) }}</p>
                    </ion-label>

                    <!-- Pointer devices: the actions appear when the pointer is over the row. -->
                    <ion-buttons class="movement-actions">
                      <ion-button
                        fill="clear"
                        :title="t('common.edit')"
                        :aria-label="t('common.edit')"
                        @click.stop="editMovement({ item })"
                      >
                        <ion-icon :icon="createOutline"></ion-icon>
                      </ion-button>

                      <ion-button
                        fill="clear"
                        color="danger"
                        :title="t('common.delete')"
                        :aria-label="t('common.delete')"
                        @click.stop="askDeleteMovement({ item })"
                      >
                        <ion-icon :icon="trashOutline"></ion-icon>
                      </ion-button>
                    </ion-buttons>

                    <!-- Touch devices: an ellipsis button that opens the options. -->
                    <ion-button
                      class="movement-more"
                      fill="clear"
                      :title="t('suppliers.accounts.modals.addaccountcomponent.moreActions')"
                      :aria-label="t('suppliers.accounts.modals.addaccountcomponent.moreActions')"
                      @click.stop="openMovementOptions({ event: $event, item })"
                    >
                      <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
                    </ion-button>
                  </div>
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

    <!-- What applying a new balance does -->
    <ion-popover
      :is-open="balanceHelpOpen"
      :event="balanceHelpEvent"
      @did-dismiss="closeBalanceHelp"
    >
      <ion-content>
        <ion-list>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ t('accounts.balanceAdjustment.title') }}</p>

              <p>{{ t('suppliers.accounts.modals.addaccountcomponent.balanceHelp') }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

    <!-- Movement options: touch devices open them from the ellipsis button. -->
    <ion-popover
      :is-open="movementOptionsOpen"
      :event="movementOptionsEvent"
      @did-dismiss="closeMovementOptions"
    >
      <ion-content>
        <ion-list>
          <ion-item button @click="editMovement({ item: movementOptionsItem })">
            <ion-icon slot="start" :icon="createOutline"></ion-icon>

            <ion-label>{{ t('common.edit') }}</ion-label>
          </ion-item>

          <ion-item button @click="askDeleteMovement({ item: movementOptionsItem })">
            <ion-icon slot="start" :icon="trashOutline" color="danger"></ion-icon>

            <ion-label color="danger">{{ t('common.delete') }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

    <!-- Movement delete confirmation -->
    <DeleteConfirmAlert
      :is-open="deleteConfirm.showDeleteAlert.value"
      :message="t('suppliers.accounts.modals.addaccountcomponent.deleteMovementConfirm')"
      :buttons="deleteConfirm.deleteAlertButtons.value"
      @did-dismiss="deleteConfirm.showDeleteAlert.value = false"
    />
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
  IonPopover,
  IonList,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { reactive, computed, watch, ref } from 'vue';
import { useRouter } from 'vue-router';
import { closeOutline, createOutline, ellipsisVerticalOutline, informationCircleOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { required, minValue, maxLength, helpers } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import { formatCurrency } from '@/utils/currency';
import { formatLocalDate } from '@/utils/date';
// End Imports

// 2. Controllers / Composables
import budgetEntriesController from '@/controllers/budgetEntriesController';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';

const { t } = useLocale();
const router = useRouter();
// End Controllers / Composables

// 3. Components
import DeleteConfirmAlert from '@/views/budget/components/DeleteConfirmAlert.vue';
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

// Movement actions (S8): the movement the popover is acting on, and the one
// waiting for the delete confirmation.
const movementOptionsOpen = ref(false);
const movementOptionsEvent = ref<Event | undefined>(undefined);
const movementOptionsItem = ref<AgendaItemDisplay | null>(null);
const pendingDeleteItem = ref<AgendaItemDisplay | null>(null);

// Help popover of the balance input.
const balanceHelpOpen = ref(false);
const balanceHelpEvent = ref<Event | undefined>(undefined);

const formRules = computed(() => ({
  name: { required: helpers.withMessage('El nombre es obligatorio', required), maxLength: maxLength(255) },
  initialBalance: { minValue: minValue(0) },
  targetBalance: { minValue: minValue(0) },
}));

const v$ = useVuelidate(formRules, form);

const deleteConfirm = useDeleteConfirm({
  onConfirm: confirmDeleteMovement,
});

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

  // Sort the blocks by the most recent movement they contain, so the newest
  // movement comes first. An applied balance is the newest movement of the
  // account, and this keeps it visible even when other movements are dated
  // in the future (they would otherwise push it down the list).
  blocks.sort((a, b) => {
    const aCreatedAt = a.items[0]?.createdAt ?? 0;
    const bCreatedAt = b.items[0]?.createdAt ?? 0;
    return bCreatedAt - aCreatedAt;
  });

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

// 10.1 Movement actions (S8)
function openBalanceHelp(event: Event) {
  balanceHelpEvent.value = event;
  balanceHelpOpen.value = true;
}

function closeBalanceHelp() {
  balanceHelpOpen.value = false;
  balanceHelpEvent.value = undefined;
}
function openMovementOptions(params: { event: Event; item: AgendaItemDisplay }) {
  movementOptionsEvent.value = params.event;
  movementOptionsItem.value = params.item;
  movementOptionsOpen.value = true;
}

function closeMovementOptions() {
  movementOptionsOpen.value = false;
  movementOptionsEvent.value = undefined;
}

async function editMovement(params: { item: AgendaItemDisplay | null }) {
  const item = params.item;
  closeMovementOptions();
  if (!item) return;

  // The modal closes before navigating: the edit screen takes over the view.
  emit('dismiss');
  await router.push(`/budget/entry/edit?entryId=${item.id}`);
}

function askDeleteMovement(params: { item: AgendaItemDisplay | null }) {
  const item = params.item;
  closeMovementOptions();
  if (!item) return;

  pendingDeleteItem.value = item;
  deleteConfirm.openDeleteAlert();
}

async function confirmDeleteMovement() {
  // Close the confirmation right away so the tap gives feedback.
  deleteConfirm.showDeleteAlert.value = false;

  const item = pendingDeleteItem.value;
  pendingDeleteItem.value = null;
  if (!item) return;

  // Standard delete path: local removal plus the sync queue enqueue.
  await budgetEntriesController.removeEntry({ id: item.id });
}
// End Functions
</script>

<style scoped>
.transactions-accordion {
  margin-top: 16px;
}

/* Ionic insets an inset-expanded accordion group by 16px on each side, which
   leaves the accordion narrower than the cards around it. Align it with them:
   the cards carry a 10px inline margin, the accordion has none. */
.transactions-group {
  margin-inline: 10px;
  /* The group takes the space left by the form card, so the accordion (and
     not the modal) is the one that scrolls. */
  flex: 1 1 0;
  min-height: 0;
}

/* The expanded accordion fills the group, so its content region can scroll.
   As a flex column, the content region takes the space left by the header. */
.transactions-accordion ion-accordion.accordion-expanded {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* El listado scrollea dentro del acordeón, no en el modal. */
.transactions-content {
  overscroll-behavior: contain;
}

/* Título del acordeón con el contador a su derecha (antes de la flecha). */
.transactions-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
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

/* Movement actions (S8): pointer devices reveal them on hover, touch devices
   use the ellipsis button instead. Same pattern as RecurringPage/SuppliersPage.
   On pointer devices the actions float over the row (absolute) so the idle
   list keeps no empty space reserved for them. */
.movement-end {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
}

.movement-actions {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 2px;
  padding-left: 12px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease;
  background: var(--background-contrast);
  border-radius: 4px;
}

.movement-more {
  display: none;
}

ion-item:hover .movement-actions,
ion-item:focus-within .movement-actions {
  opacity: 1;
  pointer-events: auto;
}

@media (pointer: coarse) {
  .movement-actions {
    display: none;
  }

  .movement-more {
    display: inline-flex;
  }
}
</style>

<style>
/* ::part() no admite selectores de atributo, asi que estas reglas van fuera
   del scope y se acotan con las clases propias del modal. */
.account-modal-content::part(scroll) {
  display: flex;
  flex-direction: column;
}

.transactions-accordion ion-accordion::part(content) {
  /* !important: the shadow sets `#content { overflow: hidden }`, and a ::part()
     rule without it loses against that id selector. */
  overflow-y: auto !important;
  min-height: 0;
  overscroll-behavior: contain;
}
</style>
