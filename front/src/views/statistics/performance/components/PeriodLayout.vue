<template>
  <section>
    <ion-item class="transparent">
      <ion-button slot="end" fill="clear" @click="onPrev()">
        <ion-icon :icon="chevronBackOutline" />
      </ion-button>

      <ion-button slot="end" fill="clear" @click="onDateClick($event)">{{
        dateLabel
      }}</ion-button>

      <ion-button slot="end" fill="clear" @click="onNext()">
        <ion-icon :icon="chevronForwardOutline" />
      </ion-button>

      <ion-button slot="end" fill="clear" @click="$emit('download-report')">
        <ion-icon :icon="downloadOutline" />
      </ion-button>

      <slot name="header-actions" />
    </ion-item>
  </section>

  <slot name="analysis" />

  <!-- modals -->
  <ion-modal :is-open="localModal" @did-dismiss="onModalDismiss">
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button @click="toggleModal(false)">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>

        <ion-title>Mas detalles</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1" style="height: calc(100% - 20px)">
        <ion-list class="transparent" style="height: 100%">
          <slot name="modal-content" />
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-modal>
  <!-- end modals -->
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonHeader,
  IonIcon,
  IonList,
  IonModal,
  IonRow,
  IonTitle,
  IonToolbar,
  IonCard,
} from '@ionic/vue';
import {
  closeOutline,
  downloadOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';

// main
const props = defineProps<{
  title: string;
  dateLabel?: string;
  onPrev?: (() => void) | null;
  onNext?: (() => void) | null;
  onDateClick?: ((e: Event | null) => void) | null;
  modalOpen?: boolean;
  showReport?: boolean;
}>();
const emit = defineEmits(['update:modal-open', 'report', 'download-report']);
// end main

// vars
const localModal = ref<boolean>(!!props.modalOpen);
const onPrev = props.onPrev ?? (() => {});
const onNext = props.onNext ?? (() => {});
const onDateClick = props.onDateClick ?? (() => {});
// end vars

// watch
watch(
  () => props.modalOpen,
  v => {
    localModal.value = !!v;
  }
);

watch(localModal, v => {
  emit('update:modal-open', v);
});
// end watch

// functions
function toggleModal(val: boolean) {
  localModal.value = !!val;
}

function onModalDismiss() {
  localModal.value = false;
}
</script>

<style scoped></style>
