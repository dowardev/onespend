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

        <ion-title>{{ props.supplier ? t('suppliers.modals.addsuplierscomponent.editTitle') : t('suppliers.modals.addsuplierscomponent.newTitle') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="submitForm">
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-top ion-padding-bottom">
      <SupplierFormComponent
        ref="supplierFormRef"
        :supplier="props.supplier"
        @saved="onFormSaved"
        @dismiss="cancelModal"
      />
    </ion-content>
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
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { ref } from 'vue';
import { closeOutline, saveOutline } from 'ionicons/icons';

import SupplierFormComponent from './SupplierFormComponent.vue';
import type { Supplier } from '@/controllers/suppliersController';
import type { SupplierFormPayload } from './SupplierFormComponent.vue';


const { t } = useLocale();
const props = defineProps<{ supplier: Supplier | null }>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
  (e: 'saved', payload: SupplierFormPayload): void;
}>();

const supplierFormRef = ref<InstanceType<typeof SupplierFormComponent> | null>(null);

function cancelModal() {
  emit('dismiss');
}

function submitForm() {
  supplierFormRef.value?.submit();
}

function onFormSaved(payload: SupplierFormPayload) {
  emit('saved', payload);
}
</script>
