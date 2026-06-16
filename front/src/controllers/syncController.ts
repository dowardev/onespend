import { ref } from 'vue';
import { syncService, type SyncItem, type SyncItemData, type SyncResult, type SyncConflictItem } from '@/services/syncService';
import { deadLetterQueueDb } from '@/db/controllers/deadLetterQueueDb';
import { syncQueueDb } from '@/db/controllers/syncQueueDb';
import type { DeadLetterItem } from '@/db/types';

class SyncController {
  private isOnline = ref(syncService.getOnlineStatus());
  private isSyncing = ref(false);
  private pendingChanges = ref(0);
  private lastSyncTime = ref(0);
  private syncError = ref<string | null>(null);

  private cleanupOnlineListener: (() => void) | null = null;
  private started = false;

  constructor() {
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.cleanupOnlineListener = syncService.onOnlineChange((online) => {
      this.isOnline.value = online;
    });

    syncService.getQueueCount().then(count => {
      this.pendingChanges.value = count;
    });
    this.lastSyncTime.value = syncService.getLastSyncTime();
  }

  stop() {
    if (this.cleanupOnlineListener) {
      this.cleanupOnlineListener();
      this.cleanupOnlineListener = null;
    }
    this.started = false;
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
		await syncService.pullChanges();
      this.lastSyncTime.value = syncService.getLastSyncTime();
      this.pendingChanges.value = await syncService.getQueueCount();
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
      this.pendingChanges.value = await syncService.getQueueCount();
    } catch (error) {
      this.syncError.value = error instanceof Error ? error.message : 'Full sync failed';
    } finally {
      this.isSyncing.value = false;
    }
  }

  async getQueue(): Promise<SyncItem[]> {
    return await syncService.getQueueItems();
  }

  async getQueueCount(): Promise<number> {
    return await syncService.getQueueCount();
  }

  getLastSyncTimestamp(): number {
    return syncService.getLastSyncTime();
  }

  async clearQueue(): Promise<void> {
    await syncService.clearQueue();
    this.pendingChanges.value = 0;
  }

  async processQueue(): Promise<SyncResult | null> {
    return await syncService.processQueue();
  }

  async getConflicts(): Promise<Record<string, SyncConflictItem[]>> {
    return syncService.getConflicts();
  }

  getConflictStore() {
    return syncService.getConflictStore();
  }

  async retryDlqItem(params: { item: DeadLetterItem }): Promise<void> {
    const { item } = params;
    await syncQueueDb.put({
      entry: {
        id: item.entityId,
        entityType: item.entityType,
        operation: item.operation,
        data: item.data,
        timestamp: Date.now(),
        retryCount: 0,
      },
    });
    if (item.id != null) {
      await deadLetterQueueDb.delete({ id: item.id });
    }
  }

  async retryDlqAll(params: { items: DeadLetterItem[] }): Promise<void> {
    const { items } = params;
    const entries = items.map((item) => ({
      id: item.entityId,
      entityType: item.entityType,
      operation: item.operation,
      data: item.data,
      timestamp: Date.now(),
      retryCount: 0,
    }));
    await syncQueueDb.bulkPut({ entries });
    const ids = items.map((item) => item.id).filter((id): id is number => id != null);
    if (ids.length > 0) {
      await deadLetterQueueDb.bulkDelete({ ids });
    }
  }

  async getDlqItems(): Promise<DeadLetterItem[]> {
    return deadLetterQueueDb.getAll();
  }

  async getDlqCount(): Promise<number> {
    return deadLetterQueueDb.count();
  }

  async clearDlq(): Promise<void> {
    await deadLetterQueueDb.clear();
  }

  async getResolvedConflicts(): Promise<any[]> {
    const { syncApiService } = await import('@/services/sync/SyncApiService');
    const response = await syncApiService.getResolvedConflicts();
    if (!response.ok) return [];
    const data = await response.json();
    return data.conflicts ?? [];
  }

  async getActiveConflicts(): Promise<Array<{ entityType: string; sync_id: string; diffs: import('@/utils/conflictDiff').FieldDiff[]; client_data: SyncItemData; server_data?: SyncItemData }>> {
    const conflicts = await syncService.getConflicts();
    const { computeConflictDiff } = await import('@/utils/conflictDiff');
    const result: Array<{ entityType: string; sync_id: string; diffs: import('@/utils/conflictDiff').FieldDiff[]; client_data: SyncItemData; server_data?: SyncItemData }> = [];

    for (const [entityType, items] of Object.entries(conflicts)) {
      for (const item of items) {
        result.push({
          entityType,
          sync_id: item.sync_id,
          diffs: computeConflictDiff({ server_data: item.server_data, client_data: item.client_data }),
          client_data: item.client_data,
          server_data: item.server_data,
        });
      }
    }

    return result;
  }
}

const syncControllerInstance = new SyncController();
syncControllerInstance.start();

export { syncControllerInstance as SyncController };
export type { SyncItem, SyncResult };
