<template>
  <ion-modal
    :is-open="isOpen"
    :keep-contents-mounted="true"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="$emit('dismiss')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Aplicar template</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1">
        <ion-list class="transparent">
          <template v-if="templatesList.length">
            <ion-item
              v-for="tmpl in templatesList"
              :key="tmpl.id"
              lines="full"
              button
              class="transparent"
              @click.stop="$emit('select-template', tmpl)"
            >
              <ion-label>
                <h2>{{ tmpl.name }}</h2>
                <p>{{ tmpl.description }}</p>
              </ion-label>
            </ion-item>
          </template>

          <template v-else>
            <ion-item>
              <ion-label>No hay templates</ion-label>
            </ion-item>
          </template>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonCard,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';

defineProps<{
  isOpen: boolean;
  templatesList: Array<{ id: string | number; name: string; description: string }>;
}>();

defineEmits(['dismiss', 'select-template']);
</script>
