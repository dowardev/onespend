<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="12" size-md="8" size-lg="6" size-xl="4">
        <ion-item class="transparent" lines="none">
          <ion-label
            >Completa los siguientes datos requeridos para los datos
            estadisticos</ion-label
          >
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
      message="Datos actualizados"
      duration="2000"
      color="dark"
      @did-dismiss="showToast = false"
    ></ion-toast>
    <!-- end toasts  -->
  </ion-grid>
</template>

<script setup lang="ts">
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
} from '@ionic/vue';
import { ref } from 'vue';

const props = defineProps<{ finishDay: any }>();
const emit = defineEmits(['save']);

const finishDay = props.finishDay;
const showToast = ref(false);

function handleSave() {
  emit('save');
  showToast.value = true;
}
</script>
