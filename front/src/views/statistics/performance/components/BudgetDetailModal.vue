<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="close">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{ title }}</ion-title>

        <ion-buttons slot="end">
          <ion-label>{{ formattedDateRange }}</ion-label>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1 summary-card">
        <ion-card-content class="ion-padding">
          <ion-item lines="none" class="ion-no-padding transparent">
            <ion-label>
              <div class="total-label">Total</div>
              <div
                class="total-amount"
                :color="type === 'ingreso' ? 'success' : 'danger'"
              >{{ formatCurrency(totalAmount) }}</div>
              <div class="total-count">
                {{ items.length }} registro{{ items.length !== 1 ? 's' : '' }}
              </div>
            </ion-label>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <ion-list v-if="items.length > 0">
        <ion-list-header>
          <ion-label>Detalle</ion-label>
        </ion-list-header>

        <ion-item v-for="(item, index) in sortedItems" :key="index" lines="full">
          <ion-label>
            <div class="item-name">{{ item.name }}</div>
            <div v-if="item.time" class="item-time">{{ formatTime(item.time) }}</div>
          </ion-label>
          <ion-note slot="end" :color="type === 'ingreso' ? 'success' : 'danger'">
            {{ formatCurrency(item.amount) }}
          </ion-note>
        </ion-item>
      </ion-list>

      <div v-else class="empty-state">
        <ion-icon :icon="walletOutline" color="medium"></ion-icon>
        <p>Sin registros en este período</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonCard,
  IonCardContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/vue';

import { computed, ref, onMounted } from 'vue';
import { format } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';

import { closeOutline, walletOutline } from 'ionicons/icons';

interface BudgetItem {
  name: string;
  amount: number;
  time?: number | null;
}

const props = defineProps<{
  type: 'ingreso' | 'egreso';
  items: BudgetItem[];
  period: 'day' | 'week' | 'month' | 'year';
  dateLabel: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const title = computed(() => {
  return props.type === 'ingreso' ? 'Ingresos (Budget)' : 'Gastos (Budget)';
});

const formattedDateRange = computed(() => {
  return props.dateLabel;
});

const totalAmount = computed(() => {
  return props.items.reduce((sum, item) => sum + item.amount, 0);
});

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    if (a.time && b.time) {
      return b.time - a.time;
    }
    return 0;
  });
});

function formatCurrency(val: number | null | undefined) {
  if (val === null || val === undefined) return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(val || 0);
}

function formatTime(timestamp: number) {
  try {
    return format(new Date(timestamp), 'dd MMM, HH:mm', { locale: esLocale });
  } catch {
    return '';
  }
}

function close() {
  emit('close');
}
</script>

<style scoped>
.total-label {
  font-size: 14px;
  color: var(--ion-color-medium, #666);
}

.total-amount {
  font-size: 28px;
  font-weight: bold;
  margin: 4px 0;
}

.total-count {
  font-size: 12px;
  color: var(--ion-color-medium, #666);
}

.item-name {
  font-weight: 500;
}

.item-time {
  font-size: 12px;
  color: var(--ion-color-medium, #666);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
}

.empty-state ion-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  color: var(--ion-color-medium, #666);
  margin: 0;
}
</style>
