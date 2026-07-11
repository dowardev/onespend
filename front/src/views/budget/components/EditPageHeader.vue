<template>
  <ion-header class="ion-no-border" mode="ios">
    <ion-toolbar>
      <ion-buttons>
        <ion-button @click="$emit('back')">
          <ion-icon :icon="arrowBackOutline" />
        </ion-button>
      </ion-buttons>

      <ion-title>{{ title }}</ion-title>

      <ion-buttons slot="end">
        <ion-button data-cy="save-entry-btn" :disabled="isSaveDisabled" @click="$emit('save')">
          <ion-icon :icon="saveOutline" />
        </ion-button>
        <ion-button
          v-if="showOptionsButton"
          fill="clear"
          :disabled="isOptionsDisabled"
          @click="$emit('options', $event)"
        >
          <ion-icon :icon="ellipsisVerticalOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<script lang="ts" setup>
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/vue';
import { arrowBackOutline, saveOutline, ellipsisVerticalOutline } from 'ionicons/icons';

defineProps<{
  title: string;
  isSaveDisabled: boolean;
  showOptionsButton: boolean;
  isOptionsDisabled?: boolean;
}>();

defineEmits<{
  back: [];
  save: [];
  options: [e: Event];
}>();
</script>
