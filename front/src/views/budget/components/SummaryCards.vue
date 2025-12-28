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
      <ion-item class="transparent">
        <ion-label>
          Se requiere
          <p>Efectivo: {{ formatCurrency(totalEstimacionEfectivo) }}</p>

          <p>
            Tarjeta:
            {{ formatCurrency(totalEstimacionDigital) }}
          </p>

          <p>
            Total estimado:
            {{ formatCurrency(derivedTotalEstimacionEfectivoTarjeta) }}
            Disponible:
            {{ formatCurrency(faltante) }}
          </p>
        </ion-label>
      </ion-item>
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
