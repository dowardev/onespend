<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="close">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Gastos por Categoría</ion-title>
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
          <ion-label color="medium">No hay gastos registrados</ion-label>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-list-header>
          <ion-label>Desglose</ion-label>
        </ion-list-header>
        <ion-item v-for="(category, index) in categories" :key="index">
          <ion-label>{{ category.name }}</ion-label>
          <ion-note slot="end">{{ formatCurrency(category.amount) }}</ion-note>
        </ion-item>
        <ion-item lines="none">
          <ion-label><strong>Total</strong></ion-label>
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
import { closeOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'vue-chartjs';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryData {
  name: string;
  amount: number;
  color?: string;
}

const props = defineProps<{
  categories: CategoryData[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const colors = [
  '#FF6384',
  '#36A2EB',
  '#FFCE56',
  '#4BC0C0',
  '#9966FF',
  '#FF9F40',
  '#C9CBCF',
  '#7BC225',
  '#FF6384',
  '#A0A0A0',
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
  return props.categories.reduce((sum, cat) => sum + (cat.amount || 0), 0);
});

const chartData = computed(() => ({
  labels: props.categories.map((cat) => cat.name),
  datasets: [
    {
      data: props.categories.map((cat) => cat.amount || 0),
      backgroundColor: props.categories.map((_, i) => colors[i % colors.length]),
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
