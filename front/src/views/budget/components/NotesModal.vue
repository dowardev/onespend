<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-modal :is-open="isOpen" :keep-contents-mounted="true" @did-dismiss="$emit('dismiss')">
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="$emit('dismiss')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Notas - {{ providerName }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('save')">{{ t('common.save') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1">
        <ion-item lines="none">
          <ion-textarea
            :model-value="notes"
            :placeholder="t('budget.components.notesmodal.placeholder')"
            auto-grow
            :rows="10"
            @ion-input="onNotesInput"
          ></ion-textarea>
        </ion-item>
      </ion-card>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
// Imports
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonCard,
  IonItem,
  IonTextarea,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { closeOutline } from 'ionicons/icons';

const { t } = useLocale();
// End Imports

// Components

// End Components

// Vars
const props = defineProps<{
  isOpen: boolean;
  providerName: string;
  notes: string;
}>();

const emit = defineEmits(['dismiss', 'save', 'update-notes']);
// End Vars

// Functions
function onNotesInput(e: CustomEvent) {
  emit('update-notes', e.detail.value);
}
// End Functions

// Life cycle

// End Life cycle

// Computed

// End Computed

// Watch
// End Watch
</script>
