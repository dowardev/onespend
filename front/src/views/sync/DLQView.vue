<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/sync"></ion-back-button>
        </ion-buttons>
        <ion-title>Cola de elementos fallidos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="dlq-container">
        <ion-card v-if="dlqItems.length > 0">
          <ion-card-header>
            <ion-card-subtitle>
              {{ dlqItems.length }} {{ dlqItems.length === 1 ? 'elemento' : 'elementos' }} fallidos
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item v-for="item in dlqItems" :key="item.id" class="dlq-item">
                <div class="dlq-item-content">
                  <div class="dlq-item-header">
                    <ion-badge :color="getEntityColor(item.entityType)" class="entity-badge">
                      {{ item.entityType }}
                    </ion-badge>
                    <ion-badge :color="getOperationColor(item.operation)" class="operation-badge">
                      {{ item.operation }}
                    </ion-badge>
                  </div>
                  <div class="dlq-item-details">
                    <span class="entity-id">ID: {{ item.entityId }}</span>
                    <span class="error-count">Intentos: {{ item.errorCount }}</span>
                  </div>
                  <div class="dlq-item-error">
                    <ion-icon :icon="alertCircleOutline" class="error-icon"></ion-icon>
                    <span class="error-text">{{ item.lastError }}</span>
                  </div>
                  <div class="dlq-item-time">
                    <ion-icon :icon="timeOutline"></ion-icon>
                    <span>Fallido: {{ formatFailedAt(item.failedAt) }}</span>
                  </div>
                </div>
                <ion-button
                  slot="end"
                  fill="clear"
                  color="primary"
                  size="small"
                  :disabled="isRetrying"
                  @click="handleRetry({ item })"
                >
                  <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
                  Reintentar
                </ion-button>
              </ion-item>
            </ion-list>

            <div class="dlq-actions">
              <ion-button
                expand="block"
                fill="outline"
                color="primary"
                :disabled="isRetrying || dlqItems.length === 0"
                @click="handleRetryAll"
              >
                <ion-icon slot="start" :icon="refreshCircleOutline"></ion-icon>
                Reintentar todos
              </ion-button>

              <ion-button
                expand="block"
                fill="outline"
                color="danger"
                :disabled="isRetrying || dlqItems.length === 0"
                @click="handleClearAll"
              >
                <ion-icon slot="start" :icon="trashOutline"></ion-icon>
                Eliminar todos
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <div v-else class="empty-state">
          <ion-icon :icon="checkmarkCircleOutline" class="empty-icon"></ion-icon>
          <h2>No hay elementos fallidos</h2>
          <p>La cola de elementos fallidos está vacía.</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonBadge,
  IonButton,
  IonIcon,
  alertController,
  toastController,
} from '@ionic/vue';
import { ref, onMounted } from 'vue';
import {
  alertCircleOutline,
  timeOutline,
  checkmarkCircleOutline,
  refreshOutline,
  refreshCircleOutline,
  trashOutline,
} from 'ionicons/icons';

import { SyncController } from '@/controllers/syncController';
import type { DeadLetterItem } from '@/db/types';

const dlqItems = ref<DeadLetterItem[]>([]);
const isRetrying = ref(false);

async function loadDlqItems() {
  dlqItems.value = await SyncController.getDlqItems();
}

async function handleRetry(params: { item: DeadLetterItem }) {
  const { item } = params;
  isRetrying.value = true;
  try {
    await SyncController.retryDlqItem({ item });
    await loadDlqItems();
    SyncController.syncNow();
    const toast = await toastController.create({
      message: 'Elemento reintentado',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  } catch (error) {
    const toast = await toastController.create({
      message: 'Error al reintentar',
      duration: 2000,
      color: 'danger',
    });
    await toast.present();
  } finally {
    isRetrying.value = false;
  }
}

async function handleRetryAll() {
  const alert = await alertController.create({
    header: 'Reintentar todos',
    message: `¿Reintentar ${dlqItems.value.length} elementos?`,
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
      },
      {
        text: 'Reintentar',
        role: 'confirm',
        handler: async () => {
          isRetrying.value = true;
          try {
            await SyncController.retryDlqAll({ items: dlqItems.value });
            await loadDlqItems();
            SyncController.syncNow();
            const toast = await toastController.create({
              message: 'Elementos reintentados',
              duration: 2000,
              color: 'success',
            });
            await toast.present();
          } catch (error) {
            const toast = await toastController.create({
              message: 'Error al reintentar',
              duration: 2000,
              color: 'danger',
            });
            await toast.present();
          } finally {
            isRetrying.value = false;
          }
        },
      },
    ],
  });
  await alert.present();
}

async function handleClearAll() {
  const alert = await alertController.create({
    header: 'Eliminar todos',
    message: '¿Eliminar todos los elementos fallidos? Esta acción no se puede deshacer.',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
      },
      {
        text: 'Eliminar',
        role: 'confirm',
        handler: async () => {
          isRetrying.value = true;
          try {
            await SyncController.clearDlq();
            await loadDlqItems();
            const toast = await toastController.create({
              message: 'Elementos eliminados',
              duration: 2000,
              color: 'success',
            });
            await toast.present();
          } catch (error) {
            const toast = await toastController.create({
              message: 'Error al eliminar',
              duration: 2000,
              color: 'danger',
            });
            await toast.present();
          } finally {
            isRetrying.value = false;
          }
        },
      },
    ],
  });
  await alert.present();
}

function getEntityColor(entityType: string): string {
  const colors: Record<string, string> = {
    account: 'primary',
    budget_provider: 'secondary',
    budget_provider_product: 'tertiary',
    budget_entry: 'success',
    recurring_record: 'warning',
    recurring_record_product: 'medium',
    supplier: 'danger',
    supplier_product: 'primary',
  };
  return colors[entityType] || 'medium';
}

function getOperationColor(operation: string): string {
  const colors: Record<string, string> = {
    create: 'success',
    update: 'warning',
    delete: 'danger',
  };
  return colors[operation] || 'medium';
}

function formatFailedAt(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

onMounted(async () => {
  await loadDlqItems();
});
</script>

<style scoped>
.dlq-container {
  padding: 16px;
}

.dlq-item {
  --padding-start: 8px;
  --padding-end: 8px;
  --inner-padding-end: 8px;
}

.dlq-item-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  margin-right: 8px;
}

.dlq-item-header {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.entity-badge,
.operation-badge {
  text-transform: capitalize;
}

.dlq-item-details {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}

.entity-id {
  word-break: break-all;
}

.dlq-item-error {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--ion-color-danger);
  margin-top: 4px;
}

.error-icon {
  flex-shrink: 0;
  font-size: 14px;
  margin-top: 2px;
}

.error-text {
  word-break: break-word;
}

.dlq-item-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--ion-color-medium);
}

.dlq-item-time ion-icon {
  font-size: 12px;
}

.dlq-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 64px;
  color: var(--ion-color-success);
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 1.25rem;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 0.9rem;
}
</style>