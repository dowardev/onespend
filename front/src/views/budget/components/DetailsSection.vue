<template>
  <ion-list :class="listClass">
    <ion-list-header>
      <ion-label>Detalles</ion-label>
    </ion-list-header>
    <ion-card class="shadow1">
      <ion-item class="transparent" lines="full" button @click="$emit('openAttachments')">
        <ion-label>Adjuntos</ion-label>
      </ion-item>
      <ion-item class="transparent" lines="none">
        <ion-textarea
          :model-value="notes"
          label="Notas"
          label-placement="stacked"
          placeholder="Agregar notas..."
          :auto-grow="true"
          :rows="3"
          @update:model-value="$emit('update:notes', $event)"
        />
      </ion-item>
    </ion-card>
  </ion-list>

  <AttachmentsModal
    :is-open="showAttachmentsModal"
    :initial-files="pendingAttachments"
    :existing-attachments="existingAttachments"
    @dismiss="$emit('dismissAttachments')"
    @save="onAttachmentsSave"
  />
</template>

<script lang="ts" setup>
import {
  IonList,
  IonListHeader,
  IonLabel,
  IonCard,
  IonItem,
  IonTextarea,
} from '@ionic/vue';
import AttachmentsModal from '@/views/budget/entries/componentes/AttachmentsModal.vue';
import type { AttachmentData } from '@/services/attachmentService';

defineProps<{
  notes: string;
  listClass?: string;
  showAttachmentsModal: boolean;
  pendingAttachments: File[];
  existingAttachments: AttachmentData[];
}>();

const emit = defineEmits<{
  'update:notes': [value: string];
  openAttachments: [];
  dismissAttachments: [];
  saveAttachments: [params: { newFiles: File[]; deletedIds: number[] }];
}>();

function onAttachmentsSave(newFiles: File[], deletedIds: number[]) {
  emit('saveAttachments', { newFiles, deletedIds });
}
</script>
