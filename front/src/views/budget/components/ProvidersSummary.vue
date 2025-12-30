<template>
  <ion-grid>
    <ion-row>
      <ion-col>
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Resumen de gastos</ion-label>
          </ion-list-header>

          <div class="list-content">
            <!-- cash -->
            <ion-item lines="full">
              <ion-label>Efectivo</ion-label>

              <ion-label slot="end">{{
                formatCurrency(efectivoValue)
              }}</ion-label>
            </ion-item>

            <!-- card -->
            <ion-item lines="full">
              <ion-label>Tarjeta</ion-label>

              <ion-label slot="end">{{
                formatCurrency(tarjetaValue)
              }}</ion-label>
            </ion-item>

            <!-- credit -->
            <ion-item lines="full">
              <ion-label>Credito</ion-label>

              <ion-label slot="end">{{
                formatCurrency(creditoValue)
              }}</ion-label>
            </ion-item>
          </div>
        </ion-list>
      </ion-col>
    </ion-row>
  </ion-grid>

  <ion-grid>
    <ion-row>
      <ion-col>
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
  </ion-grid>
</template>

<script setup lang="ts">
import { IonRow, IonCol, IonCard, IonItem, IonLabel } from '@ionic/vue';
import { informationCircleOutline } from 'ionicons/icons';
import { computed } from 'vue';

const props = defineProps<{
  // provider-required totals
  efectivo?: number | string;
  tarjeta?: number | string;
  credito?: number | string;
  // optional income totals to compare against (if not provided, treat as 0)
  ingresoEfectivo?: number | string;
  ingresoTarjeta?: number | string;
  ingresoCredito?: number | string;
}>();

const efectivoValue = computed(() => Number(props.efectivo || 0) || 0);
const tarjetaValue = computed(() => Number(props.tarjeta || 0) || 0);
const creditoValue = computed(() => Number(props.credito || 0) || 0);

const ingresoEfectivoValue = computed(
  () => Number(props.ingresoEfectivo || 0) || 0
);
const ingresoTarjetaValue = computed(
  () => Number(props.ingresoTarjeta || 0) || 0
);
const ingresoCreditoValue = computed(
  () => Number(props.ingresoCredito || 0) || 0
);

// total required by providers
const totalProvidersRequired = computed(() => {
  return (
    Number(efectivoValue.value || 0) +
    Number(tarjetaValue.value || 0) +
    Number(creditoValue.value || 0)
  );
});

// total ingresos (available)
const totalIngresos = computed(() => {
  return (
    Number(ingresoEfectivoValue.value || 0) +
    Number(ingresoTarjetaValue.value || 0) +
    Number(ingresoCreditoValue.value || 0)
  );
});

// difference: ingresos - required (positive => sobrante, negative => faltante)
const difference = computed(
  () =>
    Number(totalIngresos.value || 0) - Number(totalProvidersRequired.value || 0)
);

const differenceLabel = computed(() => {
  const d = Number(difference.value || 0) || 0;
  if (d === 0) return '0';
  const sign = d > 0 ? '+' : '-';
  const abs = Math.abs(d);
  return `${sign}${Math.round(abs)}`;
});

const differenceColor = computed(() => {
  const d = Number(difference.value || 0) || 0;
  if (d === 0) return undefined;
  return d > 0 ? 'success' : 'danger';
});

// Per-category differences and labels/colors
const diffEfectivo = computed(
  () =>
    Number(ingresoEfectivoValue.value || 0) - Number(efectivoValue.value || 0)
);
const diffTarjeta = computed(
  () => Number(ingresoTarjetaValue.value || 0) - Number(tarjetaValue.value || 0)
);
const diffCredito = computed(
  () => Number(ingresoCreditoValue.value || 0) - Number(creditoValue.value || 0)
);

const labelEfectivo = computed(() => {
  const d = Number(diffEfectivo.value || 0) || 0;
  if (d === 0) return '0';
  const sign = d > 0 ? '+' : '-';
  return `${sign}${Math.round(Math.abs(d))}`;
});
const labelTarjeta = computed(() => {
  const d = Number(diffTarjeta.value || 0) || 0;
  if (d === 0) return '0';
  const sign = d > 0 ? '+' : '-';
  return `${sign}${Math.round(Math.abs(d))}`;
});
const labelCredito = computed(() => {
  const d = Number(diffCredito.value || 0) || 0;
  if (d === 0) return '0';
  const sign = d > 0 ? '+' : '-';
  return `${sign}${Math.round(Math.abs(d))}`;
});

const colorEfectivo = computed(() => {
  const d = Number(diffEfectivo.value || 0) || 0;
  if (d === 0) return undefined;
  return d > 0 ? 'success' : 'danger';
});
const colorTarjeta = computed(() => {
  const d = Number(diffTarjeta.value || 0) || 0;
  if (d === 0) return undefined;
  return d > 0 ? 'success' : 'danger';
});
const colorCredito = computed(() => {
  const d = Number(diffCredito.value || 0) || 0;
  if (d === 0) return undefined;
  return d > 0 ? 'success' : 'danger';
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
