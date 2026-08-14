<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-row>
    <!-- income -->
    <ion-col size="12">
      <ion-card :style="`border: 1px solid var(--ion-color-success)`" class="no-shadow">
        <ion-item lines="none" class="transparent">
          <ion-label>Ingresos</ion-label>

          <ion-button fill="clear"><ion-icon :icon="informationCircleOutline" /></ion-button>
        </ion-item>

        <div class="ion-padding-start ion-padding-bottom">
          <ion-label color="success">
            <h1>{{ formatCurrency({ value: totalIngresosOnly }) }}</h1>
          </ion-label>
        </div>
      </ion-card>
    </ion-col>

    <!-- expenses -->
    <ion-col size="12">
      <ion-card :style="`border: 1px solid var(--ion-color-danger)`" class="no-shadow">
        <ion-item lines="none" class="transparent">
          <ion-label>Egresos</ion-label>

          <ion-button fill="clear"><ion-icon :icon="informationCircleOutline" /></ion-button>
        </ion-item>

        <div class="ion-padding-start ion-padding-bottom">
          <ion-label color="danger">
            <h1>{{ formatCurrency({ value: totalEgresos }) }}</h1>
          </ion-label>
        </div>
      </ion-card>
    </ion-col>

    <!-- required -->
    <ion-col size="12">
      <ion-card class="shadow1">
        <div
          class="ion-padding-start ion-padding-top"
          style="display: flex; justify-content: space-between; height: 100%"
        >
          <div style="display: flex; align-items: center">
            <ion-card-title :color="differenceColor">{{ differenceLabel }}</ion-card-title>
          </div>

          <ion-button slot="end" fill="clear">
            <ion-icon :icon="informationCircleOutline"></ion-icon>
          </ion-button>
        </div>

        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Resultado</ion-label>
          </ion-list-header>

          <div class="list-content" style="border: none">
            <!-- cash -->
            <ion-item lines="full">
              <ion-label>Efectivo</ion-label>
              <ion-label slot="end" :color="colorDifferenceEfectivo">{{
                labelDifferenceEfectivo
              }}</ion-label>
            </ion-item>

            <!-- card -->
            <ion-item lines="full">
              <ion-label>Tarjeta</ion-label>
              <ion-label slot="end" :color="colorDifferenceTarjeta">{{
                labelDifferenceTarjeta
              }}</ion-label>
            </ion-item>
          </div>
        </ion-list>
      </ion-card>
    </ion-col>
  </ion-row>
</template>

<script setup lang="ts">
import { IonRow, IonCol, IonCard, IonItem, IonLabel, IonButton, IonIcon } from '@ionic/vue';
import { informationCircleOutline } from 'ionicons/icons';
import { formatCurrency } from '@/utils/currency';
import { computed } from 'vue';

const props = defineProps<{
  totalIngresosOnly: number | string;
  totalEgresos: number | string;
  totalIngresosEfectivo?: number | string;
  totalIngresosTarjeta?: number | string;
  totalEgresosEfectivo?: number | string;
  totalEgresosTarjeta?: number | string;
  faltante: number | string;
}>();

const totalIngresosOnly = computed(() => Number(props.totalIngresosOnly || 0) || 0);
const totalEgresos = computed(() => Number(props.totalEgresos || 0) || 0);
const faltante = computed(() => Number(props.faltante || 0) || 0);

const totalIngresosEfectivo = computed(() =>
  props.totalIngresosEfectivo != null ? Number(props.totalIngresosEfectivo) : 0,
);
const totalIngresosTarjeta = computed(() =>
  props.totalIngresosTarjeta != null ? Number(props.totalIngresosTarjeta) : 0,
);
const totalEgresosEfectivo = computed(() =>
  props.totalEgresosEfectivo != null ? Number(props.totalEgresosEfectivo) : 0,
);
const totalEgresosTarjeta = computed(() =>
  props.totalEgresosTarjeta != null ? Number(props.totalEgresosTarjeta) : 0,
);

const differenceEfectivo = computed(() => totalIngresosEfectivo.value - totalEgresosEfectivo.value);
const colorDifferenceEfectivo = computed(() => {
  const diff = differenceEfectivo.value;
  if (diff > 0) return 'success';
  if (diff < 0) return 'danger';
  return 'medium';
});
const labelDifferenceEfectivo = computed(() => formatCurrency({ value: Math.abs(differenceEfectivo.value) }));

const differenceTarjeta = computed(() => totalIngresosTarjeta.value - totalEgresosTarjeta.value);
const colorDifferenceTarjeta = computed(() => {
  const diff = differenceTarjeta.value;
  if (diff > 0) return 'success';
  if (diff < 0) return 'danger';
  return 'medium';
});
const labelDifferenceTarjeta = computed(() => formatCurrency({ value: Math.abs(differenceTarjeta.value) }));

const differenceColor = computed(() => {
  const diff = Number(faltante.value || 0);
  if (diff > 0) return 'success';
  if (diff < 0) return 'danger';
  return 'medium';
});

const differenceLabel = computed(() => {
  const diff = Number(faltante.value || 0);
  if (diff > 0) return 'Sobrante';
  if (diff < 0) return 'Faltante';
  return 'Cuadrado';
});


</script>

<style scoped>
ion-card {
  margin-bottom: 12px;
}
</style>
