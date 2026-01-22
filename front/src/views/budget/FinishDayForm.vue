<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="12" size-md="8" size-lg="6" size-xl="4">
        <ion-item class="transparent warning-item" lines="none">
          <ion-icon :icon="warningOutline" color="warning" slot="start"></ion-icon>
          <ion-label class="warning-label">
            Una vez guardado el día, los datos no podrán modificarse
          </ion-label>
        </ion-item>

        <ion-item class="transparent" lines="full">
          <ion-input
            v-model.number="finishDay.totalSalesEfectivo"
            label="Ventas efectivo"
            label-placement="floating"
            type="number"
          ></ion-input>
        </ion-item>

        <ion-item class="transparent" lines="full">
          <ion-input
            v-model.number="finishDay.totalSalesTarjeta"
            label="Ventas tarjeta"
            label-placement="floating"
            type="number"
          ></ion-input>
        </ion-item>

        <ion-item class="transparent" lines="full">
          <ion-input
            v-model.number="finishDay.totalSalesCredito"
            label="Ventas credito"
            label-placement="floating"
            type="number"
          ></ion-input>
        </ion-item>

        <ion-item class="transparent" lines="full">
          <ion-select
            slot="start"
            v-model="finishDay.type"
            label-placement="floating"
            label="Tipo de dato"
          >
            <ion-select-option value="%">%</ion-select-option>
            <ion-select-option value="$">$</ion-select-option>
          </ion-select>

          <ion-input
            v-model.number="finishDay.margin"
            label="Margen de ventas"
            label-placement="floating"
            type="number"
          ></ion-input>
        </ion-item>

        <ion-button class="no-shadow" expand="block" @click="handleSave"
          >Guardar</ion-button
        >
      </ion-col>
    </ion-row>

    <!-- toasts  -->
    <ion-toast
      :is-open="showToast"
      message="Datos guardados correctamente"
      duration="3000"
      color="success"
      @did-dismiss="showToast = false"
    ></ion-toast>
    <!-- end toasts  -->
  </ion-grid>
</template>

<script setup lang="ts">
// Imports
import {
  IonGrid,
  IonRow,
  IonCol,
  IonLabel,
  IonButton,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonIcon,
} from '@ionic/vue';
import { ref, toRef } from 'vue';
import { warningOutline } from 'ionicons/icons';

// Components

// Vars
const props = defineProps<{ finishDay: any }>();
const emit = defineEmits(['save']);

const finishDay = toRef(props, 'finishDay');
const showToast = ref(false);

// Functions
function handleSave() {
  console.log('[FinishDayForm] handleSave llamado - emitiendo save');
  emit('save');
  console.log('[FinishDayForm] Toast mostrándose');
  showToast.value = true;
}

// Life cycle

// Computed

// Watch
</script>

<style scoped>
.warning-item {
  --background: rgba(255, 193, 7, 0.1);
  border-radius: 8px;
  margin-bottom: 16px;
}

.warning-label {
  color: var(--ion-color-warning);
  font-weight: 500;
}
</style>
