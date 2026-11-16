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
        <ion-title>{{ t('sync.view.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid v-if="isAuthenticated && !syncConfigured">
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="8" size-lg="6">
            <ion-card class="shadow1">
              <ion-card-header>
                <ion-card-title>
                  <ion-icon :icon="cloudOfflineOutline" color="medium" style="vertical-align: middle; margin-right: 8px"></ion-icon>
                  {{ t('sync.view.disabled.title') }}
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>{{ t('sync.view.disabled.body') }}</p>
                <ion-button
                  expand="block"
                  color="primary"
                  class="ion-margin-top"
                  @click="navigateToConnections"
                >
                  <ion-icon slot="start" :icon="settingsOutline"></ion-icon>
                  {{ t('sync.view.disabled.goToSettings') }}
                </ion-button>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

<ion-grid v-if="isAuthenticated" :class="{ 'sync-disabled': !syncConfigured }">
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="10" size-lg="8" size-xl="6">
            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>{{ t('sync.view.statusHeader') }}</ion-label>

                <ion-button
                  data-cy="sync-btn"
                  size="small"
                  :disabled="!isOnline || isSyncing || !syncConfigured"
                  @click="handleSyncNow"
                >
                  <ion-icon slot="start" :icon="syncOutline"></ion-icon>
                  {{ isSyncing ? t('sync.view.syncing') : t('sync.view.actions.syncNow') }}
                </ion-button>
              </ion-list-header>

              <ion-card class="shadow1">
                <ion-item lines="inset">
                  <ion-icon slot="start" :icon="getStatusIcon()" :class="{ spinning: isSyncing }"></ion-icon>
                  <ion-label>
                    <h3>{{ t('sync.view.statusHeader') }}</h3>
                    <p>{{ getStatusText() }}</p>
                  </ion-label>
                </ion-item>

                <ion-item lines="inset">
                  <ion-icon slot="start" :icon="cloudOutline"></ion-icon>
                  <ion-label>
                    <h3>{{ t('sync.view.connection') }}</h3>
                    <p :class="{ 'text-success': isOnline, 'text-warning': !isOnline }">
                      {{ isOnline ? t('sync.view.statusText.online') : t('sync.view.statusText.offline') }}
                    </p>
                  </ion-label>
                </ion-item>

                <ion-item lines="inset">
                  <ion-icon slot="start" :icon="timeOutline"></ion-icon>
                  <ion-label>
                    <h3>{{ t('sync.view.summary.pending') }}</h3>
                    <p
                      :class="{
                        'text-warning': pendingChanges > 0,
                        'text-success': pendingChanges === 0,
                      }"
                    >
                      {{ pendingChanges }} {{ pendingChanges === 1 ? t('sync.view.change_one') : t('sync.view.change_other') }}
                    </p>
                  </ion-label>
                </ion-item>

                <ion-item lines="inset">
                  <ion-icon slot="start" :icon="calendarOutline"></ion-icon>
                  <ion-label>
                    <h3>{{ t('sync.view.summary.lastSync') }}</h3>
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
            <ion-label>{{ t('sync.view.summary.pending') }}</ion-label>
            <ion-button
              fill="clear"
              color="danger"
              size="small"
              @click="handleClearQueue"
            >
              <ion-icon slot="start" :icon="trashOutline"></ion-icon>
              {{ t('sync.view.clearQueue') }}
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
            <ion-item button lines="full" :disabled="!isOnline || isFixing || !syncConfigured" @click="handleFixSyncProblems">
              <ion-icon slot="start" :icon="constructOutline"></ion-icon>

              <ion-label>
                <h3>{{ t('sync.view.fixProblems') }}</h3>

                <p>{{ isFixing && fixStatus ? fixStatus : t('sync.view.fixProblemsBody') }}</p>
              </ion-label>
            </ion-item>
          </ion-list>

          <ion-accordion-group>
            <ion-accordion value="advanced">
              <ion-item slot="header" lines="none">
                <ion-label>{{ t('sync.view.advanced') }}</ion-label>

                <ion-badge v-if="dlqCount > 0" slot="end" color="danger">{{ dlqCount }}</ion-badge>
              </ion-item>

              <ion-list slot="content" lines="inset">
                <ion-item button :disabled="!isOnline || isFixing || isForcingSync || !syncConfigured" @click="handleForceSync">
                  <ion-icon slot="start" :icon="refreshCircleOutline"></ion-icon>

                  <ion-label>
                    <h3>{{ t('sync.view.forceSync') }}</h3>

                    <p>{{ isForcingSync ? t('sync.view.syncing') : t('sync.view.forceSyncBody') }}</p>
                  </ion-label>
                </ion-item>

                <ion-item
                  button
                  :disabled="!isOnline || isRepairing || isFixing || !syncConfigured"
                  @click="handleRepairSync"
                >
                  <ion-icon slot="start" :icon="constructOutline"></ion-icon>

                  <ion-label>
                    <h3>{{ t('sync.view.repair') }}</h3>

                    <p>{{ t('sync.view.repairBody') }}</p>
                  </ion-label>
                </ion-item>

                <ion-item button :disabled="isFixing || isRefreshingStatus || !syncConfigured" @click="handleRefreshStatus">
                  <ion-icon slot="start" :icon="refreshOutline"></ion-icon>

                  <ion-label>
                    <h3>{{ t('sync.view.refreshStatus') }}</h3>

                    <p>{{ isRefreshingStatus ? t('sync.view.refreshing') : t('sync.view.refreshStatusBody') }}</p>
                  </ion-label>
                </ion-item>

                <ion-item v-if="dlqCount > 0" button @click="handleShowDLQ">
                  <ion-icon slot="start" :icon="alertCircleOutline" color="danger"></ion-icon>

                  <ion-label>
                    <h3>{{ t('sync.view.failedItems') }}</h3>

                    <p>{{ dlqCount }} {{ dlqCount === 1 ? t('sync.view.element_one') : t('sync.view.element_other') }} {{ t('sync.view.inDlq') }}</p>
                  </ion-label>

                  <ion-badge slot="end" color="danger">{{ dlqCount }}</ion-badge>
                </ion-item>

                <ion-item button data-cy="diagnose-divergence-btn" :disabled="isDivergenceChecking || isFixing || !syncConfigured" @click="handleDiagnoseDivergence">
                  <ion-icon slot="start" :icon="searchOutline"></ion-icon>

                  <ion-label>
                    <h3>{{ t('sync.view.diagnoseDivergence') }}</h3>

                    <p>
                      {{ isDivergenceChecking
                        ? t('sync.view.diagnoseChecking')
                        : t('sync.view.diagnoseBody')
                      }}
                    </p>
                  </ion-label>
                </ion-item>

                <ion-item button data-cy="repair-divergence-btn" :disabled="isRepairingDivergence || isFixing || !syncConfigured" @click="handleRepairDivergence">
                  <ion-icon slot="start" :icon="pulseOutline"></ion-icon>

                  <ion-label>
                    <h3>{{ t('sync.view.repairDivergence') }}</h3>

                    <p>
                      {{ isRepairingDivergence
                        ? t('sync.view.repairDivergenceRunning')
                        : t('sync.view.repairDivergenceBody')
                      }}
                    </p>
                  </ion-label>
                </ion-item>

                <div v-if="divergenceSummary !== null" data-cy="divergence-summary">
                  <ion-text v-if="divergenceServerReachable === false" color="danger">
                    <p class="ion-padding-start">{{ t('sync.view.divergenceServerUnreachable') }}</p>
                  </ion-text>

                  <ion-text v-else-if="divergenceSummary.length === 0" color="success">
                    <p class="ion-padding-start">{{ t('sync.view.divergenceNone') }}</p>
                  </ion-text>

                  <ul v-else class="ion-padding-start">
                    <li v-for="line in divergenceSummary" :key="line">{{ line }}</li>
                  </ul>

                  <p class="ion-padding-start">
                    <ion-text color="medium">
                      {{ t('sync.view.divergenceDevDetail') }} <code>window.__devDb.detectDivergence()</code> {{ t('sync.view.inConsole') }}.
                    </ion-text>
                  </p>
                </div>
              </ion-list>
            </ion-accordion>
          </ion-accordion-group>
        </ion-card>

        <ion-card v-if="activeConflictDiffs.length > 0" data-cy="conflicts-card">
          <ion-card-header>
            <ion-card-title
              >{{ t('sync.view.activeConflicts') }}
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
                      >{{ t('sync.view.conflicts.moreFields', { n: entry.diffs.length - 5 }) }}</span
                    >
                  </p>
                </ion-label>
                <ion-badge
                  slot="end"
                  data-cy="conflict-badge"
                  :color="entry.diffs.some((d) => d.changed_in === 'both') ? 'danger' : 'warning'"
                  @click="showConflictDiff(entry)"
                >
                  {{
                    entry.diffs.length
                  }}
                  {{
                    entry.diffs.length !== 1
                      ? t('sync.view.conflicts.field_other')
                      : t('sync.view.conflicts.field_one')
                  }}
                </ion-badge>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-card v-if="resolvedConflicts.length > 0">
          <ion-card-header>
            <ion-card-title
              >{{ t('sync.view.conflicts.resolvedTitle') }}
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
                  <p>
                    {{
                      t('sync.view.conflicts.resolution', {
                        resolution:
                          conflict.conflict_data?.resolution ?? t('sync.view.conflicts.resolutionServer'),
                      })
                    }}
                  </p>
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
                <ion-button @click="showConflictModal = false">{{ t('common.close') }}</ion-button>
              </ion-buttons>
              <ion-title>{{ t('sync.view.conflicts.modalTitle') }}</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <div v-if="selectedConflict" class="conflict-detail-new">
              <div class="conflict-intro">
                <ion-icon :icon="warningOutline" size="large" color="warning" />
                <div>
                  <h2>{{ getEntityLabel(selectedConflict.entityType) }}</h2>
                  <p class="conflict-intro-text">
                    {{ t('sync.view.conflicts.intro') }}
                  </p>
                  <p class="conflict-intro-hint">
                    {{ t('sync.view.conflicts.introHint') }}
                  </p>
                </div>
              </div>

              <div class="conflict-cards-grid">
                <div class="version-card version-local">
                  <div class="version-card-header">
                    <span class="version-card-badge version-card-badge-local">{{
                      t('sync.view.conflicts.yourVersion')
                    }}</span>
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
                    {{
                      t(
                        sameFieldCount === 1
                          ? 'sync.view.conflicts.sameField_one'
                          : 'sync.view.conflicts.sameField_other',
                        { n: sameFieldCount },
                      )
                    }}
                  </div>
                </div>

                <div class="version-card version-server">
                  <div class="version-card-header">
                    <span class="version-card-badge version-card-badge-server">{{
                      t('sync.view.conflicts.serverVersion')
                    }}</span>
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
                    {{
                      t(
                        sameFieldCount === 1
                          ? 'sync.view.conflicts.sameField_one'
                          : 'sync.view.conflicts.sameField_other',
                        { n: sameFieldCount },
                      )
                    }}
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
                  {{ t('sync.view.conflicts.keepLocal') }}
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
                  {{ t('sync.view.conflicts.keepServer') }}
                </ion-button>
              </div>
            </div>
          </ion-content>
        </ion-modal>

        <ion-card v-if="showDebugInfo">
          <ion-card-header>
            <ion-card-title>{{ t('sync.view.debug.title') }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-button expand="block" fill="clear" @click="handleShowDebug">
              <ion-icon slot="start" :icon="codeOutline"></ion-icon>
              {{ t('sync.view.debug.show') }}
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

                  <h2>{{ t('sync.syncview.title') }}</h2>

                  <p>{{ t('sync.view.login.required') }}</p>

                  <ion-button expand="block" @click="handleGoToLogin">
                    <ion-icon slot="start" :icon="logInOutline"></ion-icon>
                    {{ t('sync.view.login.action') }}
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
            <ion-title>{{ t('sync.view.repairModal.title') }}</ion-title>
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
              {{ t('common.close') }}
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
import { useLocale } from '@/composables/useLocale';
import {
  cloudOutline,
  cloudOfflineOutline,
  logInOutline,
  settingsOutline,
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
  searchOutline,
  pulseOutline,
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
import { isSyncEnabled, getSyncServerUrl } from '@/services/sync/syncConfig';
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
const { t } = useLocale();
const showRepairModal = ref(false);
const isRepairing = ref(false);
const repairStep = ref<RepairProgress['step']>('pulling_server');
const repairMessage = ref('');
const repairPercent = ref(0);
const isFixing = ref(false);
const fixStatus = ref('');
const isRefreshingStatus = ref(false);
const isForcingSync = ref(false);
// LBDS-276: divergence diagnostic state. `divergenceSummary` carries the
// human-readable lines produced by `syncController.detectDivergence()`; the
// list renders only when the user taps the new "Diagnostico de divergencias"
// item inside the existing advanced accordion.
const isDivergenceChecking = ref(false);
const divergenceSummary = ref<string[] | null>(null);
const divergenceServerReachable = ref<boolean | null>(null);
const isRepairingDivergence = ref(false);
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
  if (diff < 60) return t('sync.view.time.secondsAgo');
  if (diff < 3600) return t('sync.view.time.minutesAgo', { m: Math.floor(diff / 60) });
  if (diff < 86400) return t('sync.view.time.hoursAgo', { h: Math.floor(diff / 3600) });
  return t('sync.view.time.daysAgo', { d: Math.floor(diff / 86400) });
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
  if (!isOnline.value) return t('sync.view.state.offline');
  if (isSyncing.value) return t('sync.view.state.syncing');
  if (pendingChanges.value > 0) return t('sync.view.state.pending');
  return t('sync.view.state.synced');
}

function getEntityLabel(entity: string) {
  const key = `sync.view.entity.${entity}`;
  const label = t(key);
  return label === key ? entity : label;
}

function formatLastSync() {
  if (lastSyncTime.value === 0) return t('sync.view.summary.never');
  const diff = Date.now() - lastSyncTime.value;
  if (diff < 60000) return t('sync.view.lastSync.lessThanMinute');
  if (diff < 3600000) return t('sync.view.lastSync.minutes', { n: Math.floor(diff / 60000) });
  if (diff < 86400000) return t('sync.view.lastSync.hours', { n: Math.floor(diff / 3600000) });
  return t('sync.view.lastSync.days', { n: Math.floor(diff / 86400000) });
}

async function handleSyncNow() {
  const success = await syncController.syncNow();
  // LBDS-244: refreshStatus toca la red (getResolvedConflicts). Si falla, no
  // debe tapar el toast de error del sync: lo guardamos y seguimos.
  try {
    await refreshStatus();
  } catch (refreshError) {
    console.warn('[SyncView] No se pudo refrescar el estado de sync:', refreshError);
  }
  if (success) {
    const toast = await toastController.create({
      message: t('sync.view.toast.syncCompleted'),
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  } else {
    // LBDS-244: a failed sync used to show nothing at all while the pending
    // badge stayed non-zero, so the user could not tell the sync never ran.
    const toast = await toastController.create({
      message: syncController.getSyncError() ?? t('sync.view.toast.syncFailed'),
      duration: 4000,
      color: 'danger',
    });
    await toast.present();
  }
}

async function handleClearQueue() {
  const alert = await alertController.create({
    header: t('sync.view.errors.disabled.header'),
    message: t('sync.view.errors.disabled.message'),
    buttons: [
      {
        text: t('sync.syncview.text1'),
        role: 'cancel',
      },
      {
        text: t('sync.syncview.text2'),
        role: 'confirm',
        handler: async () => {
          await syncController.clearQueue();
          await refreshStatus();
          const toast = await toastController.create({
            message: t('sync.syncview.message1'),
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
    header: t('sync.syncview.header'),
    message: t('sync.view.errors.offline.message'),
    buttons: [
      {
        text: t('sync.syncview.text1'),
        role: 'cancel',
      },
      {
        text: t('sync.syncview.text4'),
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
              ? t('sync.view.toast.fullSyncError', { message: syncErrorMsg })
              : t('sync.view.toast.fullSyncOk'),
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
      message: t('sync.syncview.message2'),
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  } catch (error) {
    const toast = await toastController.create({
      message: t('sync.syncview.message3'),
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
      message: t('sync.syncview.message4'),
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  } else {
    const toast = await toastController.create({
      message: result.error
        ? t('sync.view.toast.resolveConflictError', { message: result.error })
        : t('sync.view.toast.resolveConflictErrorGeneric'),
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
      message: t('sync.syncview.message5'),
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  } else {
    const toast = await toastController.create({
      message: result.error
        ? t('sync.view.toast.resolveConflictError', { message: result.error })
        : t('sync.view.toast.resolveConflictErrorGeneric'),
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
  if (diff < 60000) return t('sync.view.resolvedAt.lessThanMinute');
  if (diff < 3600000) return t('sync.view.resolvedAt.minutes', { n: Math.floor(diff / 60000) });
  if (diff < 86400000) return t('sync.view.resolvedAt.hours', { n: Math.floor(diff / 3600000) });
  return t('sync.view.resolvedAt.days', { n: Math.floor(diff / 86400000) });
}

async function handleRepairSync() {
  const alert = await alertController.create({
    header: t('sync.view.errors.pullOffline.header'),
    message: t('sync.view.errors.pullOffline.message'),
    buttons: [
      { text: t('sync.syncview.alert.cancel'), role: 'cancel' },
      {
        text: t('sync.syncview.text5'),
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
  repairMessage.value = t('sync.view.repairModal.starting');

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
      message: t('sync.view.toast.repairCompleted', { count: result.created }),
      duration: 3000,
      color: 'success',
    });
    await toast.present();
  } else {
    const toast = await toastController.create({
      message: t('sync.syncview.message6'),
      duration: 4000,
      color: 'danger',
    });
    await toast.present();
  }
}

async function handleFixSyncProblems() {
  const alert = await alertController.create({
    header: t('sync.view.errors.fullOffline.header'),
    message: t('sync.view.errors.fullOffline.message'),
    buttons: [
      { text: t('sync.syncview.alert.cancel'), role: 'cancel' },
      {
        text: t('sync.syncview.text6'),
        role: 'confirm',
        handler: () => {
          void runFixSequence();
        },
      },
    ],
  });
  await alert.present();
}

// LBDS-276: divergence diagnostic. The handler runs the detector (which
// fetches a server snapshot + reads all the local Dexie tables) and renders
// the human-readable drift summary inside the advanced accordion.
async function handleDiagnoseDivergence() {
  if (isDivergenceChecking.value) return;
  isDivergenceChecking.value = true;
  try {
    const report = await syncController.detectDivergence();
    divergenceSummary.value = report.summary;
    divergenceServerReachable.value = report.serverReachable;
  } catch (error) {
    console.warn('[SyncView] detectDivergence failed:', error);
    divergenceSummary.value = null;
    divergenceServerReachable.value = false;
  } finally {
    isDivergenceChecking.value = false;
  }
}

// LBDS-276: run the actionable part of the divergence repair (re-queue
// orphan creates + pull). The detector's dangling-category / local-only-
// field categories are surfaced by the diagnosis doc; this handler does not
// silently invent labels or fabricate server columns.
async function handleRepairDivergence() {
  if (isRepairingDivergence.value) return;
  isRepairingDivergence.value = true;
  try {
    const { requeued } = await syncController.repairDivergence();
    const toast = await toastController.create({
      message:
        requeued > 0
          ? t('sync.view.toast.requeueCompleted', { count: requeued })
          : t('sync.view.toast.syncCompleted'),
      duration: 2500,
      color: 'success',
    });
    await toast.present();
    await handleDiagnoseDivergence();
  } catch (error) {
    const msg = error instanceof Error ? error.message: t('sync.view.errors.generic');
    const toast = await toastController.create({ message: msg, duration: 4000, color: 'danger' });
    await toast.present();
  } finally {
    isRepairingDivergence.value = false;
  }
}

async function runFixSequence() {
  isFixing.value = true;
  try {
    fixStatus.value = t('sync.view.fix.updatingStatus');
    await refreshStatus();
    await syncController.pullFromServer();

    fixStatus.value = t('sync.view.fix.syncingAll');
    await syncController.fullSyncAndSave();
    await refreshStatus();
    const seqError = syncController.getSyncError();
    if (seqError) throw new Error(seqError);

    if (pendingChanges.value > 0 || activeConflictDiffs.value.length > 0) {
      fixStatus.value = t('sync.view.fix.repairing');
      await startRepair();
    } else {
      const toast = await toastController.create({
        message: t('sync.syncview.message7'),
        duration: 2000,
        color: 'success',
      });
      await toast.present();
    }
  } catch (error) {
      const reason = error instanceof Error ? `: ${error.message}` : '';
    const toast = await toastController.create({
      message: t('sync.view.fix.failedStep', {
        step: fixStatus.value,
        reason: reason,
      }),
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

function navigateToConnections() {
  void router.push({ name: 'SyncSettingsPage' });
}

async function refreshSyncConfig() {
  syncEnabled.value = await isSyncEnabled();
  const url = await getSyncServerUrl();
  hasServerUrl.value = url.trim().length > 0;
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
  await refreshSyncConfig();
  if (!authController.getIsAuthenticated()) return;

  await refreshStatus();
});
// End Life cycle

// Computed
const isAuthenticated = computed(() => authController.getIsAuthenticated());
// LBDS-289: sync is only "configured" when BOTH the opt-in flag is
// true AND a server URL is set. The /sync page uses this to show a
// gate card with a button straight to /settings/connections (the
// menu item) instead of the regular sync UI.
const syncEnabled = ref(false);
const hasServerUrl = ref(false);
const syncConfigured = computed(() => syncEnabled.value && hasServerUrl.value);
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
  if (authenticated) {
    await refreshStatus();
  }
  await refreshSyncConfig();
});
// End Watch

// LBDS-289: re-check sync config whenever the user navigates here from
// elsewhere (most importantly from /settings/connections after they
// sync). The component itself is reused across navigations, so onMounted
// would not fire on a back-navigation — we watch the route path.
watch(
  () => router.currentRoute.value.fullPath,
  () => {
    void refreshSyncConfig();
  },
);
</script>

<style scoped>
.sync-disabled {
  opacity: 0.45;
  pointer-events: none;
  user-select: none;
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
