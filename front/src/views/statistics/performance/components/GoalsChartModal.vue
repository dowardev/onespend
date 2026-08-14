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
        <ion-title>Progreso de Metas</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-card>
        <ion-card-content>
          <div style="height: 200px">
            <Doughnut :data="progressChartData" :options="progressChartOptions" />
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Ahorro Mensual</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div style="height: 200px">
            <Bar :data="monthlyChartData" :options="monthlyChartOptions" />
          </div>
        </ion-card-content>
      </ion-card>

      <ion-list>
        <ion-list-header>
          <ion-label>Resumen</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>Meta mensual</ion-label>
          <ion-note slot="end">{{ formatCurrency(goalAmount) }}</ion-note>
        </ion-item>
        <ion-item>
          <ion-label>Progreso actual</ion-label>
          <ion-note slot="end" :color="progressPercent >= 100 ? 'success' : 'primary'">
            {{ formatCurrency(currentProgress) }}
          </ion-note>
        </ion-item>
        <ion-item>
          <ion-label>Faltante</ion-label>
          <ion-note slot="end" :color="remainingAmount <= 0 ? 'success' : 'warning'">
            {{ formatCurrency(remainingAmount) }}
          </ion-note>
        </ion-item>
        <ion-item lines="none">
          <ion-label><strong>Progreso</strong></ion-label>
          <ion-note slot="end"
            ><strong>{{ progressPercent.toFixed(1) }}%</strong></ion-note
          >
        </ion-item>
      </ion-list>

      <ion-progress-bar
        :value="progressPercent / 100"
        :color="progressPercent >= 100 ? 'success' : 'primary'"
        class="ion-margin"
      ></ion-progress-bar>
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
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonProgressBar,
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { computed } from 'vue';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'vue-chartjs';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const props = defineProps<{
  goalAmount: number;
  currentProgress: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(val || 0);
}

function close() {
  emit('close');
}

const progressPercent = computed(() => {
  if (props.goalAmount <= 0) return 0;
  return (props.currentProgress / props.goalAmount) * 100;
});

const remainingAmount = computed(() => {
  return Math.max(0, props.goalAmount - props.currentProgress);
});

const progressChartData = computed(() => ({
  labels: ['Progreso', 'Restante'],
  datasets: [
    {
      data: [props.currentProgress, remainingAmount.value],
      backgroundColor: ['#4BC0C0', '#E0E0E0'],
    },
  ],
}));

const progressChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
};

const monthlyChartData = computed(() => ({
  labels: ['Meta', 'Actual'],
  datasets: [
    {
      label: 'Monto',
      data: [props.goalAmount, props.currentProgress],
      backgroundColor: ['#9966FF', '#4BC0C0'],
    },
  ],
}));

const monthlyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};
</script>
