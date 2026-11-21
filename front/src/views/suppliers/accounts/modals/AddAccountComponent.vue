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

        <ion-title>{{ selectedId ? 'Editar Cuenta' : 'Crear Cuenta' }}</ion-title>

        <ion-buttons slot="end">
          <ion-button v-if="selectedId" color="danger" @click="confirmRemove">
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>
          <ion-button :disabled="!isFormValid" @click="onSubmit">
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
  IonCardContent,
  IonInput,
  IonAlert,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { reactive, computed, watch, ref } from 'vue';
import { closeOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { required, minValue, maxLength, helpers } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import type { Account } from '@/stores/accountsStore';


const { t } = useLocale();
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
}>();

function confirmRemove() {
  if (selectedId.value != null) {
    emit('delete', selectedId.value);
  }
}

const form = reactive({ name: '', initialBalance: 0 });
const selectedId = computed(() => props.account?.id ?? null);
const showDeleteAlert = ref(false);

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
    text: t('suppliers.accounts.modals.addaccountcomponent.text'),
    role: 'destructive',
    handler: () => {
      if (selectedId.value != null) emit('delete', selectedId.value);
    },
  },
];

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

function cancelModal() {
  emit('dismiss');
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
</script>

<style scoped></style>
