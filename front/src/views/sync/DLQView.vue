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
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="10" size-lg="8" size-xl="6">
            <ion-list v-if="dlqItems.length > 0" class="transparent">
              <ion-list-header>
                <ion-label>
                  {{ dlqItems.length }}
                  {{ dlqItems.length === 1 ? t('sync.view.dlq.itemFailed') : t('sync.view.dlq.itemsFailed') }}
                </ion-label>
              </ion-list-header>

              <ion-card class="shadow1">
                <ion-item v-for="item in dlqItems" :key="item.id ?? item.entityId" lines="inset">
                  <ion-icon slot="start" :icon="alertCircleOutline" color="danger"></ion-icon>

                  <ion-label class="dlq-label" @click="toggleDetail({ key: item.id ?? item.entityId })">
                    <h3>
                      {{ getEntityLabel({ entity: item.entityType }) }} ·
                      {{ getOperationLabel({ operation: item.operation }) }}
                    </h3>

                    <p>
                      {{ item.errorCount }} {{ item.errorCount === 1 ? 'intento' : 'intentos' }} ·
                      {{ formatRelative({ timestamp: item.failedAt }) }}
                    </p>

                    <p class="error-preview" :class="{ expanded: expandedKey === (item.id ?? item.entityId) }">
                      {{ item.lastError }}
                    </p>

                    <p v-if="expandedKey === (item.id ?? item.entityId)" class="entity-id">
                      ID: {{ item.entityId }}
                    </p>
                  </ion-label>

                  <ion-button
                    slot="end"
                    fill="clear"
                    color="medium"
                    :aria-label="
                      (expandedKey === (item.id ?? item.entityId) ? 'Ocultar detalle de ' : 'Ver detalle de ') +
                      getEntityLabel({ entity: item.entityType })
                    "
                    @click="toggleDetail({ key: item.id ?? item.entityId })"
                  >
                    <ion-icon
                      slot="icon-only"
                      :icon="expandedKey === (item.id ?? item.entityId) ? chevronUpOutline : chevronDownOutline"
                    ></ion-icon>
                  </ion-button>

                  <ion-button
                    slot="end"
                    fill="clear"
                    color="primary"
                    :aria-label="'Reintentar ' + getEntityLabel({ entity: item.entityType })"
                    :disabled="isRetrying"
                    @click="handleRetry({ item })"
                  >
                    <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
                  </ion-button>
                </ion-item>
              </ion-card>
            </ion-list>

            <ion-list v-if="dlqItems.length > 0" class="transparent">
              <ion-item button :disabled="isRetrying" @click="handleRetryAll">
                <ion-icon slot="start" :icon="refreshCircleOutline" color="primary"></ion-icon>

                <ion-label>
                  <h3>{{ t('sync.dlqview.title1') }}</h3>
                </ion-label>
              </ion-item>

              <ion-item button :disabled="isRetrying" @click="handleClearAll">
                <ion-icon slot="start" :icon="trashOutline" color="danger"></ion-icon>

                <ion-label>
                  <h3>{{ t('sync.dlqview.title2') }}</h3>
                </ion-label>
              </ion-item>
            </ion-list>

            <div v-else class="empty-state">
              <ion-icon :icon="checkmarkCircleOutline" class="empty-icon"></ion-icon>

              <h2>{{ t('sync.dlqview.title3') }}</h2>

              <p>La cola de elementos fallidos está vacía.</p>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
// 1. Imports (ionic/vue/ionicons)
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonCard,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  alertController,
  toastController,
} from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';
import { ref, onMounted } from 'vue';
import {
  alertCircleOutline,
  chevronDownOutline,
  chevronUpOutline,
  checkmarkCircleOutline,
  refreshOutline,
  refreshCircleOutline,
  trashOutline,
} from 'ionicons/icons';

// 2. Controllers / Composables
import { SyncController } from '@/controllers/syncController';

// 3. Components
// (sin componentes hijos)

// 4. Interface and types imports
import type { DeadLetterItem } from '@/db/types';


const { t } = useLocale();
// 5. Main (props, emits, etc.)
// (sin props ni emits)

