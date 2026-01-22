<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/budget"></ion-back-button>
        </ion-buttons>
        <ion-title>Sincronización</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="sync-container">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Estado de sincronización</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="status-grid">
              <div class="status-item">
                <ion-icon :icon="getStatusIcon()" :class="{ spinning: isSyncing }"></ion-icon>
                <div class="status-info">
                  <span class="status-label">Estado</span>
                  <span class="status-value">{{ getStatusText() }}</span>
                </div>
              </div>

              <div class="status-item">
                <ion-icon :icon="cloudOutline"></ion-icon>
                <div class="status-info">
                  <span class="status-label">Conexión</span>
                  <span class="status-value" :class="{ 'text-success': isOnline, 'text-warning': !isOnline }">
                    {{ isOnline ? 'En línea' : 'Fuera de línea' }}
                  </span>
                </div>
              </div>

              <div class="status-item">
                <ion-icon :icon="timeOutline"></ion-icon>
                <div class="status-info">
                  <span class="status-label">Pendientes</span>
                  <span class="status-value" :class="{ 'text-warning': pendingChanges > 0, 'text-success': pendingChanges === 0 }">
                    {{ pendingChanges }} {{ pendingChanges === 1 ? 'cambio' : 'cambios' }}
                  </span>
                </div>
              </div>

              <div class="status-item">
                <ion-icon :icon="calendarOutline"></ion-icon>
                <div class="status-info">
                  <span class="status-label">Última sincronización</span>
                  <span class="status-value">{{ formatLastSync() }}</span>
                </div>
              </div>
            </div>

            <ion-button
              expand="block"
              :disabled="!isOnline || isSyncing || pendingChanges === 0"
              @click="handleSyncNow"
              class="sync-button"
            >
              <ion-icon slot="start" :icon="syncOutline"></ion-icon>
              {{ isSyncing ? 'Sincronizando...' : 'Sincronizar ahora' }}
            </ion-button>

            <ion-text v-if="syncError" color="danger" class="error-text">
              {{ syncError }}
            </ion-text>
          </ion-card-content>
        </ion-card>

        <ion-card v-if="pendingChanges > 0">
          <ion-card-header>
            <ion-card-title>Cambios pendientes</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item v-for="(count, entity) in pendingByType" :key="entity">
                <ion-label>{{ getEntityLabel(entity) }}</ion-label>
                <ion-badge slot="end" color="medium">{{ count }}</ion-badge>
              </ion-item>
            </ion-list>

            <ion-button
              expand="block"
              fill="outline"
              color="danger"
              @click="handleClearQueue"
              class="clear-button"
            >
              <ion-icon slot="start" :icon="trashOutline"></ion-icon>
              Limpiar cola de sincronización
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Acciones</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-button
              expand="block"
              fill="outline"
              :disabled="!isOnline"
              @click="handleForceSync"
            >
              <ion-icon slot="start" :icon="refreshCircleOutline"></ion-icon>
              Forzar sincronización completa
            </ion-button>

            <ion-button
              expand="block"
              fill="outline"
              @click="handleRefreshStatus"
            >
              <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
              Actualizar estado
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-card v-if="showDebugInfo">
          <ion-card-header>
            <ion-card-title>Debug</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-button expand="block" fill="clear" @click="handleShowDebug">
              <ion-icon slot="start" :icon="codeOutline"></ion-icon>
              Ver información de depuración
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
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
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonText,
  alertController,
  toastController,
} from '@ionic/vue';
import { ref, computed, onMounted } from 'vue';
import {
  cloudOutline,
  cloudOfflineOutline,
  syncOutline,
  checkmarkCircleOutline,
  timeOutline,
  calendarOutline,
  trashOutline,
  refreshOutline,
  refreshCircleOutline,
  codeOutline,
  alertCircleOutline,
} from 'ionicons/icons';
// End Imports

// Controllers
import { SyncController } from '@/controllers/syncController';
// End Controllers

// Components
// End Components

// Vars
const syncController = new SyncController();
const showDebugInfo = ref(false);
const pendingQueue = ref<any[]>([]);
// End Vars

// Functions
async function refreshStatus() {
  pendingQueue.value = syncController.getQueue();
}

function getStatusIcon() {
  if (!isOnline.value) return cloudOfflineOutline;
  if (isSyncing.value) return syncOutline;
  if (pendingChanges.value > 0) return timeOutline;
  return checkmarkCircleOutline;
}

