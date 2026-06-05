<template>
  <div class="entries-list-container">
    <ion-list class="transparent">
      <ion-list-header>
        <ion-label>{{ title }}</ion-label>
      </ion-list-header>

      <div v-if="items.length > 0" class="list-content">
        <div class="ion-padding-bottom">
          <EntriesChart v-if="showChart && items.length > 0" :items="items" :colors="chartColors" />
        </div>

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
          <ion-label slot="end" class="total-amount">{{ formatCurrency(total) }}</ion-label>
        </ion-item>
      </div>

      <div v-else class="empty-state ion-padding">
        <ion-text color="medium">
          <em>No hay {{ title.toLowerCase() }} en este periodo</em>
        </ion-text>
      </div>
    </ion-list>
  </div>
</template>

<script setup lang="ts">
import { IonItem, IonLabel, IonList, IonListHeader, IonText } from '@ionic/vue';
import EntriesChart, { type EntryChartItem } from './EntriesChart.vue';
import type { Income } from '@/stores/budgetEntriesStore';

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
    showChart?: boolean;
    chartColors?: string[];
  }>(),
  {
    footerLabel: 'Total',
    showChart: false,
  },
);

const emit = defineEmits<{
  (e: 'edit', item: EntryListItem | Income): void;
}>();

function formatCurrency(val: number | null | undefined): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(val || 0);
}
</script>

<style scoped>
.entries-list-container {
  display: flex;
  flex-direction: column;
}

.total-amount {
  font-weight: 700;
}

.empty-state {
  text-align: center;
  padding: 1rem;
}
</style>
