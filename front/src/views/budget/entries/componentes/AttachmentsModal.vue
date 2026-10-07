<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-modal :is-open="isOpen" @did-dismiss="handleDismiss">
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="handleDismiss">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>Adjuntos</ion-title>

        <ion-buttons slot="end">
          <ion-button :disabled="!hasChanges" @click="handleSave">
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card class="upload-card">
        <div
          class="upload-area"
          :class="{ 'upload-area--dragging': isDragging }"
          @click="triggerFileInput"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >
          <input
            ref="fileInputRef"
            type="file"
            multiple="true"
            accept="image/*,.pdf"
            hidden
            @change="handleFileSelect"
          />

          <ion-icon :icon="attachOutline" class="upload-icon"></ion-icon>

          <ion-text class="upload-text">Toca o arrastra archivos</ion-text>

          <ion-text class="upload-hint">Imagenes y PDF</ion-text>
        </div>
      </ion-card>

      <ion-list v-if="selectedFiles.length > 0" class="file-list">
        <ion-list-header>
          <ion-label> {{ t('attachments.selected') }} ({{ selectedFiles.length }}) </ion-label>
        </ion-list-header>

        <ion-card class="shadow1">
          <ion-item
            v-for="(file, index) in selectedFiles"
            :key="'new-' + index"
            lines="full"
            class="transparent"
          >
            <ion-icon slot="start" :icon="documentOutline"></ion-icon>

            <ion-label>
              <h3>{{ file.name }}</h3>
              <p>{{ formatFileSize(file.size) }}</p>
            </ion-label>

            <ion-button slot="end" fill="clear" color="danger" @click="removeNewFile(index)">
              <ion-icon :icon="trashOutline"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-card>
      </ion-list>

      <ion-list v-if="localExistingAttachments.length > 0" class="file-list">
        <ion-list-header>
          <ion-label> {{ t('attachments.existing') }} ({{ localExistingAttachments.length }}) </ion-label>
        </ion-list-header>

        <ion-card class="shadow1">
          <ion-item
            v-for="attachment in localExistingAttachments"
            :key="'existing-' + attachment.id"
            lines="full"
            class="transparent"
          >
            <ion-icon slot="start" :icon="documentOutline"></ion-icon>

            <ion-label>
              <h3>{{ attachment.name }}</h3>
              <p>{{ formatFileSize(attachment.size) }}</p>
            </ion-label>

            <ion-button
              slot="end"
              fill="clear"
              color="danger"
              @click="markForDeletion(attachment.id)"
            >
              <ion-icon :icon="trashOutline"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-card>
      </ion-list>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonText,
  toastController,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import {
  closeOutline,
  saveOutline,
  attachOutline,
  documentOutline,
  trashOutline,
} from 'ionicons/icons';
import { ref, watch, computed } from 'vue';


const { t } = useLocale();
interface ExistingAttachment {
  id: number;
  name: string;
  size: number;
}

const isDragging = ref(false);

interface Props {
  isOpen: boolean;
  initialFiles?: File[];
  existingAttachments?: ExistingAttachment[];
}

interface Emits {
  (e: 'dismiss'): void;
  (e: 'save', newFiles: File[], deletedIds: number[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const localExistingAttachments = ref<ExistingAttachment[]>([]);
const deletedExistingIds = ref<number[]>([]);

const hasChanges = computed(() => {
  return selectedFiles.value.length > 0 || deletedExistingIds.value.length > 0;
});

watch(
  () => props.isOpen,
  (newVal) => {
    if (!newVal) {
      selectedFiles.value = [];
      localExistingAttachments.value = [];
      deletedExistingIds.value = [];
    } else {
      if (props.initialFiles?.length) {
        selectedFiles.value = [...props.initialFiles];
      }
      if (props.existingAttachments?.length) {
        localExistingAttachments.value = [...props.existingAttachments];
      }
    }
  },
);

function triggerFileInput() {
  fileInputRef.value?.click();
}

function onDragOver() {
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  const { accepted, rejected } = filterFiles(event.dataTransfer?.files ?? null);
  const newFiles = accepted.filter((f) => !isDuplicate(f));
  if (newFiles.length) {
    selectedFiles.value = [...selectedFiles.value, ...newFiles];
  }
  if (rejected.length) {
    showRejectedToast(rejected.length);
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const { accepted, rejected } = filterFiles(target.files);
  const newFiles = accepted.filter((f) => !isDuplicate(f));
  if (newFiles.length) {
    selectedFiles.value = [...selectedFiles.value, ...newFiles];
  }
  if (rejected.length) {
    showRejectedToast(rejected.length);
  }
  target.value = '';
}

function isDuplicate(file: File): boolean {
  return selectedFiles.value.some((f) => f.name === file.name && f.size === file.size);
}

function filterFiles(fileList: FileList | null): {
  accepted: File[];
  rejected: File[];
} {
  if (!fileList) return { accepted: [], rejected: [] };
  const allowed = ['image/', 'application/pdf'];
  const all = Array.from(fileList);
  return {
    accepted: all.filter((f) => allowed.some((type) => f.type.startsWith(type))),
    rejected: all.filter((f) => !allowed.some((type) => f.type.startsWith(type))),
  };
}

async function showRejectedToast(count: number) {
  const toast = await toastController.create({
    message: `${count} archivo(s) no permitidos. Solo imagenes y PDF.`,
    duration: 3000,
    color: 'warning',
  });
  await toast.present();
}

function removeNewFile(index: number) {
  selectedFiles.value.splice(index, 1);
}

function markForDeletion(id: number) {
  deletedExistingIds.value.push(id);
  localExistingAttachments.value = localExistingAttachments.value.filter((a) => a.id !== id);
}

function handleDismiss() {
  selectedFiles.value = [];
  localExistingAttachments.value = [];
  deletedExistingIds.value = [];
  emit('dismiss');
}

function handleSave() {
  emit('save', selectedFiles.value, deletedExistingIds.value);
  handleDismiss();
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return t('budget.entries.componentes.attachmentsmodal.fallback');
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
</script>

<style scoped>
.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area--dragging {
  background: var(--ion-color-primary-tint);
}

.upload-area:active {
  background: var(--ion-color-primary-tint);
}

.upload-card {
  border: 2px dashed var(--ion-color-medium);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-card:active {
  border-color: var(--ion-color-primary);
}

.upload-icon {
  font-size: 48px;
  color: var(--ion-color-primary);
  margin-bottom: 12px;
}

.upload-text {
  font-size: 16px;
  color: var(--ion-color-dark);
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.file-list {
  margin-top: 20px;
}
</style>
