<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Mis Finanzas</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="exportToExcel" :disabled="isExporting">
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
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="10" size-lg="8">
            <PerformanceComponent
              ref="performanceComponentRef"
              :period="mainSegment"
            />
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-modal
        class="config-modal"
        :is-open="isConfigModalOpen"
        @did-dismiss="closeConfigModal"
      >
        <PersonalFinanceConfigModal
          @close="closeConfigModal"
          @save="onConfigSave"
        />
      </ion-modal>

      <ion-loading :is-open="isExporting" message="Generando Excel..." />
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
  IonLoading,
} from '@ionic/vue';
import { ref } from 'vue';
import { downloadOutline, settingsOutline } from 'ionicons/icons';
import { format } from 'date-fns';
import { StatisticsController } from '@/controllers/statisticsController';

import PerformanceComponent from '@/views/statistics/performance/components/PerformanceComponent.vue';
import PersonalFinanceConfigModal from '@/views/statistics/performance/components/PersonalFinanceConfigModal.vue';

const statisticsController = new StatisticsController();

const mainSegment = ref('day' as 'day' | 'week' | 'month' | 'year');
const isConfigModalOpen = ref(false);
const isExporting = ref(false);
const performanceComponentRef = ref<any>(null);

function openConfigModal() {
  isConfigModalOpen.value = true;
}

function closeConfigModal() {
  isConfigModalOpen.value = false;
}

async function onConfigSave() {
  isConfigModalOpen.value = false;
  await performanceComponentRef.value?.loadConfig();
}

async function exportToExcel() {
  if (isExporting.value) {
    return;
  }

  isExporting.value = true;

  try {
    await statisticsController.downloadExcel({
      period: mainSegment.value,
      dateLabel: performanceComponentRef.value?.dateLabel || format(new Date(), 'yyyy-MM-dd'),
      incomeData: {
        salary: performanceComponentRef.value?.income?.salary || 0,
        investments: performanceComponentRef.value?.income?.investments || 0,
        other: performanceComponentRef.value?.income?.other || 0,
        total: performanceComponentRef.value?.income?.total || 0,
      },
      expensesData: {
        housing: performanceComponentRef.value?.expenses?.housing || 0,
        food: performanceComponentRef.value?.expenses?.food || 0,
        transport: performanceComponentRef.value?.expenses?.transport || 0,
        entertainment: performanceComponentRef.value?.expenses?.entertainment || 0,
        health: performanceComponentRef.value?.expenses?.health || 0,
        other: performanceComponentRef.value?.expenses?.other || 0,
        total: performanceComponentRef.value?.expenses?.total || 0,
      },
      summaryData: {
        balance: performanceComponentRef.value?.summary?.balance || 0,
        savings: performanceComponentRef.value?.summary?.savings || 0,
        savingsPercentage:
          performanceComponentRef.value?.summary?.savingsPercentage || 0,
      },
      configData: {
        savingsPercent: performanceComponentRef.value?.config?.savingsPercent || 20,
      },
      filenameFactory: () =>
        `reporte_${mainSegment.value}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    });
  } catch (error) {
    console.error('[PerformancePage] Excel error:', error);
  } finally {
    isExporting.value = false;
  }
}
</script>

<style scoped>
@media (min-width: 768px) {
  .config-modal {
    --height: 90%;
    --max-height: 700px;
    --max-width: 500px;
    --min-height: 400px;
    --min-width: 300px;
    --width: 90%;
  }
}
</style>
