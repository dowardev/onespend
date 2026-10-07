<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page class="maintenance-page admin-page">
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>
        <ion-title>Mantenimiento</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="6">
            <ion-list>
              <ion-list-header>
                <ion-label>{{ t('admin.maintenancepage.label') }}</ion-label>
              </ion-list-header>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import systemController from '@/controllers/systemConfigController';
// End Imports

// Controllers

// Components

// End Components

// Vars
const router = useRouter();
const { t } = useLocale();
const designMode = computed(() => systemController.getDesignMode());

// End Vars

// End Functions

// Life cycle

// End Life cycle

// Computed

// End Computed

// Watch
</script>

<style scoped>
.maintenance-page {
}
</style>
