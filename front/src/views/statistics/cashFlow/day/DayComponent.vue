<template>
  <ion-list class="transparent shadow2 ion-padding">
    <ion-list-header>
      <ion-label>Diario</ion-label>

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
          {{ dayLabel }}
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
              <ion-label>Ganancia del día</ion-label>

              <ion-label slot="end">{{ formattedDailyProfit }}</ion-label>
            </ion-item>
          </ion-card>
        </ion-col>

        <ion-col size="6">
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
    :is-open="popovers.mainDate.open"
    :event="popovers.mainDate.event"
    @did-dismiss="popovers.mainDate.open = false"
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
import { defineProps } from 'vue';
import DayChartComponent from '@/views/statistics/cashFlow/day/DayChartComponent.vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

// Props - this component is now presentational. Data and handlers come from parent.
const props = defineProps({
  chartData: { type: Object, default: () => ({ labels: [], datasets: [] }) },
  chartOptions: { type: Object, default: () => ({}) },
  dayLabel: { type: String, default: '' },
  formattedDailyProfit: { type: String, default: '' },
  selectedDate: { type: String, default: '' },
  popovers: { type: Object, default: () => ({ mainDate: { open: false, event: null } }) },
  onPrev: { type: Function, required: false },
  onNext: { type: Function, required: false },
  onPopoverDateChange: { type: Function, required: false },
  resetToToday: { type: Function, required: false },
});

function handlePrev() {
  if (props.onPrev) props.onPrev();
}
function handleNext() {
  if (props.onNext) props.onNext();
}
function handlePopoverDateChange(e: CustomEvent) {
  if (props.onPopoverDateChange) props.onPopoverDateChange(e);
}
function handleResetToToday() {
  if (props.resetToToday) props.resetToToday();
}
</script>

<style scoped></style>
