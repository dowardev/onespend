<template>
  <ion-list class="transparent shadow2 ion-padding">
    <ion-list-header>
      <ion-label>Semanal</ion-label>

      <ion-buttons>
        <ion-button fill="clear" @click="prevWeek">
          <ion-icon :icon="chevronBackOutline"> </ion-icon>
        </ion-button>

        <ion-button
          @click="
            popovers.mainDate.event = $event;
            popovers.mainDate.open = true;
          "
        >
          {{ weekRangeLabel }}
        </ion-button>

        <ion-button fill="clear" @click="nextWeek">
          <ion-icon :icon="chevronForwardOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-list-header>

    <div class="list-content">
      <ion-row>
        <ion-col size="6">
          <ion-card class="shadow2">
            <ion-item lines="none">
              <ion-label>Ganancia semanal actual</ion-label>

              <ion-label slot="end">{{ formattedWeeklyProfit }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-col>

        <ion-col size="6">
          <WeekChartComponent
            :chart-data="chartData"
            :chart-options="chartOptions"
          />
        </ion-col>
      </ion-row>
    </div>
  </ion-list>

  <!-- popovers -->
  <ion-popover
    :is-open="popovers.mainDate.open"
    :event="popovers.mainDate.event"
    @did-dismiss="popovers.mainDate.open = false"
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
import { defineProps } from 'vue';
import WeekChartComponent from '@/views/statistics/cashFlow/week/WeekChartComponent.vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

const props = defineProps({
  chartData: { type: Object, default: () => ({ labels: [], datasets: [] }) },
  chartOptions: { type: Object, default: () => ({}) },
  weekRangeLabel: { type: String, default: '' },
  formattedWeeklyProfit: { type: String, default: '' },
  selectedDate: { type: String, default: '' },
  popovers: { type: Object, default: () => ({ mainDate: { open: false, event: null } }) },
  onPrev: { type: Function, required: false },
  onNext: { type: Function, required: false },
  onPopoverDateChange: { type: Function, required: false },
  resetToToday: { type: Function, required: false },
});

function prevWeek() {
  if (props.onPrev) props.onPrev();
}

function nextWeek() {
  if (props.onNext) props.onNext();
}

function onPopoverDateChange(e: CustomEvent) {
  if (props.onPopoverDateChange) props.onPopoverDateChange(e);
}

function resetToToday() {
  if (props.resetToToday) props.resetToToday();
}
</script>

<style scoped></style>
