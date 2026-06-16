import { syncQueueDb } from '@/db/controllers/syncQueueDb';
import { deadLetterQueueDb } from '@/db/controllers/deadLetterQueueDb';
import { suppliersDb } from '@/db/controllers/suppliersDb';
import { supplierProductsDb } from '@/db/controllers/supplierProductsDb';
import { accountsDb } from '@/db/controllers/accountsDb';
import { recurringRecordsDb } from '@/db/controllers/recurringRecordsDb';
import { budgetEntriesDb } from '@/db/controllers/budgetEntriesDb';
import { budgetProvidersDb } from '@/db/controllers/budgetProvidersDb';
import { budgetProviderProductsDb } from '@/db/controllers/budgetProviderProductsDb';
import { recurringRecordProductsDb } from '@/db/controllers/recurringRecordProductsDb';
import db from '@/db/OneSpendDB';
import { syncApiService, AuthExpiredError } from './SyncApiService';
import { syncLockService } from './SyncLockService';
import { conflictResolutionService } from './ConflictResolutionService';
import pendingAttachmentsService from '../pendingAttachmentsService';
import attachmentService from '../attachmentService';
import type {
  SupplierRow,
  RecurringRecordRow,
  DeadLetterItem,
} from '@/db/types';
import type {
  SyncItem,
  SyncItemData,
  SyncResult,
  SyncConflictItem,
  ServerSyncResponse,
} from '../syncService';
import type { ConflictResolvedInfo } from './ConflictResolutionService';

const LAST_SYNC_KEY = 'last_sync';
const FULL_SYNC_ETAG_KEY = 'full_sync_etag';
const CHUNK_SIZE = 50;

export class SyncQueueService {
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private firstQueueTime: number | null = null;
  private static readonly DEBOUNCE_MS = 100;
  private static readonly MAX_DEBOUNCE_MS = 2000;
  onAuthExpired: (() => void) | null = null;
  onOnline: (() => void) | null = null;
  private _isOnline = true;

  setOnline(online: boolean) {
    this._isOnline = online;
  }

  private async getQueue(): Promise<SyncItem[]> {
    const items = await syncQueueDb.getAll();
    return items.map((item) => ({
      id: item.id,
      entityType: item.entityType,
      operation: item.operation as 'create' | 'update' | 'delete',
      data: item.data,
      timestamp: item.timestamp,
      retryCount: item.retryCount,
      lastError: item.lastError,
      nextRetryAt: item.nextRetryAt,
    }));
  }

  private async addOrUpdateQueueItem(item: Omit<SyncItem, 'timestamp' | 'retryCount'>): Promise<void> {
    const existing = await syncQueueDb.getById({ id: item.id });

    if (existing) {
      if (existing.operation === 'create' && item.operation === 'delete') {
        await this.removeFromQueue({ id: item.id });
        return;
      }

      if (item.operation === 'delete') {
        await syncQueueDb.put({
          entry: {
            ...existing,
            operation: 'delete',
            data: item.data,
            timestamp: Date.now(),
            retryCount: 0,
          },
        });
      } else {
        await syncQueueDb.put({
          entry: {
            ...existing,
            data: item.data,
            timestamp: Date.now(),
            retryCount: 0,
          },
        });
      }
    } else {
      await syncQueueDb.put({
        entry: {
          id: item.id,
          entityType: item.entityType,
          operation: item.operation,
          data: item.data,
          timestamp: Date.now(),
          retryCount: 0,
        },
      });
    }
  }

  private async removeFromQueue(params: { id: string }): Promise<void> {
    const { id } = params;
    await syncQueueDb.delete({ id });
  }

