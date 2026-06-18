<template>
  <ion-list class="transparent shadow2 ion-padding">
    <ion-list-header>
      <ion-label>Diario</ion-label>

      <ion-buttons>
        <ion-button fill="clear" @click="onPrev">
          <ion-icon :icon="chevronBackOutline"> </ion-icon>
        </ion-button>

        <ion-button @click="openPopover($event)">
          {{ dayLabel }}
        </ion-button>

        <ion-button fill="clear" @click="onNext">
          <ion-icon :icon="chevronForwardOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-list-header>

    <div class="list-content">
      <ion-row>
        <ion-col size="12" size-md="6">
          <ion-card class="shadow2">
            <ion-item lines="none">
              <ion-label>Ganancia del día</ion-label>

              <ion-label slot="end">{{ formattedDailyProfit }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-col>

        <ion-col size="12" size-md="6">
          <DayChartComponent
            :chart-data="chartData"
            :chart-options="chartOptions"
            :color-index="1"
          />
        </ion-col>
      </ion-row>
    </div>
  </ion-list>

  <!-- popovers -->
  <ion-popover
    :is-open="popoverOpen"
    :event="popoverEvent"
    keep-contents-mounted
    @did-dismiss="$emit('update:popoverOpen', false)"
  >
    <ion-content>
      <ion-datetime
        :value="selectedDate"
        style="background: transparent"
        presentation="date"
        @ion-change="onPopoverDateChange($event)"
      ></ion-datetime>

      <ion-item>
        <ion-button
          slot="end"
          fill="clear"
          class="no-shadow"
          color="primary"
          size="small"
          @click="resetToToday()"
        >
          Hoy
        </ion-button>
      </ion-item>
    </ion-content>
  </ion-popover>
  <!-- end popovers -->
</template>

<script setup lang="ts">
// Imports
import {
  IonButtons,
  IonButton,
  IonCard,
  IonCol,
  IonContent,
  IonDatetime,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPopover,
  IonRow,
} from '@ionic/vue';
import { defineProps, defineEmits, type PropType } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import DayChartComponent from '@/views/statistics/cashFlow/day/DayChartComponent.vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

// Props - this component is presentational. Popover state is managed via v-model.
defineProps({
  chartData: { type: Object as PropType<ChartData<'bar'>>, default: () => ({ labels: [], datasets: [] }) },
  chartOptions: { type: Object as PropType<ChartOptions<'bar'>>, default: () => ({}) },
  dayLabel: { type: String, default: '' },
  formattedDailyProfit: { type: String, default: '' },
  selectedDate: { type: String, default: '' },
  popoverOpen: { type: Boolean, default: false },
  popoverEvent: { type: Object as PropType<Event | null>, default: null },
});

const emit = defineEmits<{
  'update:popoverOpen': [v: boolean]
  'update:popoverEvent': [e: Event | null]
  prev: []
  next: []
  'popover-date-change': [e: CustomEvent]
  'reset-today': []
}>()

function openPopover(event: Event) {
  emit('update:popoverEvent', event)
  emit('update:popoverOpen', true)
}

function onPrev() {
  emit('prev')
}
function onNext() {
  emit('next')
}
function onPopoverDateChange(e: CustomEvent) {
  emit('popover-date-change', e)
}
function resetToToday() {
  emit('reset-today')
}
</script>


<style scoped></style>
