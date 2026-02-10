<template>
  <ion-list class="transparent">
    <ion-list-header>
      <ion-label>{{ title }}</ion-label>
      <ion-button @click="emit('openChart')">
        <ion-icon :icon="pieChartOutline" />
      </ion-button>
    </ion-list-header>

    <div class="list-content" v-if="items.length > 0">
      <ion-item
        v-for="item in items"
        :key="item.id"
        lines="full"
        button
        @click="emit('edit', item)"
      >
        <ion-label>{{ item.name }}</ion-label>
        <ion-label slot="end">{{ formatCurrency(item.amount) }}</ion-label>
      </ion-item>

      <ion-item lines="full">
        <ion-label>{{ footerLabel }}</ion-label>
        <ion-label slot="end" class="total-amount">{{
          formatCurrency(total)
        }}</ion-label>
      </ion-item>
    </div>

    <div class="empty-state ion-padding" v-else>
      <ion-text color="medium">
        <em>No hay {{ title.toLowerCase() }} en este periodo</em>
      </ion-text>
    </div>
  </ion-list>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonText,
} from '@ionic/vue';
import { pieChartOutline } from 'ionicons/icons';
import type { Income } from '@/stores/budgetStore';

export interface EntryListItem {
  id: string | number;
  name: string;
  amount: number;
  entryType?: 'ingreso' | 'egreso';
}

const props = withDefaults(
  defineProps<{
    title: string;
    items: EntryListItem[] | Income[];
    total: number;
    footerLabel?: string;
  }>(),
  {
    footerLabel: 'Total',
  }
);

const emit = defineEmits<{
  (e: 'edit', item: EntryListItem | Income): void;
  (e: 'openChart'): void;
}>();

function formatCurrency(val: number | null | undefined): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(val || 0);
}
</script>

<style scoped>
.total-amount {
  font-weight: 700;
}

.empty-state {
  text-align: center;
  padding: 1rem;
}
</style>