  async queueOperation(item: Omit<SyncItem, 'timestamp' | 'retryCount'>): Promise<void> {
    await this.addOrUpdateQueueItem(item);

    if (this._isOnline) {
      if (this.firstQueueTime === null) {
        this.firstQueueTime = Date.now();
      }

      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }

      const elapsed = Date.now() - this.firstQueueTime;
      const remaining = Math.max(0, SyncQueueService.MAX_DEBOUNCE_MS - elapsed);
      const delay = Math.min(SyncQueueService.DEBOUNCE_MS, remaining);

      this.debounceTimeout = setTimeout(() => {
        this.firstQueueTime = null;
        this.debounceTimeout = null;
        this.processQueue().catch((error) => {
          if (error instanceof AuthExpiredError) return;
          console.error('Queue processing failed:', error);
        });
      }, delay);
    }
  }

  private async getChunkItemIds(chunk: Record<string, SyncItemData[]>): Promise<string[]> {
    const ids: string[] = [];
    for (const items of Object.values(chunk)) {
      for (const item of items) {
        const id = (item as Record<string, unknown>).id;
        if (id) ids.push(String(id));
      }
    }
    return ids;
  }

  private chunkQueueData(
    data: Record<string, SyncItemData[]>,
    chunkSize: number,
  ): Record<string, SyncItemData[]>[] {
    const allItems: Array<{ entityType: string; item: SyncItemData }> = [];
    for (const [entityType, items] of Object.entries(data)) {
      for (const item of items) {
        allItems.push({ entityType, item });
      }
    }

    const chunks: Array<Record<string, SyncItemData[]>> = [];
    for (let i = 0; i < allItems.length; i += chunkSize) {
      const chunkItems = allItems.slice(i, i + chunkSize);
      const chunk: Record<string, SyncItemData[]> = {
        account: [],
        budget_provider: [],
        budget_provider_product: [],
        budget_entry: [],
        recurring_record: [],
        recurring_record_product: [],
        supplier: [],
        supplier_product: [],
      };
      for (const { entityType, item } of chunkItems) {
        chunk[entityType].push(item);
      }
      chunks.push(chunk);
    }
    return chunks;
  }

  private buildIdQueue(allIds: string[], processedIds: string[]): string[] {
    const processed = new Set(processedIds);
    return allIds.filter((id) => !processed.has(id));
  }

  private async applyBackoffToIds(ids: string[], errorMsg: string, skipIncrements = false): Promise<void> {
    if (ids.length === 0) return;
    const existingItems = await syncQueueDb.getByIds({ ids });
    const updated = existingItems
      .filter((item): item is NonNullable<typeof item> => item != null)
      .map((existing) => {
        const backoff = Math.min(1000 * Math.pow(2, existing.retryCount), 60000);
        return {
          ...existing,
          retryCount: skipIncrements ? existing.retryCount : existing.retryCount + 1,
          lastError: errorMsg,
          nextRetryAt: Date.now() + backoff + Math.random() * 1000,
        };
      });
    if (updated.length > 0) {
      await syncQueueDb.bulkPut({ entries: updated });
    }
  }

  private async updateLocalRecordsWithMysqlIds(
    results: Record<string, Record<string, Array<{ sync_id: string; id?: number | null }>>>,
  ): Promise<void> {
    const allProductIds: Map<string, number> = new Map();
    for (const [_status, entityMap] of Object.entries(results)) {
      for (const [entityType, ids] of Object.entries(entityMap)) {
        if (
          (entityType === 'supplier_product' || entityType === 'recurring_record_product')
          && Array.isArray(ids)
        ) {
          for (const idEntry of ids) {
            if (idEntry.sync_id && idEntry.id) {
              allProductIds.set(idEntry.sync_id, idEntry.id);
            }
          }
        }
      }
    }

    for (const [_status, entityMap] of Object.entries(results)) {
      for (const [entityType, ids] of Object.entries(entityMap)) {
        if (entityType !== 'supplier') continue;
        if (!Array.isArray(ids)) continue;

        const syncIds = ids.map((e) => e.sync_id).filter(Boolean) as string[];
        if (syncIds.length === 0) continue;

        const existingList = await db.suppliers.bulkGet(syncIds);
        const updatedEntries: SupplierRow[] = [];
        for (const existing of existingList) {
          if (!existing) continue;
          const idEntry = ids.find((e) => e.sync_id === existing.sync_id);
          if (!idEntry || !idEntry.id) continue;

          const updatedEntry: SupplierRow = {
            ...existing,
            serverId: idEntry.id,
            syncedAt: Date.now(),
          };

          if (existing.products && Array.isArray(existing.products)) {
            updatedEntry.products = existing.products.map((product) => {
              const productServerId = allProductIds.get(product.sync_id || '');
              if (productServerId) {
                return { ...product, serverId: productServerId, syncedAt: Date.now() };
              }
              return product;
            });
          }

          updatedEntries.push(updatedEntry);
        }
        if (updatedEntries.length > 0) {
          await suppliersDb.bulkPut({ entries: updatedEntries });
        }
      }
    }

    for (const [_status, entityMap] of Object.entries(results)) {
      for (const [entityType, ids] of Object.entries(entityMap)) {
        if (entityType !== 'recurring_record') continue;
        if (!Array.isArray(ids)) continue;

        const syncIds = ids.map((e) => e.sync_id).filter(Boolean) as string[];
        if (syncIds.length === 0) continue;

        const existingList = await db.recurringRecords.bulkGet(syncIds);
        const updatedEntries: RecurringRecordRow[] = [];
        for (const existing of existingList) {
          if (!existing) continue;
          const idEntry = ids.find((e) => e.sync_id === existing.sync_id);
          if (!idEntry || !idEntry.id) continue;

          const updatedEntry: RecurringRecordRow = {
            ...existing,
            serverId: idEntry.id,
            syncedAt: Date.now(),
          };

          if (existing.products && Array.isArray(existing.products)) {
            updatedEntry.products = existing.products.map((product) => {
              const productServerId = allProductIds.get(product.sync_id || '');
              if (productServerId) {
                return { ...product, serverId: productServerId, syncedAt: Date.now() };
              }
              return product;
            });
          }

          updatedEntries.push(updatedEntry);
        }
        if (updatedEntries.length > 0) {
          await recurringRecordsDb.bulkPut({ entries: updatedEntries });
        }
      }
    }
  }

  private async processPendingAttachments() {
    if (!this._isOnline) return;

    const pending = await pendingAttachmentsService.getAllPendingAttachments();

    for (const attachment of pending) {
      try {
        const files = attachment.files.map((f) =>
          pendingAttachmentsService.base64ToFile(f.data, f.name, f.type),
        );
        const uploadFn = attachment.entityType === 'providers'
          ? attachmentService.uploadProviderAttachments
          : attachmentService.uploadAttachments;
        await uploadFn(attachment.entitySyncId, files);
        await pendingAttachmentsService.removePendingAttachment(attachment.entitySyncId, attachment.entityType);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const notFoundMsg = attachment.entityType === 'providers' ? 'Provider not found' : 'Entry not found';
        if (errorMessage.includes(notFoundMsg)) {
          await pendingAttachmentsService.removePendingAttachment(attachment.entitySyncId, attachment.entityType);
        }
      }
    }
  }

  async processQueue(): Promise<SyncResult | null> {
    if (!this._isOnline) {
      return null;
    }

    const lockAcquired = await syncLockService.acquire({ timeoutMs: 0 });
    if (!lockAcquired) {
      return null;
    }

    const queue = await this.getQueue();
    if (queue.length === 0) {
      syncLockService.release();
      return null;
    }

    const now = Date.now();
    const zombieIds: string[] = [];
    const zombieEntries: DeadLetterItem[] = [];
    const queuedItems: SyncItem[] = [];

    try {
      for (const item of queue) {
        if (item.retryCount >= 5) {
          zombieEntries.push({
            entityType: item.entityType,
            operation: item.operation,
            entityId: item.id,
            data: item.data,
            errorCount: item.retryCount,
            lastError: item.lastError || 'Max retries exceeded',
            createdAt: item.timestamp,
            failedAt: now,
          });
          zombieIds.push(item.id);
          continue;
        }

        if (item.nextRetryAt && item.nextRetryAt > now) {
          continue;
        }

        queuedItems.push(item);
      }

      if (zombieIds.length > 0) {
      try {
        await deadLetterQueueDb.bulkAdd({ entries: zombieEntries });
        await syncQueueDb.bulkDelete({ ids: zombieIds });
      } catch (dlqError) {
        console.error('Failed to move entries to DLQ, keeping in queue:', dlqError);
      }
      }

      if (queuedItems.length === 0) {
        syncLockService.release();
        return null;
      }

      const allData: Record<string, SyncItemData[]> = {
        account: [],
        budget_provider: [],
        budget_provider_product: [],
        budget_entry: [],
        recurring_record: [],
        recurring_record_product: [],
        supplier: [],
        supplier_product: [],
      };

      for (const item of queuedItems) {
        const formattedItem: SyncItemData & { id: string; updated_at: number } = {
          id: item.id,
          updated_at: item.timestamp,
          ...item.data,
        };

        if (item.operation === 'delete') {
          formattedItem._deleted = true;
        }

        allData[item.entityType].push(formattedItem);
      }

      const hasItems = Object.values(allData).some((arr) => arr.length > 0);
      if (!hasItems) {
        syncLockService.release();
        return null;
      }

      const dataChunks = this.chunkQueueData(allData, CHUNK_SIZE);
      let finalResult: SyncResult | null = null;
      let allChunksSucceeded = true;
      const allQueuedIds: string[] = queuedItems.map((item) => item.id);
      const successfullyProcessedIds: string[] = [];

      const CONCURRENCY = 3;

      for (let i = 0; i < dataChunks.length; i += CONCURRENCY) {
        const batch = dataChunks.slice(i, i + CONCURRENCY);

        const results = await Promise.allSettled(
          batch.map(async (chunk) => {
            const chunkItemIds = await this.getChunkItemIds(chunk);

            let response: Response;
            try {
              response = await syncApiService.merge({ data: chunk as unknown as Record<string, unknown[]> });
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Unknown error';
              await this.applyBackoffToIds(chunkItemIds, msg);
              throw error;
            }

            if (response.status === 401) {
              await this.applyBackoffToIds(chunkItemIds, 'HTTP 401: Authentication expired', true);
              if (this.onAuthExpired) this.onAuthExpired();
              throw new AuthExpiredError();
            }

            if (!response.ok) {
              const pendingIds = this.buildIdQueue(allQueuedIds, successfullyProcessedIds);
              await this.applyBackoffToIds(pendingIds, `HTTP ${response.status}: ${response.statusText}`);
              return { ok: false as const };
            }

            const result = await response.json();

            if (result.success && result.results) {
              await this.updateLocalRecordsWithMysqlIds(result.results);

              if (result.conflicts && Object.keys(result.conflicts).length > 0) {
                await conflictResolutionService.handleConflicts(result.conflicts, async (info: ConflictResolvedInfo) => {
                  if (info.resolution === 'server' && info.server_data) {
                    await this.bulkUpsertByEntityType(info.entityType, [
                      { item: info.server_data, syncId: info.sync_id },
                    ]);
                  }
                });
              }

              const succeededIds = new Set<string>();
              const successStatuses = ['created', 'updated', 'deleted', 'skipped'];
              for (const status of successStatuses) {
                const entityMap = (result.results as Record<string, Record<string, Array<{ sync_id: string } | string>>>)[status];
                if (!entityMap) continue;
                for (const entityItems of Object.values(entityMap)) {
                  if (!Array.isArray(entityItems)) continue;
                  for (const item of entityItems) {
                    const id = typeof item === 'string' ? item : item.sync_id;
                    if (id) succeededIds.add(id);
                  }
                }
              }

              const errorIds = new Set<string>();
              if (result.errors) {
                for (const entityErrors of Object.values(result.errors as Record<string, Array<{ sync_id?: string }>>)) {
                  if (!Array.isArray(entityErrors)) continue;
                  for (const err of entityErrors) {
                    if (err.sync_id) errorIds.add(err.sync_id);
                  }
                }
              }

              const toRemove = chunkItemIds.filter((id) => succeededIds.has(id) && !errorIds.has(id));
              return { ok: true as const, toRemove, result };
            }

            return { ok: false as const };
          }),
        );

        for (const settled of results) {
          if (settled.status === 'rejected') {
            if (settled.reason instanceof AuthExpiredError) {
              syncLockService.release();
              return null;
            }
            allChunksSucceeded = false;
            continue;
          }

          if (!settled.value.ok) {
            allChunksSucceeded = false;
            continue;
          }

          if (settled.value.toRemove && settled.value.toRemove.length > 0) {
            await syncQueueDb.bulkDelete({ ids: settled.value.toRemove });
            successfullyProcessedIds.push(...settled.value.toRemove);
          }

          if (settled.value.result && (!finalResult || settled.value.result.serverTime)) {
            finalResult = settled.value.result;
          }
        }
      }

      if (allChunksSucceeded && finalResult?.serverTime) {
        localStorage.setItem(LAST_SYNC_KEY, String(finalResult.serverTime));
      }

      await this.processPendingAttachments();

      return finalResult || null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await this.applyBackoffToIds(queuedItems.map((i) => i.id), msg);
      throw error;
    } finally {
      syncLockService.release();
    }
  }

  private async bulkDeleteByEntityType(entityType: string, syncIds: string[]): Promise<void> {
    if (syncIds.length === 0) return;
    switch (entityType) {
      case 'account':
        await accountsDb.bulkDeleteBySyncIds({ syncIds });
        break;
      case 'budget_entry':
        await budgetEntriesDb.bulkDeleteBySyncIds({ syncIds });
        break;
      case 'budget_provider':
        await budgetProvidersDb.bulkDeleteBySyncIds({ syncIds });
        break;
      case 'budget_provider_product':
        await budgetProviderProductsDb.bulkDeleteBySyncIds({ syncIds });
        break;
      case 'recurring_record':
        await recurringRecordsDb.bulkDeleteBySyncIds({ syncIds });
        break;
      case 'supplier':
        await suppliersDb.bulkDeleteBySyncIds({ syncIds });
        break;
      case 'supplier_product':
        await supplierProductsDb.bulkDeleteBySyncIds({ syncIds });
        break;
    }
  }

  private async bulkUpsertByEntityType(entityType: string, items: Array<{ item: SyncItemData; syncId: string }>): Promise<void> {
    const syncIds = items.map((i) => i.syncId);

    const dbAccessors: Record<string, { bulkGet: (params: { syncIds: string[] }) => Promise<any[]>; bulkPut: (params: { entries: any[] }) => Promise<any> }> = {
      account: accountsDb,
      budget_entry: budgetEntriesDb,
      budget_provider: budgetProvidersDb,
      budget_provider_product: budgetProviderProductsDb,
      recurring_record: recurringRecordsDb,
      recurring_record_product: recurringRecordProductsDb,
      supplier: suppliersDb,
      supplier_product: supplierProductsDb,
    };

    const dbAccessor = dbAccessors[entityType];
    if (!dbAccessor) return;

    const existing = await dbAccessor.bulkGet({ syncIds });
    const existingMap = new Map<string, any>();
    for (const ex of existing) {
      if (ex) existingMap.set(ex.sync_id, ex);
    }

    const toPut: any[] = [];
    for (const { item, syncId } of items) {
      const ex = existingMap.get(syncId);
      const serverUpdatedAt = item.updated_at as number | undefined;
      if (ex && ex.syncedAt && serverUpdatedAt && ex.syncedAt >= serverUpdatedAt) {
        continue;
      }
      toPut.push({ ...ex, ...item, sync_id: syncId, syncedAt: Date.now() });
    }

    if (toPut.length > 0) await dbAccessor.bulkPut({ entries: toPut });
  }

  async saveChangesToLocalDb(
    changes: Record<string, SyncItemData[]>,
    onChangesSaved?: (changes: Record<string, SyncItemData[]>) => Promise<void>,
  ): Promise<{ failedEntityTypes: string[] }> {
    const queueItems = await syncQueueDb.getAll();
    const queuedSyncIds = new Set<string>(queueItems.map((q) => q.id));
    const failedEntityTypes: string[] = [];

    for (const [entityType, items] of Object.entries(changes)) {
      if (!Array.isArray(items) || items.length === 0) continue;

      const deleteIds: string[] = [];
      const upsertItems: Array<{ item: SyncItemData; syncId: string }> = [];

      for (const item of items) {
        const syncId = (item.sync_id || item.id) as string;
        if (!syncId) continue;
        if (queuedSyncIds.has(syncId)) continue;
        if (item._deleted) {
          deleteIds.push(syncId);
        } else {
          upsertItems.push({ item, syncId });
        }
      }

      try {
        if (deleteIds.length > 0) {
          await this.bulkDeleteByEntityType(entityType, deleteIds);
        }
        if (upsertItems.length > 0) {
          await this.bulkUpsertByEntityType(entityType, upsertItems);
        }
      } catch (error) {
        console.error(`[SyncQueueService] Failed to save batch for ${entityType}:`, error);
        failedEntityTypes.push(entityType);
      }
    }

    if (onChangesSaved) {
      await onChangesSaved(changes);
    }

    return { failedEntityTypes };
  }

  async pullChanges(
    onChangesSaved?: (changes: Record<string, SyncItemData[]>) => Promise<void>,
    options?: { types?: string[] },
  ): Promise<Record<string, SyncItemData[]>> {
    if (!this._isOnline) {
      throw new Error('Cannot pull changes while offline');
    }

    const lastSync = localStorage.getItem(LAST_SYNC_KEY) || '0';
    const MAX_PULL_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_PULL_RETRIES; attempt++) {
      try {
        let cursor: string | null = null;
        const allChanges: Record<string, SyncItemData[]> = {};
        let serverTime = 0;

        do {
          const response = await syncApiService.getChanges({ lastSync, cursor, types: options?.types });

          if (response.status === 401) {
            if (this.onAuthExpired) this.onAuthExpired();
            throw new AuthExpiredError();
          }

          if (!response.ok) {
            cursor = null;
            break;
          }

          const result = (await response.json()) as ServerSyncResponse;

          if (result.changes) {
            for (const [type, items] of Object.entries(result.changes)) {
              allChanges[type] = [...(allChanges[type] || []), ...items];
            }
          }

          cursor = result.cursor ?? null;
          if (result.serverTime && result.serverTime > serverTime) {
            serverTime = result.serverTime;
          }
        } while (cursor);

        if (Object.keys(allChanges).length > 0) {
          const { failedEntityTypes } = await this.saveChangesToLocalDb(allChanges, onChangesSaved);
          if (serverTime && failedEntityTypes.length === 0) {
            localStorage.setItem(LAST_SYNC_KEY, String(serverTime));
          } else if (failedEntityTypes.length > 0) {
            console.warn(`[SyncQueueService] Not advancing last_sync due to failed entity types: ${failedEntityTypes.join(', ')}`);
          }
          return allChanges;
        }

        return {};
      } catch (error) {
        if (error instanceof AuthExpiredError) throw error;
        lastError = error as Error;
        if (attempt < MAX_PULL_RETRIES - 1) {
          const backoff = 1000 * Math.pow(2, attempt);
          console.warn(`[SyncQueueService] Pull attempt ${attempt + 1} failed, retrying in ${backoff}ms`, lastError);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    }

    console.warn('[SyncQueueService] All pull retries failed, falling back to fullSync', lastError);
    const cachedEtag = localStorage.getItem(FULL_SYNC_ETAG_KEY);
    const fullResponse = await syncApiService.fullSync({ types: options?.types, etag: cachedEtag });

    if (fullResponse.status === 304) {
      console.warn('[SyncQueueService] fullSync returned 304 — no changes since last full sync');
      return {};
    }

    if (fullResponse.status === 401) {
      if (this.onAuthExpired) this.onAuthExpired();
      throw new AuthExpiredError();
    }

    if (!fullResponse.ok) {
      throw new Error(`Failed to pull changes: ${fullResponse.statusText}`);
    }

    const responseEtag = fullResponse.headers.get('ETag');
    if (responseEtag) {
      localStorage.setItem(FULL_SYNC_ETAG_KEY, responseEtag);
    }

    const fullResult = (await fullResponse.json()) as ServerSyncResponse;

    if (fullResult.data || fullResult.changes) {
      const changes = fullResult.data || fullResult.changes || {};
      const { failedEntityTypes } = await this.saveChangesToLocalDb(changes, onChangesSaved);
      if (fullResult.serverTime && failedEntityTypes.length === 0) {
        localStorage.setItem(LAST_SYNC_KEY, String(fullResult.serverTime));
      } else if (failedEntityTypes.length > 0) {
        console.warn(`[SyncQueueService] Not advancing last_sync due to failed entity types: ${failedEntityTypes.join(', ')}`);
      }
      return changes;
    }

    return {};
  }

  async getConflicts(): Promise<Record<string, SyncConflictItem[]>> {
    const changes = await this.pullChanges();

    const conflicts: Record<string, SyncConflictItem[]> = {};
    for (const [entityType, items] of Object.entries(changes)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item._deleted) continue;
          if (item._conflict) {
            conflicts[entityType] = conflicts[entityType] || [];
            conflicts[entityType].push(item as SyncConflictItem);
          }
        }
      }
    }

    return conflicts;
  }

  async getQueueCount(): Promise<number> {
    return syncQueueDb.count();
  }

  async getQueueItems(): Promise<SyncItem[]> {
    return this.getQueue();
  }

  async clearQueue(): Promise<void> {
    await syncQueueDb.clear();
  }

  getLastSyncTime(): number {
    if (typeof window === 'undefined') return 0;
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    return lastSync ? parseInt(lastSync, 10) : 0;
  }
}

export const syncQueueService = new SyncQueueService();
