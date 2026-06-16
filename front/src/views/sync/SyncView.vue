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
                  <span
                    class="status-value"
                    :class="{ 'text-success': isOnline, 'text-warning': !isOnline }"
                  >
                    {{ isOnline ? 'En línea' : 'Fuera de línea' }}
                  </span>
                </div>
              </div>

              <div class="status-item">
                <ion-icon :icon="timeOutline"></ion-icon>
                <div class="status-info">
                  <span class="status-label">Pendientes</span>
                  <span
                    class="status-value"
                    :class="{
                      'text-warning': pendingChanges > 0,
                      'text-success': pendingChanges === 0,
                    }"
                  >
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
              class="sync-button"
              @click="handleSyncNow"
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
              class="clear-button"
              @click="handleClearQueue"
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

            <ion-button expand="block" fill="outline" @click="handleRefreshStatus">
              <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
              Actualizar estado
            </ion-button>
          </ion-card-content>
        </ion-card>

      <ion-card v-if="dlqCount > 0">
        <ion-card-header>
          <ion-card-title>Elementos fallidos</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="dlq-info">
            <ion-icon :icon="warningOutline" color="danger"></ion-icon>
            <span>{{ dlqCount }} {{ dlqCount === 1 ? 'elemento' : 'elementos' }} en cola de elementos fallidos</span>
          </div>
          <ion-button expand="block" fill="outline" color="danger" @click="handleShowDLQ">
            <ion-icon slot="start" :icon="alertCircleOutline"></ion-icon>
            Gestionar cola de elementos fallidos
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="activeConflictDiffs.length > 0">
        <ion-card-header>
          <ion-card-title>Conflictos activos <ion-badge color="warning">{{ activeConflictDiffs.length }}</ion-badge></ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item v-for="(entry, idx) in activeConflictDiffs" :key="entry.sync_id + idx">
              <ion-label>
                <h3>{{ getEntityLabel(entry.entityType) }}</h3>
                <p v-if="entry.diffs.length > 0" class="conflict-fields">
                  <span
                    v-for="diff in entry.diffs.slice(0, 5)"
                    :key="diff.field"
                    class="conflict-field-tag"
                    :class="{
                      'tag-server': diff.changed_in === 'server',
                      'tag-client': diff.changed_in === 'client',
                      'tag-both': diff.changed_in === 'both',
                    }"
                  >
                    {{ diff.field }}
                  </span>
                  <span v-if="entry.diffs.length > 5" class="conflict-more">+{{ entry.diffs.length - 5 }} más</span>
                </p>
              </ion-label>
              <ion-badge
                slot="end"
                :color="entry.diffs.some(d => d.changed_in === 'both') ? 'danger' : 'warning'"
                @click="showConflictDiff(entry)"
              >
                {{ entry.diffs.length }} campo{{ entry.diffs.length !== 1 ? 's' : '' }}
              </ion-badge>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="resolvedConflicts.length > 0">
        <ion-card-header>
          <ion-card-title>Conflictos resueltos <ion-badge color="medium">{{ resolvedConflicts.length }}</ion-badge></ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item v-for="conflict in resolvedConflicts" :key="conflict.entity_id + conflict.entity_type">
              <ion-label>
                <h3>{{ getEntityLabel(conflict.entity_type) }}</h3>
                <p>ID: {{ conflict.entity_id }}</p>
                <p>Resolución: {{ conflict.conflict_data?.resolution ?? 'servidor' }}</p>
              </ion-label>
              <ion-note slot="end">{{ formatResolvedAt(conflict) }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <ion-modal :is-open="showConflictModal" @did-dismiss="showConflictModal = false">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="showConflictModal = false">Cerrar</ion-button>
            </ion-buttons>
            <ion-title>Comparar cambios</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div v-if="selectedConflict" class="conflict-detail">
            <div class="conflict-entity-header">
              <h2>{{ getEntityLabel(selectedConflict.entityType) }}</h2>
              <p class="conflict-sync-id">ID: {{ selectedConflict.sync_id }}</p>
            </div>
            <ion-list>
              <ion-item v-for="diff in selectedConflict.diffs" :key="diff.field" class="diff-item">
                <ion-label>
                  <div class="diff-field-name">{{ diff.field }}</div>
                  <div class="diff-values">
                    <div class="diff-value diff-server">
                      <ion-chip color="medium" size="small">Servidor</ion-chip>
                      <span class="diff-value-text">{{ formatDiffValue(diff.server_value) }}</span>
                    </div>
                    <div class="diff-value diff-client">
                      <ion-chip color="primary" size="small">Cliente</ion-chip>
                      <span class="diff-value-text">{{ formatDiffValue(diff.client_value) }}</span>
                    </div>
                  </div>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
        </ion-content>
      </ion-modal>

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
  IonNote,
  IonModal,
  IonChip,
  alertController,
  toastController,
} from '@ionic/vue';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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
  warningOutline,
} from 'ionicons/icons';
// End Imports

