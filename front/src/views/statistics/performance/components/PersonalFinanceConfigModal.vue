<template>
  <ion-header class="ion-no-border">
    <ion-toolbar>
      <ion-title>Configuración</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="closeModal">
          <ion-icon :icon="closeOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <ion-list>
      <ion-list-header>
        <ion-label>Semana</ion-label>
      </ion-list-header>

      <ion-item>
        <ion-select
          v-model="selectedWeekStart"
          label="Día de inicio"
          @ionChange="onWeekStartChange"
        >
          <ion-select-option value="0">Domingo</ion-select-option>
          <ion-select-option value="1">Lunes</ion-select-option>
          <ion-select-option value="6">Sábado</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonListHeader,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonLabel,
  modalController,
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { ref, onMounted } from 'vue';
import systemController from '@/controllers/systemConfigController';

const emit = defineEmits(['close', 'save']);

const selectedWeekStart = ref('0');

onMounted(async () => {
  const weekStart = await systemController.getWeekStartDay();
  selectedWeekStart.value = String(weekStart);
});

function closeModal() {
  emit('close');
}

async function onWeekStartChange() {
  await systemController.setWeekStartDay({ value: Number(selectedWeekStart.value) });
}
</script>
