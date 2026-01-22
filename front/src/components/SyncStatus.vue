<template>
  <div class="sync-status" :class="{ 'has-pending': pendingChanges > 0, 'is-offline': !isOnline }">
    <ion-icon :icon="syncIcon" :class="{ spinning: isSyncing }"></ion-icon>
    <span v-if="!isOnline" class="status-text offline">Offline</span>
    <span v-else-if="isSyncing" class="status-text syncing">Sincronizando...</span>
    <span v-else-if="pendingChanges > 0" class="status-text pending">
      {{ pendingChanges }} pendiente{{ pendingChanges !== 1 ? 's' : '' }}
    </span>
    <span v-else-if="lastSyncTime > 0" class="status-text synced">
      Sincronizado {{ formatTime(lastSyncTime) }}
    </span>
    <span v-else class="status-text">Sin sincronizar</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import { cloudOfflineOutline, syncOutline, checkmarkCircleOutline, timeOutline } from 'ionicons/icons';
import { SyncController } from '@/controllers/syncController';

const syncController = new SyncController();

const isOnline = computed(() => syncController.getIsOnline());
const isSyncing = computed(() => syncController.getIsSyncing());
const pendingChanges = computed(() => syncController.getPendingChanges());
const lastSyncTime = computed(() => syncController.getLastSyncTime());

const syncIcon = computed(() => {
  if (!isOnline.value) return cloudOfflineOutline;
  if (isSyncing.value) return syncOutline;
  if (pendingChanges.value > 0) return timeOutline;
  return checkmarkCircleOutline;
});

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
  return `hace ${Math.floor(diff / 86400000)}d`;
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
