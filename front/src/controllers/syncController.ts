// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ref } from 'vue';
import { syncService, type SyncItem, type SyncItemData, type SyncResult, type SyncConflictItem } from '@/services/syncService';
import { deadLetterQueueDb } from '@/db/controllers/deadLetterQueueDb';
import { syncQueueDb } from '@/db/controllers/syncQueueDb';
import { syncQueueService } from '@/services/sync/SyncQueueService';
import { useBudgetDayStore } from '@/stores/budgetDayStore';
import type { DeadLetterItem } from '@/db/types';
import db from '@/db/OneSpendDB';
import { detectDivergence, type DivergenceReport, type LocalDbLike, type SnapshotServiceLike } from '@/services/sync/SyncDivergenceDetector';
import { syncApiService } from '@/services/sync/SyncApiService';
import { isSyncEnabled, readSyncConfig } from '@/services/sync/syncConfig';

/**
 * DLQ items can carry a `data` field that was stored before the queue was
 * hardened against non-structured-cloneable values (e.g. when a class
 * instance slipped into the payload before the DLQ put). Re-queueing the
 * item now hits IndexedDB's `put` and throws `DataCloneError`, which
 * blocks the user from draining the DLQ at all.
 *
 * Round-tripping the data through JSON forces every value to be a
 * structured-cloneable primitive, plain array, or plain object (Maps,
 * Sets, Date instances, functions, and class instances with non-cloneable
 * properties are stripped or stringified). The server-side `SyncProcessor`
 * receives the same shape it was always meant to consume — that contract
 * is plain JSON.
 *
 * If the original data cannot even be JSON-stringified (a circular
 * reference, etc.), we log a warning with the entity id and fall back to
 * an empty payload so the user can at least clear the DLQ. We do NOT
 * silently delete the item from the DLQ on its own.
 */
