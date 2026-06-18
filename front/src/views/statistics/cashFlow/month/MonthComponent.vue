<template>
  <ion-list class="transparent shadow2 ion-padding">
    <ion-list-header>
      <ion-label>Mensual</ion-label>

      <ion-buttons>
        <ion-button fill="clear" @click="onPrev">
          <ion-icon :icon="chevronBackOutline"> </ion-icon>
        </ion-button>

        <ion-button @click="openPopover($event)">
          {{ monthRangeLabel }}
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
              <ion-label>Ganancia mensual actual</ion-label>

              <ion-label slot="end">{{ formattedMonthlyProfit }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-col>

        <ion-col size="12" size-md="6">
          <MonthChartComponent :chart-data="chartData" :chart-options="chartOptions" />
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
        :value="selectedDate || null"
        style="background: transparent"
        presentation="year"
        @ion-change="onPopoverDateChange($event)"
      ></ion-datetime>

      <ion-item>
        <ion-button
          slot="end"
          fill="clear"
          class="no-shadow"
          color="primary"
          size="small"
          @click="onResetToToday()"
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
import MonthChartComponent from '@/views/statistics/cashFlow/month/MonthChartComponent.vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

defineProps({
  chartData: { type: Object as PropType<ChartData<'bar'>>, default: () => ({ labels: [], datasets: [] }) },
  chartOptions: { type: Object as PropType<ChartOptions<'bar'>>, default: () => ({}) },
  monthRangeLabel: { type: String, default: '' },
  formattedMonthlyProfit: { type: String, default: '' },
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

function onResetToToday() {
  emit('reset-today')
}
</script>

<style scoped></style>
