<template>
  <section>
    <ion-item class="transparent">
      <ion-button slot="end" fill="clear" @click="onPrev()">
        <ion-icon :icon="chevronBackOutline" />
      </ion-button>

      <ion-button slot="end" fill="clear" @click="onDateClick($event)">{{ dateLabel }}</ion-button>

      <ion-button slot="end" fill="clear" @click="onNext()">
        <ion-icon :icon="chevronForwardOutline" />
      </ion-button>

      <slot name="header-actions" />
    </ion-item>
  </section>

  <slot name="analysis" />

  <!-- modal removed -->
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { IonButton, IonCol, IonIcon, IonList, IonRow } from '@ionic/vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

// main
const props = defineProps<{
  title: string;
  dateLabel?: string;
  onPrev?: (() => void) | null;
  onNext?: (() => void) | null;
  onDateClick?: ((e: Event | null) => void) | null;
  showReport?: boolean;
}>();
const emit = defineEmits(['report', 'download-report']);
// end main

// vars
const onPrev = props.onPrev ?? (() => {});
const onNext = props.onNext ?? (() => {});
const onDateClick = props.onDateClick ?? (() => {});
// end vars

// watch
// modal-related watchers removed
// end watch

// functions
// modal-related functions removed
</script>

<style scoped></style>
