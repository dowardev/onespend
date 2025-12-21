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

    <ion-content>
      <ion-card class="shadow1 main-card-content">
        <CashFlowComponent v-if="$route.name == 'StatisticsCashFlow'" />

        <PerformancePage v-if="$route.name == 'StatisticsPerformance'" />
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
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
import { computed } from 'vue';

// constrollers
import systemController from '@/controllers/systemConfigController';
// end constrollers

// components
import CashFlowComponent from '@/views/statistics/cashFlow/CashFlow.vue';
import PerformancePage from '@/views/statistics/performance/PerformancePage.vue';
import { settingsOutline } from 'ionicons/icons';
// end components

// vars
// end vars

// computed
const designMode = computed(() => systemController.getDesignMode());
// end computed
</script>

<style scoped></style>