// 6. Vars and const
const dlqItems = ref<DeadLetterItem[]>([]);
const isRetrying = ref(false);
const expandedKey = ref<string | number | null>(null);

// 7. Watch
// (sin watchers)

// 8. Computed
// (sin computed)

// 9. OnMounted
onMounted(async () => {
  await loadDlqItems();
});

// 10. Functions (named parameters pattern)
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
      message: t('sync.dlqview.message1'),
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  } catch (error) {
    console.error('[DLQView] handleRetry failed:', error);
    const msg = error instanceof Error ? error.message : 'Error al reintentar';
    const toast = await toastController.create({
      message: `Error al reintentar: ${msg}`,
      duration: 4000,
      color: 'danger',
    });
    await toast.present();
  } finally {
    isRetrying.value = false;
  }
}

async function handleRetryAll() {
  const alert = await alertController.create({
    header: t('sync.dlqview.header1'),
    message: `¿Reintentar ${dlqItems.value.length} elementos?`,
    buttons: [
      {
        text: t('sync.dlqview.text1'),
        role: 'cancel',
      },
      {
        text: t('sync.dlqview.text2'),
        role: 'confirm',
        handler: async () => {
          isRetrying.value = true;
          try {
            await SyncController.retryDlqAll({ items: dlqItems.value });
            await loadDlqItems();
            SyncController.syncNow();
            const toast = await toastController.create({
              message: t('sync.dlqview.message2'),
              duration: 2000,
              color: 'success',
            });
            await toast.present();
          } catch (error) {
            console.error('[DLQView] handleRetryAll failed:', error);
            const msg = error instanceof Error ? error.message : 'Error al reintentar';
            const toast = await toastController.create({
              message: `Error al reintentar: ${msg}`,
              duration: 4000,
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
    header: t('sync.dlqview.header2'),
    message: t('sync.dlqview.removeAllMessage'),
    buttons: [
      {
        text: t('sync.dlqview.text1'),
        role: 'cancel',
      },
      {
        text: t('sync.dlqview.text4'),
        role: 'confirm',
        handler: async () => {
          isRetrying.value = true;
          try {
            await SyncController.clearDlq();
            await loadDlqItems();
            const toast = await toastController.create({
              message: t('sync.dlqview.message3'),
              duration: 2000,
              color: 'success',
            });
            await toast.present();
          } catch (error) {
            const toast = await toastController.create({
              message: t('sync.dlqview.message4'),
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

function toggleDetail(params: { key: string | number }) {
  const { key } = params;
  expandedKey.value = expandedKey.value === key ? null : key;
}

function getEntityLabel(params: { entity: string }) {
  const { entity } = params;
  const labels: Record<string, string> = {
    account: 'Cuentas',
    budget: 'Presupuestos',
    budget_entry: 'Entradas de gasto',
    budget_entry_group: 'Grupos de entradas',
    budget_provider: 'Proveedores del presupuesto',
    budget_provider_product: 'Productos de proveedores',
    entry: 'Entradas',
    income: 'Ingresos',
    recurring_record: 'Registros recurrentes',
    recurring_record_product: 'Productos recurrentes',
    supplier: 'Proveedores',
    supplier_product: 'Productos de proveedores',
    template: 'Plantillas',
  };
  return labels[entity] || entity;
}

function getOperationLabel(params: { operation: string }) {
  const { operation } = params;
  const labels: Record<string, string> = {
    create: 'Crear',
    update: 'Actualizar',
    delete: 'Eliminar',
  };
  return labels[operation] || operation;
}

function formatRelative(params: { timestamp: number }) {
  const { timestamp } = params;
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'hace unos segundos';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)} h`;
  return `hace ${Math.floor(diff / 86400000)} días`;
}
</script>

<style scoped>
.dlq-label {
  cursor: pointer;
}

.error-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  font-size: 0.8rem;
  color: var(--ion-color-danger);
}

.error-preview.expanded {
  display: block;
}

.entity-id {
  font-size: 0.75rem;
  word-break: break-all;
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
