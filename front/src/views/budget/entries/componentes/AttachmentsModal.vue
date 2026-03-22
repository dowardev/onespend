<template>
  <ion-modal :is-open="isOpen" @did-dismiss="handleDismiss">
    <ion-header class="ion-no-border" mode=ios>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="handleDismiss">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>Adjuntos</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="handleSave">
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

          <ion-text class="upload-text"> Toca o arrastra archivos </ion-text>

          <ion-text class="upload-hint">Imagenes y PDF</ion-text>
        </div>
      </ion-card>

      <ion-list v-if="selectedFiles.length > 0" class="file-list">
        <ion-list-header>
          <ion-label>
            Archivos seleccionados ({{ selectedFiles.length }})
          </ion-label>
        </ion-list-header>

        <ion-card class="shadow1">
          <ion-item
            v-for="(file, index) in selectedFiles"
            :key="index"
            lines="full"
            class="transparent"
          >
            <ion-icon slot="start" :icon="documentOutline"></ion-icon>

            <ion-label>
              <h3>{{ file.name }}</h3>

              <p>{{ formatFileSize(file.size) }}</p>
            </ion-label>

            <ion-button
              slot="end"
              fill="clear"
              color="danger"
              @click="removeFile(index)"
            >
              <ion-icon :icon="trashOutline"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-card>
      </ion-list>

      <div
        v-if="existingAttachments && existingAttachments.length > 0"
        class="existing-files"
      >
        <ion-list>
          <ion-list-header>
            <ion-label>
              Archivos existentes ({{ existingAttachments.length }})
            </ion-label>
          </ion-list-header>
          <ion-item v-for="(file, index) in existingAttachments" :key="index">
            <ion-icon slot="start" :icon="documentOutline"></ion-icon>
            <ion-label>
              <h3>{{ file.name || file.url }}</h3>
            </ion-label>
            <ion-button
              slot="end"
              fill="clear"
              color="danger"
              @click="removeExistingFile(index)"
            >
              <ion-icon :icon="trashOutline"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>
      </div>
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
import {
  closeOutline,
  saveOutline,
  attachOutline,
  documentOutline,
  trashOutline,
} from 'ionicons/icons';
import { ref, watch } from 'vue';

const isDragging = ref(false);

interface Attachment {
  name?: string;
  url: string;
}

interface Props {
  isOpen: boolean;
  existingAttachments?: Attachment[];
}

interface Emits {
  (e: 'dismiss'): void;
  (e: 'save', files: File[], deletedIndexes: number[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const deletedExistingIndexes = ref<number[]>([]);
const localExistingAttachments = ref<Attachment[]>([]);

watch(
  () => props.isOpen,
  newVal => {
    if (!newVal) {
      selectedFiles.value = [];
      deletedExistingIndexes.value = [];
    } else {
      localExistingAttachments.value = props.existingAttachments
        ? [...props.existingAttachments]
        : [];
    }
  }
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
  const newFiles = accepted.filter(f => !isDuplicate(f));
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
  const newFiles = accepted.filter(f => !isDuplicate(f));
  if (newFiles.length) {
    selectedFiles.value = [...selectedFiles.value, ...newFiles];
  }
  if (rejected.length) {
    showRejectedToast(rejected.length);
  }
  target.value = '';
}

function isDuplicate(file: File): boolean {
  return selectedFiles.value.some(
    f => f.name === file.name && f.size === file.size
  );
}

function filterFiles(fileList: FileList | null): {
  accepted: File[];
  rejected: File[];
} {
  if (!fileList) return { accepted: [], rejected: [] };
  const allowed = ['image/', 'application/pdf'];
  const all = Array.from(fileList);
  return {
    accepted: all.filter(f => allowed.some(type => f.type.startsWith(type))),
    rejected: all.filter(f => !allowed.some(type => f.type.startsWith(type))),
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

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1);
}

function removeExistingFile(index: number) {
  deletedExistingIndexes.value.push(index);
  localExistingAttachments.value.splice(index, 1);
}

function handleDismiss() {
  selectedFiles.value = [];
  deletedExistingIndexes.value = [];
  emit('dismiss');
}

function handleSave() {
  emit('save', selectedFiles.value, deletedExistingIndexes.value);
  handleDismiss();
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
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

.upload-area--dragging + .upload-card,
.upload-area--dragging ~ .upload-card,
.upload-card:has(.upload-area--dragging) {
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

.existing-files {
  margin-top: 20px;
}
</style>
