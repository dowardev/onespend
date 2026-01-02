<template>
  <ion-row>
    <!-- income -->
    <ion-col size="12">
      <ion-card
        :style="`border: 1px solid var(--ion-color-success)`"
        class="no-shadow"
      >
        <ion-item lines="none" class="transparent">
          <ion-label>Ingresos</ion-label>

          <ion-button fill="clear"
            ><ion-icon :icon="informationCircleOutline"
          /></ion-button>
        </ion-item>

        <div class="ion-padding-start ion-padding-bottom">
          <ion-label color="success">
            <h1>{{ formatCurrency(totalIngresosOnly) }}</h1>
          </ion-label>
        </div>
      </ion-card>
    </ion-col>

    <!-- expenses -->
    <ion-col size="12">
      <ion-card
        :style="`border: 1px solid var(--ion-color-danger)`"
        class="no-shadow"
      >
        <ion-item lines="none" class="transparent">
          <ion-label>Egresos</ion-label>

          <ion-button fill="clear"
            ><ion-icon :icon="informationCircleOutline"
          /></ion-button>
        </ion-item>

        <div class="ion-padding-start ion-padding-bottom">
          <ion-label color="danger">
            <h1>{{ formatCurrency(totalEgresos) }}</h1>
          </ion-label>
        </div>
      </ion-card>
    </ion-col>

    <!-- credit -->
    <ion-col size="12">
      <ion-card
        :style="`border: 1px solid var(--ion-color-primary)`"
        class="no-shadow"
      >
        <ion-item lines="none" class="transparent">
          <ion-label>Credito</ion-label>

          <ion-button fill="clear"
            ><ion-icon :icon="informationCircleOutline"
          /></ion-button>
        </ion-item>

        <div class="ion-padding-start ion-padding-bottom">
          <ion-label color="primary">
            <h1>{{ formatCurrency(creditoValue) }}</h1>
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
            <ion-card-title :color="differenceColor">{{
              differenceLabel
            }}</ion-card-title>
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
              <ion-label slot="end" :color="colorEfectivo">{{
                labelEfectivo
              }}</ion-label>
            </ion-item>

            <!-- card -->
            <ion-item lines="full">
              <ion-label>Tarjeta</ion-label>
              <ion-label slot="end" :color="colorTarjeta">{{
                labelTarjeta
              }}</ion-label>
            </ion-item>

            <!-- credit -->
            <ion-item lines="full">
              <ion-label>Credito</ion-label>
              <ion-label slot="end" :color="colorCredito">{{
                labelCredito
              }}</ion-label>
            </ion-item>
          </div>
        </ion-list>
      </ion-card>
    </ion-col>
  </ion-row>
</template>

<script setup lang="ts">
import {
  IonRow,
  IonCol,
  IonCard,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
} from '@ionic/vue';
import { informationCircleOutline } from 'ionicons/icons';
import { computed } from 'vue';

const props = defineProps<{
  totalIngresosOnly: number | string;
  totalEgresos: number | string;
  totalEstimacionEfectivoTarjeta: number | string;
  totalEstimacionEfectivo?: number | string;
  totalEstimacionDigital?: number | string;
  providers?: any[];
  selectedDate?: string;
  faltante: number | string;
  creditoValue?: number | string | null;
}>();

const totalIngresosOnly = computed(
  () => Number(props.totalIngresosOnly || 0) || 0
);
const totalEgresos = computed(() => Number(props.totalEgresos || 0) || 0);
const totalEstimacionEfectivoTarjeta = computed(
  () => Number(props.totalEstimacionEfectivoTarjeta || 0) || 0
);
const faltante = computed(() => Number(props.faltante || 0) || 0);
const creditoValue = computed(() =>
  props.creditoValue != null ? Number(props.creditoValue) : totalEgresos.value
);

// If providers + selectedDate are provided, compute per-method totals locally
const providersToday = computed(() => {
  try {
    const list = Array.isArray(props.providers) ? props.providers : [];
    const sel = String(props.selectedDate || '').slice(0, 10);
    if (!sel) return [];
    return list.filter((p: any) => String(p.date || '').slice(0, 10) === sel);
  } catch (_e) {
    return [];
  }
});

const totalEstimacionEfectivo = computed(() => {
  try {
    if (props.totalEstimacionEfectivo != null)
      return Number(props.totalEstimacionEfectivo) || 0;
    return (providersToday.value || []).reduce(
      (s: number, p: any) => s + Number(p.efectivo || 0),
      0
    );
  } catch (_e) {
    return 0;
  }
});

const totalEstimacionDigital = computed(() => {
  try {
    if (props.totalEstimacionDigital != null)
      return Number(props.totalEstimacionDigital) || 0;
    return (providersToday.value || []).reduce(
      (s: number, p: any) => s + Number(p.tarjeta || 0),
      0
    );
  } catch (_e) {
    return 0;
  }
});

// If explicit totalEstimacionEfectivoTarjeta not provided, derive from per-method totals
const derivedTotalEstimacionEfectivoTarjeta = computed(() => {
  try {
    if (Number(props.totalEstimacionEfectivoTarjeta || 0) > 0)
      return Number(props.totalEstimacionEfectivoTarjeta || 0) || 0;
    return (
      Number(totalEstimacionEfectivo.value || 0) +
      Number(totalEstimacionDigital.value || 0)
    );
  } catch (_e) {
    return 0;
  }
});

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

const labelEfectivo = computed(() =>
  formatCurrency(totalEstimacionEfectivo.value)
);
const colorEfectivo = computed(() => 'primary');

const labelTarjeta = computed(() =>
  formatCurrency(totalEstimacionDigital.value)
);
const colorTarjeta = computed(() => 'primary');

const labelCredito = computed(() => formatCurrency(creditoValue.value));
const colorCredito = computed(() => 'primary');

function formatCurrency(v: number | string) {
  try {
    const n = Number(v || 0) || 0;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(n);
  } catch (_e) {
    return String(v || '0');
  }
}
</script>

<style scoped>
ion-card {
  margin-bottom: 12px;
}
</style>
