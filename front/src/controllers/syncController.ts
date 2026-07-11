import { ref } from 'vue';
import { syncService, type SyncItem, type SyncItemData, type SyncResult, type SyncConflictItem } from '@/services/syncService';
import { deadLetterQueueDb } from '@/db/controllers/deadLetterQueueDb';
import { syncQueueDb } from '@/db/controllers/syncQueueDb';
import { syncQueueService } from '@/services/sync/SyncQueueService';
import { useBudgetDayStore } from '@/stores/budgetDayStore';
import type { DeadLetterItem } from '@/db/types';

export type RepairStep =
  | 'pulling_server'
  | 'scanning_local'
  | 'reconstructing_queue'
  | 'pushing_changes'
  | 'pulling_final'
  | 'done'
  | 'error';

export interface RepairProgress {
  step: RepairStep;
  message: string;
  percent: number;
}

export interface RepairResult {
  ok: boolean;
  created: number;
  updated: number;
  errors: number;
}

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
      await syncService.pullChanges(async () => {
        await this.rebuildBudgetDaySnapshot();
      });
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
      await syncService.pullChanges(async () => {
        await this.rebuildBudgetDaySnapshot();
      });
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
      await syncService.fullSyncAndSave(async () => {
        await this.rebuildBudgetDaySnapshot();
      });
      this.lastSyncTime.value = syncService.getLastSyncTime();
      this.pendingChanges.value = await syncService.getQueueCount();
    } catch (error) {
      this.syncError.value = error instanceof Error ? error.message : 'Full sync failed';
    } finally {
      this.isSyncing.value = false;
    }
  }

  async repairSync(params: { onProgress: (p: RepairProgress) => void }): Promise<RepairResult> {
    const { onProgress } = params;

    if (!this.isOnline.value) {
      onProgress({ step: 'error', message: 'No se puede reparar sin conexión', percent: 0 });
      return { ok: false, created: 0, updated: 0, errors: 1 };
    }

    this.isSyncing.value = true;
    this.syncError.value = null;

    try {
      onProgress({ step: 'pulling_server', message: 'Obteniendo datos del servidor...', percent: 10 });
      await syncService.pullChanges();

      onProgress({ step: 'scanning_local', message: 'Escaneando base local...', percent: 35 });
      const { created } = await syncQueueService.reconstructQueueForUnsyncedCreates();

      if (created > 0) {
        onProgress({
          step: 'reconstructing_queue',
          message: `Reconstruida cola con ${created} elemento(s)`,
          percent: 55,
        });
        await new Promise(r => setTimeout(r, 300));

        onProgress({
          step: 'pushing_changes',
          message: `Subiendo ${created} elemento(s)...`,
          percent: 70,
        });
        await syncService.processQueue();
      } else {
        onProgress({ step: 'done', message: 'No se encontraron elementos pendientes', percent: 100 });
        this.lastSyncTime.value = syncService.getLastSyncTime();
        this.pendingChanges.value = await syncService.getQueueCount();
        return { ok: true, created: 0, updated: 0, errors: 0 };
      }

      onProgress({ step: 'pulling_final', message: 'Actualizando estado final...', percent: 85 });
      await syncService.pullChanges();

      this.lastSyncTime.value = syncService.getLastSyncTime();
      this.pendingChanges.value = await syncService.getQueueCount();

      onProgress({
        step: 'done',
        message: `¡Reparación completa! ${created} elemento(s) sincronizado(s)`,
        percent: 100,
      });

      return { ok: true, created, updated: 0, errors: 0 };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error en reparación';
      this.syncError.value = msg;
      onProgress({ step: 'error', message: msg, percent: 0 });
      return { ok: false, created: 0, updated: 0, errors: 1 };
    } finally {
      this.isSyncing.value = false;
    }
  }

  private async rebuildBudgetDaySnapshot() {
    try {
      const dayStore = useBudgetDayStore();
      await dayStore.loadBudgetForDate({ date: dayStore.selectedDate });
    } catch (e) {
      console.warn('[SyncController] Failed to rebuild budget day snapshot:', e);
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
    const { conflictResolutionService } = await import('@/services/sync/ConflictResolutionService');
    const stored = await conflictResolutionService.getStore().getAll();
    const { computeConflictDiff } = await import('@/utils/conflictDiff');
    const result: Array<{ entityType: string; sync_id: string; diffs: import('@/utils/conflictDiff').FieldDiff[]; client_data: SyncItemData; server_data?: SyncItemData }> = [];

    for (const { entityType, item } of stored) {
      result.push({
        entityType,
        sync_id: item.sync_id,
        diffs: computeConflictDiff({ server_data: item.server_data, client_data: item.client_data }),
        client_data: item.client_data,
        server_data: item.server_data,
      });
    }

    return result;
  }

  async resolveConflict(params: {
    entity_type: string;
    entity_id: string;
    resolution: 'client' | 'server' | 'merge';
    client_data?: Record<string, unknown>;
  }): Promise<{ ok: boolean; error?: string }> {
    const { entity_type, entity_id, resolution, client_data } = params;
    try {
      const { syncApiService } = await import('@/services/sync/SyncApiService');
      const response = await syncApiService.resolveConflict({
        body: { entity_type, entity_id, resolution, client_data },
      });

      if (!response.ok) {
        let errorMsg: string | undefined;
        try {
          const errData = await response.json();
          const firstErrors = Object.values(errData.errors ?? {}) as string[][];
          if (firstErrors.length > 0 && firstErrors[0].length > 0) {
            errorMsg = firstErrors[0][0];
          }
        } catch {
          // ignore parse errors
        }
        return { ok: false, error: errorMsg };
      }

      const data = await response.json();

      if (data.entity) {
        await syncService.applyServerItem({
          entityType: entity_type,
          item: data.entity,
          syncId: entity_id,
        });
      }

      await syncQueueDb.delete({ id: entity_id });

      const { conflictResolutionService } = await import('@/services/sync/ConflictResolutionService');
      await conflictResolutionService.getStore().remove({
        entityType: entity_type,
        sync_id: entity_id,
      });

      try {
        await syncService.pullChanges();
      } catch {
        // pull is best-effort after resolution
      }

      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}

const syncControllerInstance = new SyncController();
syncControllerInstance.start();

export { syncControllerInstance as SyncController };
export type { SyncItem, SyncResult };
