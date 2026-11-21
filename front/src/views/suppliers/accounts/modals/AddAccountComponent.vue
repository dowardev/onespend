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
          <ion-button v-if="selectedId" :id="popoverTriggerId" fill="clear" :title="t('suppliers.accounts.modals.addaccountcomponent.moreActions')">
            <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
          </ion-button>

          <ion-button :disabled="!isFormValid" @click="onSubmit">
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- The account actions live in a popover (LBDS-277 follow-up, issue #12). -->
    <ion-popover
      ref="actionsPopover"
      :trigger="popoverTriggerId"
      trigger-action="click"
      side="bottom"
      alignment="end"
      class="actions-popover"
    >
      <div class="popover-content">
        <ion-button
          fill="clear"
          class="popover-action"
          @click="onAdjustBalance"
        >
          <ion-icon slot="start" :icon="scaleOutline"></ion-icon>
          {{ t('accounts.balanceAdjustment.action') }}
        </ion-button>

        <ion-button
          fill="clear"
          color="danger"
          class="popover-action"
          @click="confirmRemove"
        >
          <ion-icon slot="start" :icon="trashOutline"></ion-icon>
          {{ t('suppliers.accounts.modals.addaccountcomponent.deleteAction') }}
        </ion-button>
      </div>
    </ion-popover>

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

        <ion-item class="transparent" lines="none">
          <ion-input
            v-model.number="form.initialBalance"
            :label="t('suppliers.accounts.modals.addaccountcomponent.text2')"
            label-placement="floating"
            type="number"
          ></ion-input>
        </ion-item>
      </ion-card>
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
  IonInput,
  IonAlert,
  IonPopover,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { reactive, computed, watch, ref } from 'vue';
import { closeOutline, saveOutline, trashOutline, ellipsisVerticalOutline, scaleOutline } from 'ionicons/icons';
import { required, minValue, maxLength, helpers } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
// End Imports

// 2. Controllers / Composables
const { t } = useLocale();
// End Controllers / Composables

// 3. Components
// End Components

// 4. Interface and types imports
import type { HTMLIonOverlayElement } from '@ionic/core';
import type { Account } from '@/stores/accountsStore';
// End Interface and types imports

// 5. Main (props, emits, etc.)
interface AccountPayload {
  name: string;
  initialBalance: number;
  id?: IDBValidKey;
  sync_id?: string;
}

const props = defineProps<{ account: Account | null }>();
const emit = defineEmits<{
  (e: 'dismiss'): void;
  (e: 'saved', payload: AccountPayload): void;
  (e: 'delete', id: string | number): void;
  (e: 'adjustBalance', payload: { accountId: string | number; accountName: string }): void;
}>();
// End Main

// 6. Vars and const
const form = reactive({ name: '', initialBalance: 0 });
const selectedId = computed(() => props.account?.id ?? null);
const showDeleteAlert = ref(false);
const popoverTriggerId = `account-actions-popover-${Date.now()}`;
const actionsPopover = ref<HTMLIonOverlayElement | null>(null);

const formRules = computed(() => ({
  name: { required: helpers.withMessage('El nombre es obligatorio', required), maxLength: maxLength(255) },
  initialBalance: { minValue: minValue(0) },
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
    } else {
      form.name = '';
      form.initialBalance = 0;
    }
  },
  { immediate: true },
);
// End Watch

// 8. Computed
// End Computed

// 9. OnMounted
// End OnMounted

// 10. Functions
function cancelModal() {
  emit('dismiss');
}

function dismissActionsPopover() {
  void actionsPopover.value?.dismiss();
}

function onAdjustBalance() {
  dismissActionsPopover();

  if (selectedId.value != null && props.account) {
    emit('adjustBalance', {
      accountId: selectedId.value,
      accountName: props.account.name || '',
    });
  }
}

function confirmRemove() {
  dismissActionsPopover();
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

  emit('saved', payload);
}
// End Functions
</script>

<style scoped>
.actions-popover {
  --width: auto;
  --max-width: 200px;
  --background: var(--ion-background-color);
  --color: var(--ion-text-color);
}

.popover-content {
  padding: 8px;
}

.popover-action {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: flex-start;
  padding: 12px 16px;
  border-radius: 8px;
}

.popover-action ion-icon {
  font-size: 1.2rem;
}
</style>
