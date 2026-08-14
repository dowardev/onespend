<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-grid style="height: 100%">
    <ion-row style="height: 100%; overflow: auto">
      <!-- day -->
      <ion-col size="6">
        <DayComponent />
      </ion-col>

      <!-- week -->
      <ion-col size="6">
        <WeekComponent />
      </ion-col>

      <!-- month -->
      <ion-col size="6">
        <MonthComponent />
      </ion-col>

      <!-- year -->
      <ion-col size="6">
        <YearComponent />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts" setup>
// components
import DayComponent from '@/views/statistics/cashFlow/day/DayComponent.vue';
import WeekComponent from '@/views/statistics/cashFlow/week/WeekComponent.vue';
import MonthComponent from '@/views/statistics/cashFlow/month/MonthComponent.vue';
import YearComponent from '@/views/statistics/cashFlow/year/YearComponent.vue';
// end components
</script>