function sanitizeQueueData<T>(params: { item: string; entityType: string; data: T }): T {
  const { item, entityType, data } = params;
  try {
    return JSON.parse(JSON.stringify(data)) as T;
  } catch (error) {
    console.warn(
      `[syncController] DLQ item ${entityType}/${item} had non-JSON data; sanitizing to {}.`,
      error,
    );
    return {} as T;
  }
}

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
  // LBDS-289: client-clock timestamp of the last successful sync.
  // Separate from lastSyncTime (server cursor) so the menu label can
  // show 'Synced just now' even when the server clock is on a
  // different timezone. Must be a ref so SyncStatus's computed
  // re-evaluates after a sync.
  private lastSyncDisplayTime = ref(0);
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
    this.lastSyncDisplayTime.value = syncService.getLastSyncDisplayTime();
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

  /**
   * LBDS-289: client-clock timestamp for the menu label. The
   * SyncQueueService cursor (server time, may be on a different
   * timezone) stays the source of truth for the next incremental
   * pull; the UI just wants 'hace un momento' to mean 'hace un
   * momento for the user, not for the server'.
   */
  getLastSyncDisplayTime(): number {
    return this.lastSyncDisplayTime.value;
  }

  getSyncError() {
    return this.syncError.value;
  }

  /**
   * Reconciles a possibly stale offline flag (missed 'online' event on real
   * devices) with the live `navigator.onLine` value before refusing work.
   */
  private refreshOnline(): boolean {
    this.isOnline.value = syncQueueService.refreshOnlineStatus();
    return this.isOnline.value;
  }

  /**
   * LBDS-289: short-circuit every user-initiated sync action when the
   * user has not enabled sync in Settings. Sets `syncError` to a
   * user-friendly message and returns false so callers can render the
   * Sync Settings link instead of an unhandled exception. Without this,
   * pulling the trigger on `Sincronizar ahora` while sync is off would
   * surface a SyncDisabledError from deep inside the queue.
   */
  private async ensureSyncEnabled(): Promise<boolean> {
    // LBDS-289: gate on BOTH the opt-in flag AND a non-empty server
    // URL. The flag-only check let background retries (processQueue,
    // pending attachments drain) start work, acquire the lock, and
    // only fail on the first API call — which then surfaced as a red
    // 'Sync is disabled in Settings' banner instead of the /sync gate
    // card the user sees. The UI uses `syncConfigured` (flag AND url)
    // for its disabled state, so the gate has to match.
    const cfg = await readSyncConfig();
    if (cfg.enabled && cfg.hasServerUrl) return true;
    // LBDS-289: the action buttons on /sync are disabled when sync is
    // off, so this branch should not be reachable from normal UI. If
    // a sync somehow does get triggered (race condition, debug entry
    // point, scheduled retry with empty URL, etc.) we just bail
    // without flashing a red banner. The gate card on /sync already
    // explains the situation.
    return false;
  }

  async syncNow(): Promise<boolean> {
    if (!(await this.ensureSyncEnabled())) return false;
    if (!this.refreshOnline()) {
      this.syncError.value = 'Cannot sync while offline';
      return false;
    }

    this.isSyncing.value = true;
    this.syncError.value = null;

    // LBDS-244: el issue del push es un canal por corrida, no estado global,
    // para que la pull no dependa de que el push haya salido limpio. Se declara
    // fuera del try para que el catch pueda conservarlo si la pull también falla.
    let issue: string | null = null;

    try {
      // LBDS-276: requeue orphan creates (rows with no `serverId` that the
      // user created locally but that the sync queue never picked up). This
      // makes "Sincronizar ahora" complete — previously the primary button
      // silently did nothing for those rows because the user had to find
      // `Reparar sincronización` to enqueue them.
      // LBDS-289: this call must be INSIDE the try so the `finally` block
      // always resets `isSyncing`. Before this fix, if
      // reconstructQueueForUnsyncedCreates threw, the SyncStatus label
      // stayed stuck on 'Sincronizando...' forever because `isSyncing = true`
      // was set BEFORE the try-catch.
      await syncQueueService.reconstructQueueForUnsyncedCreates();
      await syncService.processQueue({
        onIssue: (message) => { issue = message; },
      });

      // LBDS-244: la pull corre siempre, aunque el push tenga un issue; si no,
      // mientras un item quede trabado el usuario deja de recibir cambios
      // remotos.
      await syncService.pullChanges(async () => {
        await this.rebuildBudgetDaySnapshot();
      });
      this.lastSyncTime.value = syncService.getLastSyncTime();
    this.lastSyncDisplayTime.value = syncService.getLastSyncDisplayTime();

      if (issue) {
        this.syncError.value = issue;
        this.pendingChanges.value = await syncService.getQueueCount();
        return false;
      }
      this.pendingChanges.value = await syncService.getQueueCount();
      return true;
    } catch (error) {
      // LBDS-244: si la pull falla después de un issue del push, el issue es
      // más específico y accionable; sólo caemos al error de la pull cuando no
      // hubo issue.
      this.syncError.value = issue ?? (error instanceof Error ? error.message : 'Sync failed');
      return false;
    } finally {
      this.isSyncing.value = false;
    }
  }

  async pullFromServer() {
    if (!(await this.ensureSyncEnabled())) return;
    if (!this.refreshOnline()) {
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
    this.lastSyncDisplayTime.value = syncService.getLastSyncDisplayTime();
    } catch (error) {
      this.syncError.value = error instanceof Error ? error.message : 'Pull failed';
    } finally {
      this.isSyncing.value = false;
    }
  }

  async fullSyncAndSave() {
    if (!(await this.ensureSyncEnabled())) return;
    if (!this.refreshOnline()) {
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
    this.lastSyncDisplayTime.value = syncService.getLastSyncDisplayTime();
      this.pendingChanges.value = await syncService.getQueueCount();
    } catch (error) {
      this.syncError.value = error instanceof Error ? error.message : 'Full sync failed';
    } finally {
      this.isSyncing.value = false;
    }
  }

  async repairSync(params: { onProgress: (p: RepairProgress) => void }): Promise<RepairResult> {
    const { onProgress } = params;

    if (!(await this.ensureSyncEnabled())) {
      onProgress({ step: 'error', message: 'La sincronización está desactivada', percent: 0 });
      return { ok: false, created: 0, updated: 0, errors: 1 };
    }
    if (!this.refreshOnline()) {
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
    this.lastSyncDisplayTime.value = syncService.getLastSyncDisplayTime();
        this.pendingChanges.value = await syncService.getQueueCount();
        return { ok: true, created: 0, updated: 0, errors: 0 };
      }

      onProgress({ step: 'pulling_final', message: 'Actualizando estado final...', percent: 85 });
      await syncService.pullChanges();

      this.lastSyncTime.value = syncService.getLastSyncTime();
    this.lastSyncDisplayTime.value = syncService.getLastSyncDisplayTime();
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

  /**
   * LBDS-276: run a local ↔ server divergence diagnostic. Returns a typed
   * report used by both the dev console (`window.__devDb.detectDivergence()`)
   * and the Sync screen's "Diagnostico de divergencias" item.
   *
   * The classes covered are listed in
   * `docs/plans/2026-09-21-lbds-276-sync-divergence-diagnosis.md`.
   */
  async detectDivergence(): Promise<DivergenceReport> {
    return detectDivergence({
      api: syncApiService as unknown as SnapshotServiceLike,
      db: db as unknown as LocalDbLike,
    });
  }

  /**
   * LBDS-276: repair the actionable parts of a divergence report. The
   * detector flags four actionable categories — `missingOnServer` (the
   * server never received the row), `missingOnLocal` (the client hasn't
   * pulled it down yet), `versionMismatch` and `serverTombstoneUnapplied`.
   * This method addresses the first two by:
   *
   * - Running the existing `reconstructQueueForUnsyncedCreates` to push
   *   every local row that has no `serverId` and was never queued.
   * - Triggering a pull so every `missingOnLocal` row lands locally.
   *
   * The remaining categories (`danglingCategoryIds`, `localOnlyFields`)
   * are not auto-repairable; the diagnosis doc records the user action.
   */
  async repairDivergence(): Promise<{ requeued: number }> {
    const { created } = await syncQueueService.reconstructQueueForUnsyncedCreates();
    if (created > 0) {
      await syncService.processQueue();
    }
    // Pull down the rows the local side is missing. The new cursor logic
    // (LBDS-276 class 3) prevents the pull from skipping the gap, so the
    // second sync in a row converges instead of churning.
    await syncService.pullChanges();
    this.lastSyncTime.value = syncService.getLastSyncTime();
    this.lastSyncDisplayTime.value = syncService.getLastSyncDisplayTime();
    this.pendingChanges.value = await syncService.getQueueCount();
    return { requeued: created };
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
    const data = sanitizeQueueData({ item: item.entityId, entityType: item.entityType, data: item.data });
    await syncQueueDb.put({
      entry: {
        id: item.entityId,
        entityType: item.entityType,
        operation: item.operation,
        data,
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
      data: sanitizeQueueData({ item: item.entityId, entityType: item.entityType, data: item.data }),
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
