<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>
        <ion-title>Sincronización</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
<ion-grid v-if="isAuthenticated">
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="10" size-lg="8" size-xl="6">
            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>Estado de sincronización</ion-label>

                <ion-button
                  data-cy="sync-btn"
                  size="small"
                  :disabled="
                    !isOnline || isSyncing || (pendingChanges === 0 && activeConflictDiffs.length === 0)
                  "
                  @click="handleSyncNow"
                >
                  <ion-icon slot="start" :icon="syncOutline"></ion-icon>
                  {{ isSyncing ? 'Sincronizando...' : 'Sincronizar ahora' }}
                </ion-button>
              </ion-list-header>

              <ion-card class="shadow1">
                <ion-item lines="inset">
                  <ion-icon slot="start" :icon="getStatusIcon()" :class="{ spinning: isSyncing }"></ion-icon>
                  <ion-label>
                    <h3>Estado</h3>
                    <p>{{ getStatusText() }}</p>
                  </ion-label>
                </ion-item>

                <ion-item lines="inset">
                  <ion-icon slot="start" :icon="cloudOutline"></ion-icon>
                  <ion-label>
                    <h3>Conexión</h3>
                    <p :class="{ 'text-success': isOnline, 'text-warning': !isOnline }">
                      {{ isOnline ? 'En línea' : 'Fuera de línea' }}
                    </p>
                  </ion-label>
                </ion-item>

                <ion-item lines="inset">
                  <ion-icon slot="start" :icon="timeOutline"></ion-icon>
                  <ion-label>
                    <h3>Pendientes</h3>
                    <p
                      :class="{
                        'text-warning': pendingChanges > 0,
                        'text-success': pendingChanges === 0,
                      }"
                    >
                      {{ pendingChanges }} {{ pendingChanges === 1 ? 'cambio' : 'cambios' }}
                    </p>
                  </ion-label>
                </ion-item>

                <ion-item lines="inset">
                  <ion-icon slot="start" :icon="calendarOutline"></ion-icon>
                  <ion-label>
                    <h3>Última sincronización</h3>
                    <p>{{ formatLastSync() }}</p>
                  </ion-label>
                </ion-item>

                <ion-item v-if="syncError" lines="none" color="danger">
                  <ion-label class="ion-text-wrap">{{ syncError }}</ion-label>
                </ion-item>
              </ion-card>
            </ion-list>

        <ion-list v-if="pendingChanges > 0" class="transparent">
          <ion-list-header>
            <ion-label>Cambios pendientes</ion-label>
            <ion-button
              fill="clear"
              color="danger"
              size="small"
              @click="handleClearQueue"
            >
              <ion-icon slot="start" :icon="trashOutline"></ion-icon>
              Limpiar cola
            </ion-button>
          </ion-list-header>

          <ion-card class="shadow1">
            <ion-item
              v-for="(count, entity) in pendingByType"
              :key="entity"
              lines="inset"
            >
              <ion-label>{{ getEntityLabel(entity) }}</ion-label>
              <ion-badge slot="end" color="medium">{{ count }}</ion-badge>
            </ion-item>
          </ion-card>
        </ion-list>

        <ion-card class="shadow1">
          <ion-list lines="inset">
            <ion-item button lines="full" :disabled="!isOnline || isFixing" @click="handleFixSyncProblems">
              <ion-icon slot="start" :icon="constructOutline"></ion-icon>

              <ion-label>
                <h3>Solucionar problemas de sincronización</h3>

                <p>{{ isFixing && fixStatus ? fixStatus : 'Actualiza, sincroniza y repara en un solo paso' }}</p>
              </ion-label>
            </ion-item>
          </ion-list>

          <ion-accordion-group>
            <ion-accordion value="advanced">
              <ion-item slot="header" lines="none">
                <ion-label>Opciones avanzadas</ion-label>

                <ion-badge v-if="dlqCount > 0" slot="end" color="danger">{{ dlqCount }}</ion-badge>
              </ion-item>

              <ion-list slot="content" lines="inset">
                <ion-item button :disabled="!isOnline || isFixing || isForcingSync" @click="handleForceSync">
                  <ion-icon slot="start" :icon="refreshCircleOutline"></ion-icon>

                  <ion-label>
                    <h3>Forzar sincronización completa</h3>

                    <p>{{ isForcingSync ? 'Sincronizando...' : 'Re-sube todo al servidor' }}</p>
                  </ion-label>
                </ion-item>

                <ion-item
                  button
                  :disabled="!isOnline || isRepairing || isFixing"
                  @click="handleRepairSync"
                >
                  <ion-icon slot="start" :icon="constructOutline"></ion-icon>

                  <ion-label>
                    <h3>Reparar sincronización</h3>

                    <p>Compara tu base local con el servidor</p>
                  </ion-label>
                </ion-item>

                <ion-item button :disabled="isFixing || isRefreshingStatus" @click="handleRefreshStatus">
                  <ion-icon slot="start" :icon="refreshOutline"></ion-icon>

                  <ion-label>
                    <h3>Actualizar estado</h3>

                    <p>{{ isRefreshingStatus ? 'Actualizando...' : 'Vuelve a leer la cola y los conflictos' }}</p>
                  </ion-label>
                </ion-item>

                <ion-item v-if="dlqCount > 0" button @click="handleShowDLQ">
                  <ion-icon slot="start" :icon="alertCircleOutline" color="danger"></ion-icon>

                  <ion-label>
                    <h3>Elementos fallidos</h3>

                    <p>{{ dlqCount }} {{ dlqCount === 1 ? 'elemento' : 'elementos' }} en cola de fallidos</p>
                  </ion-label>

                  <ion-badge slot="end" color="danger">{{ dlqCount }}</ion-badge>
                </ion-item>
              </ion-list>
            </ion-accordion>
          </ion-accordion-group>
        </ion-card>

        <ion-card v-if="activeConflictDiffs.length > 0" data-cy="conflicts-card">
          <ion-card-header>
            <ion-card-title
              >Conflictos activos
              <ion-badge data-cy="conflict-count-badge" color="warning">{{
                activeConflictDiffs.length
              }}</ion-badge></ion-card-title
            >
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item
                v-for="(entry, idx) in activeConflictDiffs"
                :key="entry.sync_id + idx"
                data-cy="conflict-item"
              >
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
                    <span v-if="entry.diffs.length > 5" class="conflict-more"
                      >+{{ entry.diffs.length - 5 }} más</span
                    >
                  </p>
                </ion-label>
                <ion-badge
                  slot="end"
                  data-cy="conflict-badge"
                  :color="entry.diffs.some((d) => d.changed_in === 'both') ? 'danger' : 'warning'"
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
            <ion-card-title
              >Conflictos resueltos
              <ion-badge color="medium">{{ resolvedConflicts.length }}</ion-badge></ion-card-title
            >
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item
                v-for="conflict in resolvedConflicts"
                :key="conflict.entity_id + conflict.entity_type"
              >
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

        <ion-modal
          data-cy="conflict-modal"
          :is-open="showConflictModal"
          css-class="conflict-modal-large"
          @did-dismiss="showConflictModal = false"
        >
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="showConflictModal = false">Cerrar</ion-button>
              </ion-buttons>
              <ion-title>Conflicto detectado</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <div v-if="selectedConflict" class="conflict-detail-new">
              <div class="conflict-intro">
                <ion-icon :icon="warningOutline" size="large" color="warning" />
                <div>
                  <h2>{{ getEntityLabel(selectedConflict.entityType) }}</h2>
                  <p class="conflict-intro-text">
                    Este registro se modificó desde dos sitios a la vez. Elige qué versión quieres
                    conservar:
                  </p>
                  <p class="conflict-intro-hint">
                    ↕ Los valores que difieren entre versiones están resaltados en ambas columnas
                  </p>
                </div>
              </div>

              <div class="conflict-cards-grid">
                <div class="version-card version-local">
                  <div class="version-card-header">
                    <span class="version-card-badge version-card-badge-local">Tu versión</span>
                    <span class="version-card-time">{{ formatRelativeTime(clientTimestamp) }}</span>
                  </div>
                  <ion-list class="transparent">
                    <ion-item v-for="rf in displayableFields" :key="rf.field" lines="full">
                      <ion-label>
                        <h3>{{ rf.label }}</h3>
                        <p class="field-value">{{ rf.clientDisplay }}</p>
                      </ion-label>
                    </ion-item>
                  </ion-list>
                  <div v-if="sameFieldCount > 0" class="version-card-footer">
                    ✓ {{ sameFieldCount }} campo{{ sameFieldCount === 1 ? '' : 's' }} coinciden — no
                    hay cambios
                  </div>
                </div>

                <div class="version-card version-server">
                  <div class="version-card-header">
                    <span class="version-card-badge version-card-badge-server"
                      >Versión del servidor</span
                    >
                    <span class="version-card-time">{{ formatRelativeTime(serverTimestamp) }}</span>
                  </div>
                  <ion-list class="transparent">
                    <ion-item v-for="rf in displayableFields" :key="rf.field" lines="full">
                      <ion-label>
                        <h3>{{ rf.label }}</h3>
                        <p class="field-value">{{ rf.serverDisplay }}</p>
                      </ion-label>
                    </ion-item>
                  </ion-list>
                  <div v-if="sameFieldCount > 0" class="version-card-footer">
                    ✓ {{ sameFieldCount }} campo{{ sameFieldCount === 1 ? '' : 's' }} coinciden — no
                    hay cambios
                  </div>
                </div>
              </div>

              <div class="conflict-actions">
                <ion-button
                  data-cy="resolve-client-btn"
                  expand="block"
                  shape="round"
                  color="primary"
                  @click="handleResolveClient"
                >
                  <ion-icon slot="start" :icon="personOutline" />
                  Conservar lo que tengo aquí
                </ion-button>
                <ion-button
                  data-cy="resolve-server-btn"
                  expand="block"
                  shape="round"
                  fill="outline"
                  color="medium"
                  @click="handleResolveServer"
                >
                  <ion-icon slot="start" :icon="cloudOutline" />
                  Conservar lo del servidor
                </ion-button>
              </div>
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
              </ion-col>
            </ion-row>
          </ion-grid>
          <ion-grid v-else>
            <ion-row class="ion-justify-content-center">
              <ion-col size="12" size-md="10" size-lg="8" size-xl="6">
                <div class="empty-state">
                  <ion-icon :icon="cloudOfflineOutline" class="empty-icon"></ion-icon>

                  <h2>Sesión requerida</h2>

                  <p>Necesitás iniciar sesión para sincronizar tus datos.</p>

                  <ion-button expand="block" @click="handleGoToLogin">
                    <ion-icon slot="start" :icon="logInOutline"></ion-icon>
                    Iniciar sesión
                  </ion-button>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
      <ion-modal
        :is-open="showRepairModal"
        :backdrop-dismiss="!isRepairing"
        css-class="repair-modal"
        @did-dismiss="handleRepairDismiss"
      >
        <ion-header>
          <ion-toolbar>
            <ion-title>Reparando sincronización</ion-title>
            <ion-buttons slot="end">
              <ion-button v-if="!isRepairing" fill="clear" @click="closeRepairModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div class="repair-container">
            <div class="repair-icon">
              <ion-icon
                :icon="constructOutline"
                :class="{ 'repair-spinning': isRepairing }"
                size="large"
                color="warning"
              />
            </div>
            <p class="repair-message">{{ repairMessage }}</p>
            <ion-progress-bar
              :value="repairPercent / 100"
              :color="repairStep === 'error' ? 'danger' : 'warning'"
            />
            <p class="repair-percent">{{ Math.round(repairPercent) }}%</p>
            <div v-if="isRepairing" class="repair-spinner">
              <ion-spinner name="dots" color="warning" />
            </div>
            <ion-button
              v-else
              expand="block"
              fill="solid"
              color="primary"
              class="ion-margin-top"
              @click="closeRepairModal"
            >
              Cerrar
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>
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
  IonMenuButton,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonBadge,
  IonText,
  IonNote,
  IonModal,
  IonChip,
  IonProgressBar,
  IonSpinner,
  IonAccordion,
  IonAccordionGroup,
  alertController,
  toastController,
} from '@ionic/vue';
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  cloudOutline,
  cloudOfflineOutline,
  logInOutline,
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
  personOutline,
  constructOutline,
  closeOutline,
} from 'ionicons/icons';
// End Imports

