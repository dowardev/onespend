<template>
  <ion-list class="transparent shadow2 ion-padding">
    <ion-list-header>
      <ion-label>Semanal</ion-label>

      <ion-buttons>
        <ion-button fill="clear" @click="prevWeek">
          <ion-icon :icon="chevronBackOutline"> </ion-icon>
        </ion-button>

        <ion-button @click="openPopover($event)">
          {{ weekRangeLabel }}
        </ion-button>

        <ion-button fill="clear" @click="nextWeek">
          <ion-icon :icon="chevronForwardOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-list-header>

    <div class="list-content">
      <ion-row>
        <ion-col size="12" size-md="6">
          <ion-card class="shadow2">
            <ion-item lines="none">
              <ion-label>Ganancia semanal actual</ion-label>

              <ion-label slot="end">{{ formattedWeeklyProfit }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-col>

        <ion-col size="12" size-md="6">
          <WeekChartComponent :chart-data="chartData" :chart-options="chartOptions" />
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
        @ion-change="onPopoverDateChange"
      ></ion-datetime>

      <ion-item>
        <ion-button
          slot="end"
          fill="clear"
          class="no-shadow"
          color="primary"
          size="small"
          @click="resetToToday()"
          >Hoy</ion-button
        >
      </ion-item>
    </ion-content>
  </ion-popover>
  <!-- end popovers -->
</template>

<script setup lang="ts">
import { defineProps, defineEmits, type PropType } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import WeekChartComponent from '@/views/statistics/cashFlow/week/WeekChartComponent.vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

defineProps({
  chartData: { type: Object as PropType<ChartData<'bar'>>, default: () => ({ labels: [], datasets: [] }) },
  chartOptions: { type: Object as PropType<ChartOptions<'bar'>>, default: () => ({}) },
  weekRangeLabel: { type: String, default: '' },
  formattedWeeklyProfit: { type: String, default: '' },
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

function prevWeek() {
  emit('prev')
}

function nextWeek() {
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
