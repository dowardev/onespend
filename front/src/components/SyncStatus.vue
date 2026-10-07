<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <div class="sync-status" :class="{ 'has-pending': pendingChanges > 0, 'is-offline': !isOnline }">
    <ion-icon :icon="syncIcon" :class="{ spinning: isSyncing }"></ion-icon>
    <span v-if="!isOnline" class="status-text offline">{{ t('sync.view.status.offline') }}</span>
    <span v-else-if="isSyncing" class="status-text syncing">{{ t('sync.view.syncing') }}</span>
    <span v-else-if="pendingChanges > 0" class="status-text pending">
      {{ pendingChanges }} {{ t('sync.view.status.pending', { count: pendingChanges }) }}
    </span>
    <span v-else-if="lastSyncTime > 0" class="status-text synced">
      {{ t('sync.view.status.synced', { time: formatTime({ timestamp: lastSyncTime }) }) }}
    </span>
    <span v-else class="status-text">{{ t('sync.view.status.never') }}</span>
  </div>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import {
  cloudOfflineOutline,
  syncOutline,
  checkmarkCircleOutline,
  timeOutline,
} from 'ionicons/icons';
import { SyncController } from '@/controllers/syncController';

// 2. Controllers / Composables
import { useLocale } from '@/composables/useLocale';

// 3. Components
// (none)

// 4. Interface and types imports
// (none)

// 5. Main (props, emits, etc.)
// (no props or emits — presentational component)

// 6. Vars and const
const syncController = SyncController;
const { t } = useLocale();

// 7. Watch
// (none)

// 8. Computed
const isOnline = computed(() => syncController.getIsOnline());
const isSyncing = computed(() => syncController.getIsSyncing());
const pendingChanges = computed(() => syncController.getPendingChanges());
const lastSyncTime = computed(() => syncController.getLastSyncDisplayTime());

const syncIcon = computed(() => {
  if (!isOnline.value) return cloudOfflineOutline;
  if (isSyncing.value) return syncOutline;
  if (pendingChanges.value > 0) return timeOutline;
  return checkmarkCircleOutline;
});

// 9. OnMounted
// (none)

// 10. Functions (named parameters pattern)
function formatTime(params: { timestamp: number }): string {
  const { timestamp } = params;
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (diff < 60000) return t('sync.view.status.justNow');
  if (diff < 3600000) return t('sync.view.status.minutesAgo', { m: minutes });
  if (diff < 86400000) return t('sync.view.status.hoursAgo', { h: hours });
  return t('sync.view.status.daysAgo', { d: days });
}
</script>

<style scoped>
.sync-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  padding: 4px 8px;
  border-radius: 12px;
  background: rgba(var(--ion-background-color-rgb), 0.8);
}

.sync-status ion-icon {
  font-size: 1.1rem;
}

.status-text {
  font-size: 0.75rem;
}

.offline {
  color: var(--ion-color-warning);
}

.syncing {
  color: var(--ion-color-primary);
}

.pending {
  color: var(--ion-color-tertiary);
}

.synced {
  color: var(--ion-color-success);
}

.spinning {
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
</style>