// Controllers
import { SyncController } from '@/controllers/syncController';
import systemController from '@/controllers/systemConfigController';
import authController from '@/controllers/authController';
import type { RepairProgress } from '@/controllers/syncController';
import { conflictResolutionService } from '@/services/sync/ConflictResolutionService';
import { resolveConflictFields } from '@/controllers/lookupResolver';
import type { DisplayField } from '@/controllers/lookupResolver';
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
const designMode = computed(() => systemController.getDesignMode());
const showDebugInfo = ref(false);
const pendingQueue = ref<SyncItem[]>([]);
const dlqCount = ref(0);
const resolvedConflicts = ref<ResolvedConflict[]>([]);
const activeConflictDiffs = ref<ActiveConflict[]>([]);
const showConflictModal = ref(false);
const selectedConflict = ref<ActiveConflict | null>(null);
const resolvedFields = ref<DisplayField[]>([]);
const clientTimestamp = computed(() => {
  const ts = selectedConflict.value?.client_data?.updated_at;
  if (!ts) return undefined;
  const d = new Date(String(ts));
  return isNaN(d.getTime()) ? undefined : d.getTime() / 1000;
});
const serverTimestamp = computed(() => {
  const ts = selectedConflict.value?.server_data?.updated_at;
  if (!ts) return undefined;
  const d = new Date(String(ts));
  return isNaN(d.getTime()) ? undefined : d.getTime() / 1000;
});
const displayableFields = computed(() => resolvedFields.value.filter((f) => f.hasDifference));
const sameFieldCount = computed(() => resolvedFields.value.length - displayableFields.value.length);
const router = useRouter();
const showRepairModal = ref(false);
const isRepairing = ref(false);
const repairStep = ref<RepairProgress['step']>('pulling_server');
const repairMessage = ref('');
const repairPercent = ref(0);
const isFixing = ref(false);
const fixStatus = ref('');
const isRefreshingStatus = ref(false);
const isForcingSync = ref(false);
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

