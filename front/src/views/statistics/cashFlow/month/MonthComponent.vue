<template>
  <ion-list class="transparent shadow2 ion-padding">
    <ion-list-header>
      <ion-label>Mensual</ion-label>

      <ion-buttons>
        <ion-button fill="clear" @click="onPrev">
          <ion-icon :icon="chevronBackOutline"> </ion-icon>
        </ion-button>

        <ion-button
          @click="
            popovers.mainDate.event = $event;
            popovers.mainDate.open = true;
          "
        >
          {{ monthRangeLabel }}
        </ion-button>

        <ion-button fill="clear" @click="onNext">
          <ion-icon :icon="chevronForwardOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-list-header>

    <div class="list-content">
      <ion-row>
        <ion-col size="6">
          <ion-card class="shadow2">
            <ion-item lines="none">
              <ion-label>Ganancia mensual actual</ion-label>

              <ion-label slot="end">{{ formattedMonthlyProfit }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-col>

        <ion-col size="6">
          <MonthChartComponent :chart-data="chartData" :chart-options="chartOptions" />
        </ion-col>
      </ion-row>
    </div>
  </ion-list>

  <!-- popovers -->
  <ion-popover
    :is-open="popovers.mainDate.open"
    :event="popovers.mainDate.event"
    keep-contents-mounted
    @did-dismiss="popovers.mainDate.open = false"
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
import { defineProps } from 'vue';
import MonthChartComponent from '@/views/statistics/cashFlow/month/MonthChartComponent.vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

const props = defineProps({
  chartData: { type: Object, default: () => ({ labels: [], datasets: [] }) },
  chartOptions: { type: Object, default: () => ({}) },
  monthRangeLabel: { type: String, default: '' },
  formattedMonthlyProfit: { type: String, default: '' },
  selectedDate: { type: String, default: '' },
  popovers: { type: Object, default: () => ({ mainDate: { open: false, event: null } }) },
  onPrev: { type: Function, required: false },
  onNext: { type: Function, required: false },
  onPopoverDateChange: { type: Function, required: false },
  resetToToday: { type: Function, required: false },
});

function onPrev() {
  if (props.onPrev) props.onPrev();
}

function onNext() {
  if (props.onNext) props.onNext();
}

function onPopoverDateChange(e: CustomEvent) {
  if (props.onPopoverDateChange) props.onPopoverDateChange(e);
}

function onResetToToday() {
  if (props.resetToToday) props.resetToToday();
}
</script>

<style scoped></style>
