<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-grid>
    <ion-row>
      <ion-col size="12" style="display: flex; justify-content: center">
        <ion-segment v-model="mainSegment" scrollable>
          <ion-segment-button value="day">Dia</ion-segment-button>
          <ion-segment-button value="week">Semana</ion-segment-button>
          <ion-segment-button value="month">Mes</ion-segment-button>
          <ion-segment-button value="year">Año</ion-segment-button>
        </ion-segment>
      </ion-col>
    </ion-row>
  </ion-grid>

  <ion-grid style="height: 94%">
    <ion-row style="height: 100%; overflow: auto">
      <!-- day -->
      <ion-col v-if="mainSegment == 'day'" size="12">
        <DayPerformanceComponent />
      </ion-col>

      <!-- week -->
      <ion-col v-if="mainSegment == 'week'" size="12">
        <WeekComponent />
      </ion-col>

      <!-- month -->
      <ion-col v-if="mainSegment == 'month'" size="12">
        <MonthComponent />
      </ion-col>

      <!-- year -->
      <ion-col v-if="mainSegment == 'year'" size="12">
        <YearComponent />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts" setup>
import { IonSegment, IonSegmentButton } from '@ionic/vue';
import { ref } from 'vue';

// components
import DayPerformanceComponent from '@/views/statistics/performance/day/DayPerformanceComponent.vue';
import WeekComponent from '@/views/statistics/performance/week/WeekPerformanceComponent.vue';
import MonthComponent from '@/views/statistics/performance/month/MonthPerformanceComponent.vue';
import YearComponent from '@/views/statistics/performance/year/YearPerformanceComponent.vue';
// end components

// vars
const mainSegment = ref('day' as 'day' | 'week' | 'month' | 'year');
// end vars
</script>
