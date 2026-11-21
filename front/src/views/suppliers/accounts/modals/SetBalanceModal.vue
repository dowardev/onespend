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

        <ion-title>{{ t('accounts.balanceAdjustment.title') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button :disabled="!canSubmit" @click="onSubmit">
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-top ion-padding-bottom">
      <ion-card class="shadow1">
        <ion-item class="transparent" lines="none">
          <ion-label>
            <h3>{{ accountName }}</h3>
            <p>{{ t('accounts.balanceAdjustment.currentBalance') }}: {{ currentBalanceLabel }}</p>
          </ion-label>
        </ion-item>

        <ion-item class="transparent" lines="none">
          <ion-input
            v-model.number="targetBalance"
            :label="t('accounts.balanceAdjustment.targetBalance')"
            label-placement="floating"
            type="number"
            inputmode="decimal"
            :placeholder="String(currentBalance)"
          ></ion-input>
        </ion-item>
      </ion-card>

      <ion-card class="shadow1">
        <ion-item class="transparent" lines="none">
          <ion-label>
            <p>{{ previewLabel }}</p>
          </ion-label>
        </ion-item>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
import { ref, computed, watch } from 'vue';
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
} from '@ionic/vue';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { useLocale } from '@/composables/useLocale';
import { formatCurrency } from '@/utils/currency';
import { planBalanceAdjustment } from '@/utils/accountBalance';
// End Imports

// 2. Controllers / Composables
const { t } = useLocale();
// End Controllers / Composables

// 3. Components
// End Components

// 4. Interface and types imports
import type { BalanceAdjustment, BalanceAdjustmentEntryType } from '@/utils/accountBalance';
// End Interface and types imports

// 5. Main (props, emits, etc.)
const props = defineProps<{
  accountId: string | number | null;
  accountName?: string;
  currentBalance: number;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
  (e: 'submit', payload: { accountId: string | number; entryType: BalanceAdjustmentEntryType; amount: number }): void;
}>();
// End Main

// 6. Vars and const
const targetBalance = ref<number | null>(null);
// End Vars and const

// 7. Watch
watch(
  () => props.accountId,
  () => {
    targetBalance.value = null;
  },
);
// End Watch

// 8. Computed
const currentBalance = computed(() => Number(props.currentBalance) || 0);

const currentBalanceLabel = computed(() => formatCurrency({ value: currentBalance.value }));

const adjustment = computed<BalanceAdjustment | null>(() => {
  if (targetBalance.value == null) return null;
  return planBalanceAdjustment({
    currentBalance: currentBalance.value,
    targetBalance: Number(targetBalance.value),
  });
});

const previewLabel = computed(() => {
  if (targetBalance.value == null) {
    return t('accounts.balanceAdjustment.hint');
  }

  const plan = adjustment.value;
  if (!plan) {
    return t('accounts.balanceAdjustment.noChanges');
  }

  const label =
    plan.entryType === 'ingreso'
      ? t('accounts.balanceAdjustment.income')
      : t('accounts.balanceAdjustment.expense');

  return t('accounts.balanceAdjustment.preview', {
    type: label,
    amount: formatCurrency({ value: plan.amount }),
  });
});

const canSubmit = computed(() => adjustment.value != null && props.accountId != null);
// End Computed

// 9. OnMounted
// End OnMounted

// 10. Functions
function cancelModal() {
  emit('dismiss');
}

function onSubmit() {
  const plan = adjustment.value;
  const accountId = props.accountId;
  if (!plan || accountId == null) return;

  emit('submit', {
    accountId,
    entryType: plan.entryType,
    amount: plan.amount,
  });
}
// End Functions
</script>

<style scoped></style>
