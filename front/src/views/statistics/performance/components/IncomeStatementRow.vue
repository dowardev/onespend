<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-item lines="full" class="ion-padding-vertical">
    <ion-grid class="ion-no-padding">
      <ion-row class="ion-align-items-center">
        <ion-col size="12" size-md="7" class="ion-text-wrap row-name">{{ item.name }}</ion-col>
        <ion-col size="6" size-md="3" class="ion-text-end row-percent">{{ item.percentOfIncome }}%</ion-col>
        <ion-col size="6" size-md="2" class="ion-text-end row-amount">{{ formatCurrency(item.amount) }}</ion-col>
      </ion-row>
    </ion-grid>
  </ion-item>
</template>

<script setup lang="ts">
import { IonItem, IonGrid, IonRow, IonCol } from '@ionic/vue'
import type { StatementItem } from '@/composables/useIncomeStatement'

defineProps<{ item: StatementItem }>()

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(val || 0)
}
</script>

<style scoped>
.row-name {
  font-size: 0.9rem;
}
.row-percent {
  font-size: 0.8rem;
}
.row-amount {
  font-size: 0.9rem;
  font-weight: 500;
}
@media (min-width: 768px) {
  .row-amount {
    min-width: 90px;
  }
}
</style>
