<template>
  <div class="ion-padding-start ion-padding-end period-snapshots">
    <ion-item class="panel border-rounded" lines="none">
      <ion-label>
        <h3>{{ currentLabel }}</h3>
        <p>Total ventas: {{ formatCurrency(snapshots.current.totalSales) }}</p>
        <p>Utilidad neta: {{ formatCurrency(snapshots.current.netProfit) }}</p>
      </ion-label>
    </ion-item>

    <ion-item class="panel border-rounded" lines="none">
      <ion-label>
        <h3>{{ previousLabel }}</h3>
        <p>Total ventas: {{ formatCurrency(snapshots.previous.totalSales) }}</p>
        <p>Utilidad neta: {{ formatCurrency(snapshots.previous.netProfit) }}</p>
      </ion-label>
    </ion-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonItem, IonLabel } from '@ionic/vue';

// main
const props = defineProps<{
  snapshots: {
    current: { totalSales: number; netProfit: number };
    previous: { totalSales: number; netProfit: number };
  };
  currentLabel?: string;
  previousLabel?: string;
}>();
// end main

// computed
const currentLabel = computed(() => props.currentLabel ?? 'Actual');
const previousLabel = computed(() => props.previousLabel ?? 'Anterior');
// end computed

// functions
function formatCurrency(val: any) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(val ?? 0));
}
</script>

<style scoped>
.period-snapshots {
  display: flex;
  gap: 8px; /* espacio entre paneles */
}

.panel {
  flex: 1; /* que ambos paneles crezcan igualmente */
  min-width: 0; /* evita overflow en children flexibles */
}

.border-rounded {
  border-radius: 6px;
}

/* Responsive: en pantallas pequeñas apilar verticalmente */
@media (max-width: 600px) {
  .period-snapshots {
    flex-direction: column;
  }
}
</style>
