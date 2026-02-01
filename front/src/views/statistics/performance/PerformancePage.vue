<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Mis Finanzas</ion-title>
        <ion-buttons slot="end">
          <ion-button id="downloadButton" >
            <ion-icon :icon="downloadOutline"></ion-icon>
          </ion-button>

          <ion-button @click="openConfigModal">
            <ion-icon :icon="settingsOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-grid>
        <ion-row>
          <ion-col size="12" style="display: flex; justify-content: center">
            <ion-segment v-model="mainSegment" scrollable>
              <ion-segment-button value="day">Día</ion-segment-button>
              <ion-segment-button value="week">Semana</ion-segment-button>
              <ion-segment-button value="month">Mes</ion-segment-button>
              <ion-segment-button value="year">Año</ion-segment-button>
            </ion-segment>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-grid style="height: 94%">
        <ion-row class="ion-justify-content-center" >
          <ion-col v-if="mainSegment == 'day'" size="6">
            <DayPerformanceComponent />
          </ion-col>

          <ion-col v-if="mainSegment == 'week'" size="6">
            <WeekPerformanceComponent />
          </ion-col>

          <ion-col v-if="mainSegment == 'month'" size="6">
            <MonthPerformanceComponent />
          </ion-col>

          <ion-col v-if="mainSegment == 'year'" size="6">
            <YearPerformanceComponent />
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-modal
        class="config-modal"
        :is-open="isConfigModalOpen"
        @did-dismiss="closeConfigModal"
      >
        <PersonalFinanceConfigModal @close="closeConfigModal" />
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonSegment,
  IonSegmentButton,
  IonButtons,
  IonButton,
  IonIcon,
  IonModal,
} from '@ionic/vue';
import { ref } from 'vue';
import { downloadOutline, settingsOutline } from 'ionicons/icons';

import DayPerformanceComponent from '@/views/statistics/performance/day/DayPerformanceComponent.vue';
import WeekPerformanceComponent from '@/views/statistics/performance/week/WeekPerformanceComponent.vue';
import MonthPerformanceComponent from '@/views/statistics/performance/month/MonthPerformanceComponent.vue';
import YearPerformanceComponent from '@/views/statistics/performance/year/YearPerformanceComponent.vue';
import PersonalFinanceConfigModal from '@/views/statistics/performance/components/PersonalFinanceConfigModal.vue';

const mainSegment = ref('day' as 'day' | 'week' | 'month' | 'year');
const isConfigModalOpen = ref(false);

function openConfigModal() {
  isConfigModalOpen.value = true;
}

function closeConfigModal() {
  isConfigModalOpen.value = false;
}
</script>

<style scoped>
@media (min-width: 768px) {
  .config-modal {
    --height: 90%;
    --width: 50%;
  }
}
</style>