// Controllers
import { SyncController } from '@/controllers/syncController';
// End Controllers

// Components
// End Components

// Vars
import type { SyncItem } from '@/services/syncService';

interface ResolvedConflict {
  entity_id: string;
  entity_type: string;
  updated_at?: string;
  conflict_data?: {
    resolution?: string;
    resolved_at?: number;
  };
}

import type { FieldDiff } from '@/utils/conflictDiff';

interface ActiveConflict {
  entityType: string;
  sync_id: string;
  diffs: FieldDiff[];
  client_data: Record<string, unknown>;
  server_data?: Record<string, unknown>;
}

const syncController = SyncController;
const showDebugInfo = ref(false);
const pendingQueue = ref<SyncItem[]>([]);
const dlqCount = ref(0);
const resolvedConflicts = ref<ResolvedConflict[]>([]);
const activeConflictDiffs = ref<ActiveConflict[]>([]);
const showConflictModal = ref(false);
const selectedConflict = ref<ActiveConflict | null>(null);
const router = useRouter();
// End Vars

// Functions
async function refreshStatus() {
  pendingQueue.value = await syncController.getQueue();
  dlqCount.value = await syncController.getDlqCount();
  resolvedConflicts.value = await syncController.getResolvedConflicts();
  activeConflictDiffs.value = await syncController.getActiveConflicts();
}

function showConflictDiff(conflict: ActiveConflict) {
  selectedConflict.value = conflict;
  showConflictModal.value = true;
}

function formatDiffValue(val: unknown): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  if (typeof val === 'object') {
    try { return JSON.stringify(val) } catch { return String(val) }
  }
  return String(val);
}

async function handleShowDLQ() {
  await router.push('/sync/dlq');
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
    message:
      '¿Estás seguro de que quieres eliminar todos los cambios pendientes? Esta acción no se puede deshacer.',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
      },
      {
        text: 'Eliminar',
        role: 'confirm',
        handler: async () => {
          await syncController.clearQueue();
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

function formatResolvedAt(conflict: ResolvedConflict): string {
  const ts = conflict.conflict_data?.resolved_at || conflict.updated_at;
  if (!ts) return '';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'Hace menos de 1 minuto';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
  return `Hace ${Math.floor(diff / 86400000)} días`;
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
// End Watch
</script>

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
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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

.dlq-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.9rem;
}

.dlq-info ion-icon {
  font-size: 20px;
}

.conflict-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.conflict-field-tag {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.conflict-field-tag.tag-server {
  background: var(--ion-color-medium-tint);
  color: var(--ion-color-medium-contrast);
}

.conflict-field-tag.tag-client {
  background: var(--ion-color-primary-tint);
  color: var(--ion-color-primary-contrast);
}

.conflict-field-tag.tag-both {
  background: var(--ion-color-danger-tint);
  color: var(--ion-color-danger-contrast);
}

.conflict-more {
  font-size: 0.7rem;
  color: var(--ion-color-medium);
  padding: 2px 4px;
}

.conflict-detail {
  padding: 16px;
}

.conflict-entity-header {
  margin-bottom: 16px;
}

.conflict-entity-header h2 {
  margin: 0 0 4px;
  font-size: 1.2rem;
}

.conflict-sync-id {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.diff-item {
  --padding-start: 0;
}

.diff-field-name {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 8px;
  text-transform: capitalize;
}

.diff-values {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diff-value {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85rem;
}

.diff-value-text {
  word-break: break-all;
  line-height: 1.4;
}
</style>
