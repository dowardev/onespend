<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="close">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Ingresos Budget</ion-title>
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
          <ion-label color="medium">No hay ingresos budget</ion-label>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-list-header>
          <ion-label>Desglose</ion-label>
        </ion-list-header>
        <ion-item v-for="(entry, index) in entries" :key="index">
          <ion-label>{{ entry.name || 'Sin nombre' }}</ion-label>
          <ion-note slot="end">{{ formatCurrency(entry.amount) }}</ion-note>
        </ion-item>
        <ion-item lines="none">
          <ion-label><strong>Total</strong></ion-label>
          <ion-note slot="end"><strong>{{ formatCurrency(totalAmount) }}</strong></ion-note>
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
import { closeOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'vue-chartjs';

ChartJS.register(ArcElement, Tooltip, Legend);

interface BudgetEntry {
  description?: string;
  category?: string;
  amount: number;
}

const props = defineProps<{
  entries: BudgetEntry[];
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
  return props.entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
});

const chartData = computed(() => ({
  labels: props.entries.map(entry => entry.name || 'Sin nombre'),
  datasets: [
    {
      data: props.entries.map(entry => entry.amount || 0),
      backgroundColor: props.entries.map((_, i) => colors[i % colors.length]),
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