watch(
  selectedConflict,
  async (conflict) => {
    if (!conflict) {
      resolvedFields.value = [];
      return;
    }
    resolvedFields.value = await resolveConflictFields({
      serverData: conflict.server_data,
      clientData: conflict.client_data,
    });
  },
  { immediate: true },
);

function formatRelativeTime(timestamp?: number): string {
  if (timestamp === undefined || timestamp === null) return '';
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60) return 'hace unos segundos';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
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
    budget_entry: 'Entradas de gasto',
    budget_entry_group: 'Grupos de entradas',
    budget_provider: 'Proveedores del presupuesto',
    budget_provider_product: 'Productos de proveedores',
    entry: 'Entradas',
    income: 'Ingresos',
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
        handler: () => {
          void runForceSync();
        },
      },
    ],
  });
  await alert.present();
    }

async function runForceSync() {
        if (isForcingSync.value) return;
        isForcingSync.value = true;
        try {
          await syncController.fullSyncAndSave();
          await refreshStatus();
          const syncErrorMsg = syncController.getSyncError();
          const toast = await toastController.create({
            message: syncErrorMsg
              ? `Error en sincronización completa: ${syncErrorMsg}`
              : 'Sincronización completa exitosa',
            duration: 3000,
            color: syncErrorMsg ? 'danger' : 'success',
          });
          await toast.present();
        } finally {
          isForcingSync.value = false;
        }
}

