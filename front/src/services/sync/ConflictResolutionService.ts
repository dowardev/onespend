import { syncApiService } from './SyncApiService';
import type { SyncConflictItem, SyncConflictResolution, SyncItemData } from '../syncService';
import db from '@/db/OneSpendDB';

const CONFIG_KEY = 'sync_conflicts';

export interface ConflictResolvedInfo {
  entityType: string;
  sync_id: string;
  resolution: 'client' | 'server' | 'merge';
  server_data?: SyncItemData;
}

class ConflictStore {
  private conflicts: Array<{ entityType: string; item: SyncConflictItem; resolvedAt: number }> = [];
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  private async ensureLoaded() {
    if (this.loaded) return;
    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }
    this.loadingPromise = (async () => {
      try {
        const stored = await db.config.get(CONFIG_KEY);
        if (stored?.value && Array.isArray(stored.value)) {
          this.conflicts = stored.value as any[];
        }
        this.loaded = true;
      } catch {
        this.loaded = true;
      }
    })();
    await this.loadingPromise;
    this.loadingPromise = null;
  }

  private async persist() {
    try {
      await db.config.put({ id: CONFIG_KEY, value: this.conflicts });
    } catch (e) {
      console.warn('[ConflictStore] Failed to persist conflicts:', e);
    }
  }

  async add(params: { entityType: string; item: SyncConflictItem }): Promise<void> {
    await this.ensureLoaded();
    const { entityType, item } = params;
    this.conflicts.push({ entityType, item, resolvedAt: Date.now() });
    if (this.conflicts.length > 100) {
      this.conflicts = this.conflicts.slice(-100);
    }
    await this.persist();
  }

  async getAll(): Promise<Array<{ entityType: string; item: SyncConflictItem; resolvedAt: number }>> {
    await this.ensureLoaded();
    return [...this.conflicts];
  }

  async clear(): Promise<void> {
    this.conflicts = [];
    await this.persist();
  }

  async getCount(): Promise<number> {
    await this.ensureLoaded();
    return this.conflicts.length;
  }
}

const conflictStore = new ConflictStore();

export class ConflictResolutionService {
  getStore(): ConflictStore {
    return conflictStore;
  }

  async handleConflicts(
    conflicts: Record<string, SyncConflictItem[]>,
    onConflictResolved?: (info: ConflictResolvedInfo) => Promise<void>,
  ): Promise<void> {
    interface BatchEntry {
      resolution: {
        entity_type: string;
        entity_id: string;
        resolution: string;
        client_data?: Record<string, unknown>;
      };
      server_data?: SyncItemData;
      sync_id: string;
      entityType: string;
    }

    const batchEntries: BatchEntry[] = [];

    for (const [entityType, items] of Object.entries(conflicts)) {
      for (const item of items) {
        const resolution = this.resolveAuto(entityType, item);
        await conflictStore.add({ entityType, item });
        if (resolution) {
          batchEntries.push({
            resolution,
            server_data: item.server_data,
            sync_id: item.sync_id,
            entityType,
          });
        }
      }
    }

    if (batchEntries.length === 0) return;

    try {
      const response = await syncApiService.resolveConflictsBatch({
        resolutions: batchEntries.map((e) => e.resolution),
      });

      if (!response.ok) {
        console.error('[ConflictResolutionService] Batch resolve failed:', response.statusText);
        for (const entry of batchEntries) {
          try {
            await syncApiService.resolveConflict({
              body: {
                entity_type: entry.resolution.entity_type,
                entity_id: entry.resolution.entity_id,
                resolution: entry.resolution.resolution,
                client_data: entry.resolution.client_data,
              },
            });
            if (onConflictResolved && entry.resolution.resolution === 'server' && entry.server_data) {
              await onConflictResolved({
                entityType: entry.entityType,
                sync_id: entry.sync_id,
                resolution: entry.resolution.resolution as 'server' | 'client' | 'merge',
                server_data: entry.server_data,
              });
            }
          } catch {
            console.error('[ConflictResolutionService] Fallback resolve failed for:', entry.sync_id);
          }
        }
        return;
      }

      const result = await response.json();
      const failedIds = new Set((result.errors || []).map((e: any) => e.entity_id));

      if (result.errors?.length) {
        console.warn('[ConflictResolutionService] Some conflicts failed in batch:', result.errors);
      }

      if (onConflictResolved) {
        for (const entry of batchEntries) {
          if (!failedIds.has(entry.resolution.entity_id) && entry.resolution.resolution === 'server' && entry.server_data) {
            await onConflictResolved({
              entityType: entry.entityType,
              sync_id: entry.sync_id,
              resolution: entry.resolution.resolution as 'server' | 'client' | 'merge',
              server_data: entry.server_data,
            });
          }
        }
      }
    } catch (error) {
      console.error('[ConflictResolutionService] Batch resolve failed:', error);
    }
  }

  resolveAuto(entityType: string, item: SyncConflictItem): SyncConflictResolution {
    const serverUpdatedAtRaw = item.server_data?.updated_at;
    const clientUpdatedAtRaw = item.client_data?.updated_at;

    if (!serverUpdatedAtRaw || !clientUpdatedAtRaw) {
      return {
        entity_type: entityType,
        entity_id: item.sync_id,
        resolution: 'server',
        client_data: item.client_data,
      };
    }

    const serverUpdatedAt = serverUpdatedAtRaw < 1e12 ? serverUpdatedAtRaw * 1000 : serverUpdatedAtRaw;
    const clientUpdatedAt = clientUpdatedAtRaw < 1e12 ? clientUpdatedAtRaw * 1000 : clientUpdatedAtRaw;

    if (clientUpdatedAt > serverUpdatedAt) {
      return {
        entity_type: entityType,
        entity_id: item.sync_id,
        resolution: 'client',
        client_data: item.client_data,
      };
    }

    return {
      entity_type: entityType,
      entity_id: item.sync_id,
      resolution: 'server',
    };
  }
}

export const conflictResolutionService = new ConflictResolutionService();