function getStatusText() {
  if (!isOnline.value) return 'Sin conexión';
  if (isSyncing.value) return 'Sincronizando...';
  if (pendingChanges.value > 0) return 'Pendientes';
  return 'Sincronizado';
}

function getEntityLabel(entity: string) {
  const labels: Record<string, string> = {
    account: 'Cuentas',
    budget: 'Presupuestos',
    budget_provider: 'Proveedores del presupuesto',
    budget_provider_product: 'Productos de proveedores',
    entry: 'Entradas',
    supplier: 'Proveedores',
    supplier_product: 'Productos de proveedores',
    template: 'Plantillas',
  };
  return labels[entity] || entity;
}

function formatLastSync() {
  if (lastSyncTime.value === 0) return 'Nunca';
  const diff = Date.now() - lastSyncTime.value;
  if (diff < 60000) return 'Hace menos de 1 minuto';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} minutos`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
  return `Hace ${Math.floor(diff / 86400000)} días`;
}

async function handleSyncNow() {
  const success = await syncController.syncNow();
  if (success) {
    await refreshStatus();
    const toast = await toastController.create({
      message: 'Sincronización completada',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  }
}

async function handleClearQueue() {
  const alert = await alertController.create({
    header: 'Limpiar cola',
    message: '¿Estás seguro de que quieres eliminar todos los cambios pendientes? Esta acción no se puede deshacer.',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
      },
      {
        text: 'Eliminar',
        role: 'confirm',
        handler: async () => {
          syncController.clearQueue();
          await refreshStatus();
          const toast = await toastController.create({
            message: 'Cola de sincronización limpiada',
            duration: 2000,
            color: 'success',
          });
          await toast.present();
        },
      },
    ],
  });
  await alert.present();
}

async function handleForceSync() {
  const alert = await alertController.create({
    header: 'Sincronización completa',
    message: 'Esto forzará una sincronización completa con el servidor. ¿Continuar?',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
      },
      {
        text: 'Continuar',
        role: 'confirm',
        handler: async () => {
          try {
            await syncController.fullSyncAndSave();
            await refreshStatus();
            const toast = await toastController.create({
              message: 'Sincronización completa exitosa',
              duration: 2000,
              color: 'success',
            });
            await toast.present();
          } catch (error) {
            const toast = await toastController.create({
              message: 'Error en sincronización completa',
              duration: 3000,
              color: 'danger',
            });
            await toast.present();
          }
        },
      },
    ],
  });
  await alert.present();
}

async function handleRefreshStatus() {
  await refreshStatus();
  await syncController.pullFromServer();
  const toast = await toastController.create({
    message: 'Estado actualizado',
    duration: 1000,
    color: 'success',
  });
  await toast.present();
}

function handleShowDebug() {
  showDebugInfo.value = !showDebugInfo.value;
}
// End Functions

// Life cycle
onMounted(async () => {
  await refreshStatus();
});
// End Life cycle

// Computed
const isOnline = computed(() => syncController.getIsOnline());
const isSyncing = computed(() => syncController.getIsSyncing());
const pendingChanges = computed(() => syncController.getPendingChanges());
const lastSyncTime = computed(() => syncController.getLastSyncTime());
const syncError = computed(() => syncController.getSyncError());

const pendingByType = computed(() => {
  const counts: Record<string, number> = {};
  for (const item of pendingQueue.value) {
    counts[item.entityType] = (counts[item.entityType] || 0) + 1;
  }
  return counts;
});
// End Computed

// Watch
// End Watch</script>

<style scoped>
.sync-container {
  padding: 16px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--ion-color-light);
  border-radius: 8px;
}

.status-item ion-icon {
  font-size: 24px;
  color: var(--ion-color-primary);
}

.status-item ion-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-label {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
}

.status-value {
  font-size: 0.9rem;
  font-weight: 600;
}

.text-success {
  color: var(--ion-color-success);
}

.text-warning {
  color: var(--ion-color-warning);
}

.sync-button {
  margin-top: 16px;
  margin-bottom: 12px;
}

.clear-button {
  margin-top: 16px;
}

.error-text {
  display: block;
  margin-top: 8px;
  padding: 8px;
  background: var(--ion-color-danger-tint);
  border-radius: 4px;
}

ion-card {
  margin-bottom: 16px;
}
</style>
