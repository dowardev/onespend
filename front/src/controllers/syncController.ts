import { ref, onMounted, onUnmounted } from 'vue';
import { syncService, type SyncItem, type SyncResult } from '@/services/syncService';

class SyncController {
  private isOnline = ref(syncService.getOnlineStatus());
  private isSyncing = ref(false);
  private pendingChanges = ref(0);
  private lastSyncTime = ref(0);
  private syncError = ref<string | null>(null);

  private cleanupOnlineListener: (() => void) | null = null;

  constructor() {
    onMounted(() => {
      this.cleanupOnlineListener = syncService.onOnlineChange((online) => {
        this.isOnline.value = online;
        if (online) {
          this.syncNow();
        }
      });

      this.pendingChanges.value = syncService.getQueueCount();
      this.lastSyncTime.value = syncService.getLastSyncTime();
    });

    onUnmounted(() => {
      if (this.cleanupOnlineListener) {
        this.cleanupOnlineListener();
      }
    });
  }

  getIsOnline() {
    return this.isOnline.value;
  }

  getIsSyncing() {
    return this.isSyncing.value;
  }

  getPendingChanges() {
    return this.pendingChanges.value;
  }

  getLastSyncTime() {
    return this.lastSyncTime.value;
  }

  getSyncError() {
    return this.syncError.value;
  }

  async syncNow(): Promise<boolean> {
    if (!this.isOnline.value) {
      this.syncError.value = 'Cannot sync while offline';
      return false;
    }

    this.isSyncing.value = true;
    this.syncError.value = null;

    try {
      await syncService.processQueue();
      this.lastSyncTime.value = syncService.getLastSyncTime();
      this.pendingChanges.value = syncService.getQueueCount();
      return true;
    } catch (error) {
      this.syncError.value = error instanceof Error ? error.message : 'Sync failed';
      return false;
    } finally {
      this.isSyncing.value = false;
    }
  }

  async pullFromServer() {
    if (!this.isOnline.value) {
      this.syncError.value = 'Cannot pull while offline';
      return;
    }

    this.isSyncing.value = true;
    this.syncError.value = null;

    try {
      await syncService.pullChanges();
      this.lastSyncTime.value = syncService.getLastSyncTime();
    } catch (error) {
      this.syncError.value = error instanceof Error ? error.message : 'Pull failed';
    } finally {
      this.isSyncing.value = false;
    }
  }

  async fullSyncAndSave() {
    if (!this.isOnline.value) {
      this.syncError.value = 'Cannot full sync while offline';
      return;
    }

    this.isSyncing.value = true;
    this.syncError.value = null;

    try {
      await syncService.fullSyncAndSave();
      this.lastSyncTime.value = syncService.getLastSyncTime();
      this.pendingChanges.value = syncService.getQueueCount();
    } catch (error) {
      this.syncError.value = error instanceof Error ? error.message : 'Full sync failed';
    } finally {
      this.isSyncing.value = false;
    }
  }

  getQueue(): SyncItem[] {
    const queue = localStorage.getItem('sync_queue');
    return queue ? JSON.parse(queue) : [];
  }

  getQueueCount(): number {
    return syncService.getQueueCount();
  }

  getLastSyncTimestamp(): number {
    return syncService.getLastSyncTime();
  }

  clearQueue(): void {
    syncService.clearQueue();
    this.pendingChanges.value = 0;
  }

  async processQueue(): Promise<SyncResult | null> {
    return await syncService.processQueue();
  }
}

export { SyncController };
export type { SyncItem, SyncResult };
