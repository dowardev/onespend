<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>

        <ion-title>Estadisticas</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="$router.push('/statistics/config')">
            <ion-icon :icon="settingsOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="statistics-content">
      <ion-card class="shadow1 main-card-content">
        <router-view />
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import {
  IonButtons,
  IonMenuButton,
  IonCard,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, onBeforeUnmount } from 'vue';

import { settingsOutline } from 'ionicons/icons';
// End Imports

// Controllers
import systemController from '@/controllers/systemConfigController';
// End Controllers

// Components

// Vars

// Computed
const designMode = computed(() => systemController.getDesignMode());

// End Computed

// Life cycle
onBeforeUnmount(() => {
  // Clean up any potential DOM contamination
  const testElements = document.querySelectorAll('[data-test-container], [data-test-element]');
  testElements.forEach(element => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
  
  // Clean up any performance test content that might have leaked
  const performanceElements = document.querySelectorAll('.performance-test, .test-results, [data-v-fa7b0ac9]');
  performanceElements.forEach(element => {
    if (element.parentNode && element.closest('.statistics-content') === null) {
      element.parentNode.removeChild(element);
    }
  });
});
// End Life cycle
</script>

<style scoped></style>
