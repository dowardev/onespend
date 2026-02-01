<template>
  <ion-page>
  <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Rendimiento</ion-title>
        <ion-buttons slot="end">
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
              <ion-segment-button value="day">Dia</ion-segment-button>
              <ion-segment-button value="week">Semana</ion-segment-button>
              <ion-segment-button value="month">Mes</ion-segment-button>
              <ion-segment-button value="year">Año</ion-segment-button>
            </ion-segment>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-grid style="height: 94%">
        <ion-row style="height: 100%; overflow: auto">
          <!-- day -->
          <ion-col v-if="mainSegment == 'day'" size="12">
            <DayPerformanceComponent />
          </ion-col>

          <!-- week -->
          <ion-col v-if="mainSegment == 'week'" size="12">
            <WeekPerformanceComponent />
          </ion-col>

          <!-- month -->
          <ion-col v-if="mainSegment == 'month'" size="12">
            <MonthPerformanceComponent />
          </ion-col>

          <!-- year -->
          <ion-col v-if="mainSegment == 'year'" size="12">
            <YearPerformanceComponent />
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-modal :is-open="isConfigModalOpen" @didDismiss="closeConfigModal">
        <StatisticsConfigPage @close="closeConfigModal" />
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
// Imports
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonSegment, IonSegmentButton, IonButtons, IonButton, IonIcon, IonModal } from '@ionic/vue';
import { ref } from 'vue';
import { settingsOutline } from 'ionicons/icons';
// End Imports

// Components
import DayPerformanceComponent from '@/views/statistics/performance/day/DayPerformanceComponent.vue';
import WeekPerformanceComponent from '@/views/statistics/performance/week/WeekPerformanceComponent.vue';
import MonthPerformanceComponent from '@/views/statistics/performance/month/MonthPerformanceComponent.vue';
import YearPerformanceComponent from '@/views/statistics/performance/year/YearPerformanceComponent.vue';
import StatisticsConfigPage from '@/views/statistics/performance/config/StatisticsConfigPage.vue';
// End Components

// Vars
const mainSegment = ref('day' as 'day' | 'week' | 'month' | 'year');
const isConfigModalOpen = ref(false);
// End Vars

// Functions
function openConfigModal() {
  isConfigModalOpen.value = true;
}

function closeConfigModal() {
  isConfigModalOpen.value = false;
}
// End Functions

// Life cycle
// End Life cycle

// Computed
// End Computed

// Watch
// End Watch</script>