async function handleRefreshStatus() {
  if (isRefreshingStatus.value) return;
  isRefreshingStatus.value = true;
  try {
    await refreshStatus();
    await syncController.pullFromServer();
    const toast = await toastController.create({
      message: 'Estado actualizado',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  } catch (error) {
    const toast = await toastController.create({
      message: 'No se pudo actualizar el estado',
      duration: 3000,
      color: 'danger',
    });
    await toast.present();
  } finally {
    isRefreshingStatus.value = false;
  }
}

async function handleResolveClient() {
  if (!selectedConflict.value) return;
  const result = await syncController.resolveConflict({
    entity_type: selectedConflict.value.entityType,
    entity_id: selectedConflict.value.sync_id,
    resolution: 'client',
    client_data: selectedConflict.value.client_data,
  });
  if (result.ok) {
    showConflictModal.value = false;
    await refreshStatus();
    const toast = await toastController.create({
      message: 'Conflicto resuelto: se aplicó tu versión',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  } else {
    const toast = await toastController.create({
      message: result.error
        ? `Error al resolver el conflicto: ${result.error}`
        : 'Error al resolver el conflicto',
      duration: 3000,
      color: 'danger',
    });
    await toast.present();
  }
}

async function handleResolveServer() {
  if (!selectedConflict.value) return;
  const result = await syncController.resolveConflict({
    entity_type: selectedConflict.value.entityType,
    entity_id: selectedConflict.value.sync_id,
    resolution: 'server',
  });
  if (result.ok) {
    showConflictModal.value = false;
    await refreshStatus();
    const toast = await toastController.create({
      message: 'Conflicto resuelto: se aceptó la versión del servidor',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  } else {
    const toast = await toastController.create({
      message: result.error
        ? `Error al resolver el conflicto: ${result.error}`
        : 'Error al resolver el conflicto',
      duration: 3000,
      color: 'danger',
    });
    await toast.present();
  }
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

async function handleRepairSync() {
  const alert = await alertController.create({
    header: 'Reparar sincronización',
    message:
      'Esto escaneará toda tu base local y la comparará con el servidor para recuperar elementos que no se hayan sincronizado. Puede subir cambios que borraste de la cola intencionalmente. ¿Continuar?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Entendido, reparar',
        role: 'confirm',
        handler: () => {
          void startRepair();
        },
      },
    ],
  });
  await alert.present();
}

async function startRepair() {
  showRepairModal.value = true;
  isRepairing.value = true;
  repairStep.value = 'pulling_server';
  repairPercent.value = 0;
  repairMessage.value = 'Iniciando reparación...';

  const result = await syncController.repairSync({
    onProgress: (p: RepairProgress) => {
      repairStep.value = p.step;
      repairMessage.value = p.message;
      repairPercent.value = p.percent;
      if (p.step === 'done' || p.step === 'error') {
        isRepairing.value = false;
      }
    },
  });

  if (result.ok) {
    await refreshStatus();
    const toast = await toastController.create({
      message: `Reparación completada: ${result.created} elemento(s) sincronizado(s)`,
      duration: 3000,
      color: 'success',
    });
    await toast.present();
  } else {
    const toast = await toastController.create({
      message: 'Error en reparación. Revisa la conexión e intenta de nuevo.',
      duration: 4000,
      color: 'danger',
    });
    await toast.present();
  }
}

async function handleFixSyncProblems() {
  const alert = await alertController.create({
    header: 'Solucionar problemas de sincronización',
    message:
      'Esto va a actualizar el estado, forzar una sincronización completa y, solo si sigue habiendo pendientes o conflictos, reparar la sincronización. Puede subir cambios que borraste de la cola intencionalmente. ¿Continuar?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Solucionar',
        role: 'confirm',
        handler: () => {
          void runFixSequence();
        },
      },
    ],
  });
  await alert.present();
}

async function runFixSequence() {
  isFixing.value = true;
  try {
    fixStatus.value = 'Actualizando estado...';
    await refreshStatus();
    await syncController.pullFromServer();

    fixStatus.value = 'Sincronizando todo...';
    await syncController.fullSyncAndSave();
    await refreshStatus();
    const seqError = syncController.getSyncError();
    if (seqError) throw new Error(seqError);

    if (pendingChanges.value > 0 || activeConflictDiffs.value.length > 0) {
      fixStatus.value = 'Reparando sincronización...';
      await startRepair();
    } else {
      const toast = await toastController.create({
        message: 'Sincronización solucionada',
        duration: 2000,
        color: 'success',
      });
      await toast.present();
    }
  } catch (error) {
      const reason = error instanceof Error ? `: ${error.message}` : '';
    const toast = await toastController.create({
      message: `Falló el paso (${fixStatus.value})${reason}`,
      duration: 4000,
      color: 'danger',
    });
    await toast.present();

    await refreshStatus();
  } finally {
    fixStatus.value = '';
    isFixing.value = false;
  }
}

async function handleGoToLogin() {
  await router.push('/login');
}

function handleRepairDismiss(event: CustomEvent) {
  if (isRepairing.value) {
    event.detail.preventDefault?.();
    showRepairModal.value = true;
  }
}

function closeRepairModal() {
  showRepairModal.value = false;
}
// End Functions

// Life cycle
onMounted(async () => {
  if (!authController.getIsAuthenticated()) return;

  await refreshStatus();
});
// End Life cycle

// Computed
const isAuthenticated = computed(() => authController.getIsAuthenticated());
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
watch(isAuthenticated, async (authenticated) => {
  if (authenticated) await refreshStatus();
});
// End Watch
</script>

<style scoped>
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
  color: var(--ion-color-medium);
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 1.25rem;
  margin-bottom: 8px;
  color: var(--ion-text-color);
}

.empty-state p {
  font-size: 0.9rem;
  margin-bottom: 24px;
}

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

.conflict-detail-new {
  padding: 16px;
}

.conflict-intro {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

.conflict-intro h2 {
  margin: 0 0 4px;
  font-size: 1.1rem;
  font-weight: 700;
}

.conflict-intro-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}

.conflict-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 768px) {
  .conflict-cards-grid {
    flex-direction: row;
  }
  .version-card {
    flex: 1;
  }
}

.version-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.version-local {
  border: 1px solid var(--ion-color-tertiary-tint);
  background: linear-gradient(135deg, rgba(var(--ion-color-tertiary-rgb), 0.04), transparent);
  border-top: 4px solid var(--ion-color-tertiary);
}

.version-server {
  border: 1px solid var(--ion-color-secondary-tint);
  background: linear-gradient(135deg, rgba(var(--ion-color-secondary-rgb), 0.04), transparent);
  border-top: 4px solid var(--ion-color-secondary);
}

.version-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.version-card-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

.version-card-badge-local {
  background: rgba(var(--ion-color-tertiary-rgb), 0.15);
  color: var(--ion-color-tertiary-contrast);
}

.version-card-badge-server {
  background: rgba(var(--ion-color-secondary-rgb), 0.15);
  color: var(--ion-color-secondary-contrast);
}

.version-card-time {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
}

.field-value {
  font-size: 0.9rem;
  font-weight: 500;
  margin: 4px 0 0;
}

.version-card-footer {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
  padding: 12px 16px;
  border-top: 1px solid var(--ion-color-light-shade);
  font-style: italic;
}

.conflict-intro-hint {
  margin: 16px 0 0;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
  font-style: italic;
}

.conflict-actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conflict-modal-large {
  --width: 90vw;
  --max-width: 1100px;
  --height: 90vh;
  --max-height: 800px;
  --border-radius: 16px;
}

.repair-modal {
  --width: 320px;
  --max-width: calc(100vw - 32px);
  --height: 280px;
  --border-radius: 16px;
}

.repair-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  text-align: center;
}

.repair-icon {
  margin-bottom: 4px;
}

.repair-icon .repair-spinning {
  animation: repairSpin 2s linear infinite;
}

@keyframes repairSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.repair-message {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin: 0;
  padding: 0 16px;
}

.repair-percent {
  font-size: 0.8rem;
  color: var(--ion-color-medium-shade);
  margin: 0;
}

.repair-spinner {
  margin-top: 4px;
}

ion-progress-bar {
  width: 80%;
}
</style>
