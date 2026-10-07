<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-list :class="listClass">
    <ion-list-header>
      <ion-label>{{ t('budget.components.detailssection.label1') }}</ion-label>
    </ion-list-header>
    <ion-card class="shadow1">
      <ion-item class="transparent" lines="full" button @click="$emit('openAttachments')">
        <ion-label>{{ t('budget.components.detailssection.label2') }}</ion-label>
      </ion-item>
      <ion-item class="transparent" lines="none">
        <ion-textarea
          :model-value="notes"
          :label="t('budget.components.detailssection.text')"
          label-placement="stacked"
          :placeholder="t('budget.components.detailssection.placeholder')"
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
import { useLocale } from '@/composables/useLocale';
import AttachmentsModal from '@/views/budget/entries/componentes/AttachmentsModal.vue';
import type { AttachmentData } from '@/services/attachmentService';


const { t } = useLocale();
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
