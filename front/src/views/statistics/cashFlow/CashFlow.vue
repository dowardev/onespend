<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>
        <ion-title>{{ t('statistics.cashflow.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="10" size-lg="8">
            <ion-row>
              <ion-col size="12">
                <div class="range-chips">
                  <ion-chip
                    :color="cf.rangeDays.value === 30 ? 'primary' : undefined"
                    :outline="cf.rangeDays.value !== 30"
                    @click="cf.setRange({ days: 30 })"
                  >
                    <ion-label>{{ t('statistics.cashflow.cashflow.label1') }}</ion-label>
                  </ion-chip>
                  <ion-chip
                    :color="cf.rangeDays.value === 90 ? 'primary' : undefined"
                    :outline="cf.rangeDays.value !== 90"
                    @click="cf.setRange({ days: 90 })"
                  >
                    <ion-label>{{ t('statistics.cashflow.cashflow.label2') }}</ion-label>
                  </ion-chip>
                  <ion-chip
                    :color="cf.rangeDays.value === 365 ? 'primary' : undefined"
                    :outline="cf.rangeDays.value !== 365"
                    @click="cf.setRange({ days: 365 })"
                  >
                    <ion-label>{{ t('statistics.cashflow.cashflow.label3') }}</ion-label>
                  </ion-chip>
                </div>
              </ion-col>
            </ion-row>

            <ion-row>
              <ion-col size="6" size-sm="3">
                <ion-card class="metric-card ingresos-card shadow1">
                  <ion-card-content>
                    <ion-label class="metric-label">{{ t('statistics.cashflow.incomes') }}</ion-label>
                    <ion-text color="success" class="metric-value">{{
                      cf.formatCurrency(cf.summary.value?.totalIngresos ?? 0)
                    }}</ion-text>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="6" size-sm="3">
                <ion-card class="metric-card egresos-card shadow1">
                  <ion-card-content>
                    <ion-label class="metric-label">{{ t('statistics.cashflow.expenses') }}</ion-label>
                    <ion-text color="danger" class="metric-value">{{
                      cf.formatCurrency(cf.summary.value?.totalEgresos ?? 0)
                    }}</ion-text>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="6" size-sm="3">
                <ion-card class="metric-card neto-card shadow1">
                  <ion-card-content>
                    <ion-label class="metric-label">Neto</ion-label>
                    <ion-text
                      :color="(cf.summary.value?.neto ?? 0) >= 0 ? 'success' : 'danger'"
                      class="metric-value"
                      >{{ cf.formatCurrency(cf.summary.value?.neto ?? 0) }}</ion-text
                    >
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="6" size-sm="3">
                <ion-card class="metric-card promedio-card shadow1">
                  <ion-card-content>
                    <ion-label class="metric-label">Promedio / día</ion-label>
                    <ion-text
                      :color="(cf.summary.value?.promedioDiario ?? 0) >= 0 ? 'success' : 'danger'"
                      class="metric-value"
                      >{{ cf.formatCurrency(cf.summary.value?.promedioDiario ?? 0) }}</ion-text
                    >
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>

            <ion-row>
              <ion-col size="12">
                <ion-card class="shadow1 chart-card">
                  <ion-card-content class="chart-wrapper">
                    <CashFlowChart
                      v-if="cf.summary.value"
                      :labels="cf.summary.value.labels"
                      :ingresos-data="cf.summary.value.ingresosData"
                      :egresos-data="cf.summary.value.egresosData"
                    />
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButtons,
  IonMenuButton,
  IonChip,
  IonLabel,
  IonCard,
  IonCardContent,
  IonText,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';

import { onMounted, computed } from 'vue';
import { useCashFlow } from '@/composables/useCashFlow';
import systemController from '@/controllers/systemConfigController';
import CashFlowChart from '@/components/CashFlowChart.vue';

const cf = useCashFlow();
const { t } = useLocale();
const designMode = computed(() => systemController.getDesignMode());

onMounted(() => {
  cf.load();
});
</script>

<style scoped>
.range-chips {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.metric-card,
.chart-card {
  margin: 0;
}

.metric-card ion-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 8px;
}

.metric-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
  opacity: 0.7;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
}

.chart-wrapper {
  padding: 12px;
}

ion-row + ion-row {
  margin-top: 16px;
}
</style>
