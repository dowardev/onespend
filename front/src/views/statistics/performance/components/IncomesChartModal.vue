<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="close">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('statistics.performance.incomes.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-card v-if="totalAmount > 0">
        <ion-card-content>
          <div style="height: 300px">
            <Pie :data="chartData" :options="chartOptions" />
          </div>
        </ion-card-content>
      </ion-card>

      <ion-list v-else>
        <ion-item lines="none">
          <ion-label color="medium">No hay ingresos registrados</ion-label>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-list-header>
          <ion-label>{{ t('statistics.performance.components.incomeschartmodal.label') }}</ion-label>
        </ion-list-header>
        <ion-item v-for="(source, index) in sources" :key="index">
          <ion-label>{{ source.name }}</ion-label>
          <ion-note slot="end">{{ formatCurrency(source.amount) }}</ion-note>
        </ion-item>
        <ion-item lines="none">
          <ion-label><strong>{{ t('common.total') }}</strong></ion-label>
          <ion-note slot="end"
            ><strong>{{ formatCurrency(totalAmount) }}</strong></ion-note
          >
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonCard,
  IonCardContent,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { closeOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'vue-chartjs';


const { t } = useLocale();
ChartJS.register(ArcElement, Tooltip, Legend);

interface IncomeSource {
  name: string;
  amount: number;
}

const props = defineProps<{
  sources: IncomeSource[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const colors = [
  '#4BC0C0',
  '#36A2EB',
  '#FFCE56',
  '#FF6384',
  '#9966FF',
  '#FF9F40',
  '#7BC225',
  '#C9CBCF',
];

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(val || 0);
}

function close() {
  emit('close');
}

const totalAmount = computed(() => {
  return props.sources.reduce((sum, source) => sum + (source.amount || 0), 0);
});

const chartData = computed(() => ({
  labels: props.sources.map((source) => source.name),
  datasets: [
    {
      data: props.sources.map((source) => source.amount || 0),
      backgroundColor: props.sources.map((_, i) => colors[i % colors.length]),
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
};
</script>
