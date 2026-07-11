<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Flujo de Caja</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="10" size-lg="8">
            <ion-row>
              <ion-col size="12">
                <ion-segment :value="cf.rangeDays.value" @ion-change="onRangeChange">
                  <ion-segment-button value="30">
                    <ion-label>30 días</ion-label>
                  </ion-segment-button>
                  <ion-segment-button value="90">
                    <ion-label>90 días</ion-label>
                  </ion-segment-button>
                  <ion-segment-button value="365">
                    <ion-label>1 año</ion-label>
                  </ion-segment-button>
                </ion-segment>
              </ion-col>
            </ion-row>

            <ion-row>
              <ion-col size="6" size-sm="3">
                <ion-card class="metric-card ingresos-card">
                  <ion-card-content>
                    <ion-label class="metric-label">Ingresos</ion-label>
                    <ion-text color="success" class="metric-value">{{
                      cf.formatCurrency(cf.summary.value?.totalIngresos ?? 0)
                    }}</ion-text>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="6" size-sm="3">
                <ion-card class="metric-card egresos-card">
                  <ion-card-content>
                    <ion-label class="metric-label">Egresos</ion-label>
                    <ion-text color="danger" class="metric-value">{{
                      cf.formatCurrency(cf.summary.value?.totalEgresos ?? 0)
                    }}</ion-text>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="6" size-sm="3">
                <ion-card class="metric-card neto-card">
                  <ion-card-content>
                    <ion-label class="metric-label">Neto</ion-label>
                    <ion-text
                      :color="(cf.summary.value?.neto ?? 0) >= 0 ? 'success' : 'danger'"
                      class="metric-value"
                    >{{ cf.formatCurrency(cf.summary.value?.neto ?? 0) }}</ion-text>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="6" size-sm="3">
                <ion-card class="metric-card promedio-card">
                  <ion-card-content>
                    <ion-label class="metric-label">Promedio / día</ion-label>
                    <ion-text
                      :color="(cf.summary.value?.promedioDiario ?? 0) >= 0 ? 'success' : 'danger'"
                      class="metric-value"
                    >{{ cf.formatCurrency(cf.summary.value?.promedioDiario ?? 0) }}</ion-text>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>

            <ion-row>
              <ion-col size="12">
                <ion-card>
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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardContent,
  IonText,
} from '@ionic/vue'

import { onMounted } from 'vue'
import { useCashFlow } from '@/composables/useCashFlow'
import CashFlowChart from '@/components/CashFlowChart.vue'

const cf = useCashFlow()

onMounted(() => {
  cf.load()
})

function onRangeChange(ev: CustomEvent) {
  const val = ev.detail.value
  if (val === '30' || val === '90' || val === '365') {
    cf.setRange({ days: Number(val) as 30 | 90 | 365 })
  }
}
</script>

<style scoped>
.metric-card {
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
