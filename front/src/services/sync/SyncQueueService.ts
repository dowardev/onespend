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
import { toApiFormat } from './entityMappers';
import { performanceMonitor } from '@/utils/performanceMonitor';
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
import type { SyncEntityType } from '@/db/types';
import type { ConflictResolvedInfo } from './ConflictResolutionService';

function debug(...args: unknown[]): void {
  if (import.meta.env.DEV) { console.log(...args); }
}

const LAST_SYNC_KEY = 'last_sync';
const FULL_SYNC_ETAG_KEY = 'full_sync_etag';
const CHUNK_SIZE = 50;

export async function resolveFk(map: Map<number, string>, value: unknown): Promise<string | null> {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return map.get(n) ?? null;
}

export async function resolveAccountId(map: Map<number, string>, value: unknown): Promise<string | null> {
  if (value == null) return null;
  if (typeof value === 'string' && value.includes('-') && isNaN(Number(value))) {
    return value;
  }
  const n = Number(value);
  if (Number.isFinite(n)) return map.get(n) ?? null;
  if (typeof value === 'string' && !isNaN(Number(value))) {
    return map.get(Number(value)) ?? null;
  }
  return null;
}

async function mapServerItemToRow(params: {
  entityType: string;
  item: SyncItemData;
  base: any;
  accountIdMap: Map<number, string>;
  providerIdMap: Map<number, string>;
  supplierProductIdMap: Map<number, string>;
  recurringRecordIdMap: Map<number, string>;
}): Promise<any> {
  const { entityType, item, base, accountIdMap, providerIdMap, supplierProductIdMap, recurringRecordIdMap } = params;
  const i = item as any;
  const r: any = { ...base };
  switch (entityType) {
    case 'account': {
      r.sync_id = base.sync_id || i.id;
      r.serverId = i.id_server ? Number(i.id_server) : (base.serverId ?? null);
      r.name = String(i.name ?? base.name ?? '');
      r.initialBalance = Number(i.initial_balance ?? base.initialBalance ?? 0);
      r.version = Number(i.version) || base.version || 0;
      r.createdAt = i.created_at ? Number(i.created_at) : (base.createdAt ?? Date.now());
      r.updatedAt = i.updated_at ? Number(i.updated_at) : (base.updatedAt ?? Date.now());
      return r;
    }
    case 'budget_entry': {
      r.sync_id = base.sync_id || i.id;
      r.serverId = i.id_server ? Number(i.id_server) : (base.serverId ?? null);
      r.name = String(i.name ?? base.name ?? '');
      r.amount = Number(i.amount ?? base.amount ?? 0);
      r.date = i.date ?? base.date ?? '';
      r.paymentType = String(i.payment_type ?? base.paymentType ?? 'cash');
      r.entryType = String(i.entry_type ?? base.entryType ?? 'egreso');
      r.accountId = await resolveAccountId(accountIdMap, i.account_id);
      r.supplierId = i.supplier_id ? String(i.supplier_id) : (base.supplierId ?? null);
      r.supplierName = i.supplier_name ? String(i.supplier_name) : (base.supplierName ?? '');
      r.status = String(i.status ?? base.status ?? 'active');
      r.version = Number(i.version) || base.version || 0;
      if (Array.isArray(i.groups)) {
        r.groups = await Promise.all(i.groups.map(async (g: any) => ({
          sync_id: g.sync_id || g.id,
          accountId: await resolveAccountId(accountIdMap, g.account_id),
          amount: Number(g.amount ?? 0),
        })));
      }
      r.createdAt = i.created_at ? Number(i.created_at) : (base.createdAt ?? Date.now());
      r.updatedAt = i.updated_at ? Number(i.updated_at) : (base.updatedAt ?? Date.now());
      return r;
    }
    case 'budget_provider': {
      r.sync_id = base.sync_id || i.id;
      r.serverId = i.id_server ? Number(i.id_server) : (base.serverId ?? null);
      r.name = String(i.name ?? base.name ?? '');
      r.date = i.date ?? base.date ?? '';
      r.accountId = await resolveAccountId(accountIdMap, i.account_id);
      r.supplierId = i.supplier_id ? String(i.supplier_id) : (base.supplierId ?? null);
      r._supplierId = i._supplier_id ? String(i._supplier_id) : (base._supplierId ?? null);
      r._supplierName = String(i._supplier_name ?? base._supplierName ?? '');
      r.estimated = Number(i.estimated ?? base.estimated ?? 0);
      r.efectivo = Number(i.efectivo ?? base.efectivo ?? 0);
      r.tarjeta = Number(i.tarjeta ?? base.tarjeta ?? 0);
      r.credito = Number(i.credito ?? base.credito ?? 0);
      r.notes = String(i.notes ?? base.notes ?? '');
      r.visited = !!i.visited;
      r.status = String(i.status ?? base.status ?? 'active');
      r.version = Number(i.version) || base.version || 0;
      r.createdAt = i.created_at ? Number(i.created_at) : (base.createdAt ?? Date.now());
      r.updatedAt = i.updated_at ? Number(i.updated_at) : (base.updatedAt ?? Date.now());
      return r;
    }
    case 'budget_provider_product': {
      r.sync_id = base.sync_id || i.id;
      r.serverId = i.id_server ? Number(i.id_server) : (base.serverId ?? null);
      r.providerSyncId = (await resolveFk(providerIdMap, i.budget_provider_id)) ?? '';
      r.supplierProductId = await resolveFk(supplierProductIdMap, i.supplier_product_id);
      r.productName = String(i.product_name ?? i.name ?? base.productName ?? '');
      r.productPrice = Number(i.product_price ?? i.price ?? base.productPrice ?? 0);
      r.quantity = Number(i.quantity ?? base.quantity ?? 1);
      r.status = String(i.status ?? base.status ?? 'active');
      r.version = Number(i.version) || base.version || 0;
      r.createdAt = i.created_at ? Number(i.created_at) : (base.createdAt ?? Date.now());
      r.updatedAt = i.updated_at ? Number(i.updated_at) : (base.updatedAt ?? Date.now());
      return r;
    }
    case 'supplier': {
      r.sync_id = base.sync_id || i.id;
      r.serverId = i.id_server ? Number(i.id_server) : (base.serverId ?? null);
      r.name = String(i.name ?? base.name ?? '');
      r.version = Number(i.version) || base.version || 0;
      r.createdAt = i.created_at ? Number(i.created_at) : (base.createdAt ?? Date.now());
      r.updatedAt = i.updated_at ? Number(i.updated_at) : (base.updatedAt ?? Date.now());
      return r;
    }
    case 'supplier_product': {
      r.sync_id = base.sync_id || i.id;
      r.serverId = i.id_server ? Number(i.id_server) : (base.serverId ?? null);
      r.supplierId = base.supplierId || String(i.supplier_id ?? '');
      r.name = String(i.name ?? base.name ?? '');
      r.price = Number(i.price ?? base.price ?? 0);
      r.imageBase64 = i.image_base64 ?? base.imageBase64 ?? null;
      r.imageUrl = i.image_url ?? base.imageUrl ?? null;
      r.version = Number(i.version) || base.version || 0;
      r.createdAt = i.created_at ? Number(i.created_at) : (base.createdAt ?? Date.now());
      r.updatedAt = i.updated_at ? Number(i.updated_at) : (base.updatedAt ?? Date.now());
      return r;
    }
    case 'recurring_record': {
      r.sync_id = base.sync_id || i.id;
      r.serverId = i.id_server ? Number(i.id_server) : (base.serverId ?? null);
      r.name = String(i.name ?? base.name ?? '');
      r.amount = Number(i.amount ?? base.amount ?? 0);
      r.frequency = String(i.frequency ?? base.frequency ?? 'monthly');
      r.startDate = i.start_date ?? base.startDate ?? '';
      r.endDate = i.end_date ?? base.endDate ?? null;
      r.paymentType = String(i.payment_type ?? base.paymentType ?? 'cash');
      r.entryType = String(i.entry_type ?? base.entryType ?? 'egreso');
      r.accountId = await resolveAccountId(accountIdMap, i.account_id);
      r.version = Number(i.version) || base.version || 0;
      r.createdAt = i.created_at ? Number(i.created_at) : (base.createdAt ?? Date.now());
      r.updatedAt = i.updated_at ? Number(i.updated_at) : (base.updatedAt ?? Date.now());
      return r;
    }
    case 'recurring_record_product': {
      r.sync_id = base.sync_id || i.id;
      r.serverId = i.id_server ? Number(i.id_server) : (base.serverId ?? null);
      r.recurringRecordId = (await resolveFk(recurringRecordIdMap, i.recurring_record_id)) ?? '';
      r.name = String(i.name ?? base.name ?? '');
      r.amount = Number(i.amount ?? base.amount ?? 0);
      r.version = Number(i.version) || base.version || 0;
      r.createdAt = i.created_at ? Number(i.created_at) : (base.createdAt ?? Date.now());
      r.updatedAt = i.updated_at ? Number(i.updated_at) : (base.updatedAt ?? Date.now());
      return r;
    }
    default:
      return { ...base, ...i };
  }
}

export class SyncQueueService {
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private firstQueueTime: number | null = null;
  private static readonly DEBOUNCE_MS = 100;
  private static readonly MAX_DEBOUNCE_MS = 2000;
  private onlineListeners: Set<(online: boolean) => void> = new Set();
  private authExpiredListeners: Set<() => void> = new Set();
  private _isOnline = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this._isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private handleOnline() {
    this._isOnline = true;
    this.onlineListeners.forEach((listener) => listener(true));
  }

  private handleOffline() {
    this.cancelActiveRequests();
    this._isOnline = false;
    this.onlineListeners.forEach((listener) => listener(false));
  }

  onOnlineChange(callback: (online: boolean) => void): () => void {
    this.onlineListeners.add(callback);
    return () => this.onlineListeners.delete(callback);
  }

  onAuthExpired(callback: () => void): () => void {
    this.authExpiredListeners.add(callback);
    return () => this.authExpiredListeners.delete(callback);
  }

  private notifyAuthExpired(): void {
    this.authExpiredListeners.forEach((listener) => listener());
  }

  getOnlineStatus(): boolean {
    return this._isOnline;
  }

  async isAuthenticated(): Promise<boolean> {
    const { hasToken } = await import('@/services/tokenStorage');
    return hasToken();
  }

  getConflictStore() {
    return conflictResolutionService.getStore();
  }

  cancelActiveRequests() {
    syncApiService.cancelActiveRequests();
  }

  async applyServerItem(params: { entityType: string; item: SyncItemData; syncId: string }): Promise<void> {
    const { entityType, item, syncId } = params;
    await this.bulkUpsertByEntityType(entityType, [{ item, syncId }]);
  }

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
    debug('[SYNC-Q] addOrUpdate:', item.entityType, item.id, 'op:', item.operation, 'existing:', existing ? `op=${existing.operation} retry=${existing.retryCount} nextRetry=${existing.nextRetryAt ?? 'none'}` : 'none');

    if (existing) {
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
    debug('[SYNC-Q] queued:', item.entityType, item.id, 'op:', item.operation, 'online:', this._isOnline, 'queueCount:', await syncQueueDb.count());

    if (this._isOnline) {
      if (this.firstQueueTime === null) {
        this.firstQueueTime = Date.now();
      }

      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
        debug('[SYNC-Q] debounce clear — re-scheduling');
      }

      const elapsed = Date.now() - this.firstQueueTime;
      const remaining = Math.max(0, SyncQueueService.MAX_DEBOUNCE_MS - elapsed);
      const delay = Math.min(SyncQueueService.DEBOUNCE_MS, remaining);

      debug('[SYNC-Q] debounce scheduled in', delay, 'ms, isOnline:', this._isOnline);

      this.debounceTimeout = setTimeout(() => {
        this.firstQueueTime = null;
        this.debounceTimeout = null;
        debug('[SYNC-Q] debounce firing — calling processQueue');
        this.processQueue().catch((error) => {
          if (error instanceof AuthExpiredError) return;
          debug('Queue processing failed:', error);
        });
      }, delay);
    } else {
      debug('[SYNC-Q] offline — items waiting in queue');
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
    debug('[SYNC-PQ] start');
    if (!this._isOnline) {
      return null;
    }

    debug('[SYNC-PQ] acquiring lock...');
    const lockAcquired = await syncLockService.acquire({ timeoutMs: 0 });
    if (!lockAcquired) {
      return null;
    }
    debug('[SYNC-PQ] lock acquired');

    const zombieIds: string[] = [];
    const zombieEntries: DeadLetterItem[] = [];
    const queuedItems: SyncItem[] = [];

    try {
      const queue = await this.getQueue();
      debug('[SYNC-PQ] queue items:', queue.length, JSON.stringify(queue.map(q => ({ id: q.id, op: q.operation, retry: q.retryCount, nextRetry: q.nextRetryAt }))));
      if (queue.length === 0) {
        debug('[SYNC-PQ] queue empty');
        return null;
      }

      const now = Date.now();

      for (const item of queue) {
        if (item.retryCount >= 5) {
          debug('[SYNC-PQ] zombie (retry>=5):', item.id);
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
          const remaining = Math.round((item.nextRetryAt - now) / 1000);
          debug('[SYNC-PQ] skip (backoff):', item.id, 'nextRetry in', remaining, 's');
          continue;
        }

        queuedItems.push(item);
      }

      if (zombieIds.length > 0) {
        debug('[SYNC-PQ] moving zombies to DLQ:', zombieIds);
      try {
        await deadLetterQueueDb.bulkAdd({ entries: zombieEntries });
        await syncQueueDb.bulkDelete({ ids: zombieIds });
      } catch (dlqError) {
        if (import.meta.env.DEV) { console.error('Failed to move entries to DLQ, keeping in queue:', dlqError); }
      }
      }

      if (queuedItems.length === 0) {
        debug('[SYNC-PQ] no ready items');
        return null;
      }

      debug('[SYNC-PQ] ready items:', queuedItems.length, JSON.stringify(queuedItems.map(q => q.id)));

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
              this.notifyAuthExpired();
              throw new AuthExpiredError();
            }

            if (!response.ok) {
              debug('[SYNC-PQ] HTTP', response.status, response.statusText, 'for chunk ids', chunkItemIds);
              const pendingIds = this.buildIdQueue(allQueuedIds, successfullyProcessedIds);
              await this.applyBackoffToIds(pendingIds, `HTTP ${response.status}: ${response.statusText}`);
              return { ok: false as const };
            }

            const mergeResult = await response.json();

            if (import.meta.env.DEV) {
              console.log('[SYNC-PQ] chunk response:', JSON.stringify({
                success: mergeResult.success,
                serverTime: mergeResult.serverTime,
                created: mergeResult.results?.created ?? {},
                updated: mergeResult.results?.updated ?? {},
                deleted: mergeResult.results?.deleted ?? {},
                skipped: mergeResult.results?.skipped ?? {},
                errors: mergeResult.errors ?? mergeResult.results?.errors ?? {},
                conflicts: mergeResult.results?.conflicts ?? {},
              }));
            }

            if (mergeResult.success && mergeResult.results) {
              await this.updateLocalRecordsWithMysqlIds(mergeResult.results);

              // Bump version for newly created budget_entries (server uses version=1 after create)
              const createdBe = ((mergeResult.results?.created?.budget_entry ?? []) as Array<Record<string, unknown> | string>);
              for (const item of createdBe) {
                const syncId = typeof item === 'string' ? item : (item as Record<string, unknown>)?.sync_id as string;
                if (!syncId) continue;
                const row = await budgetEntriesDb.getBySyncId({ syncId });
                if (row && (!row.version || row.version < 1)) {
                  row.version = 1;
                  await budgetEntriesDb.put({ entry: row });
                }
              }

              const mergeConflicts = mergeResult.results?.conflicts ?? mergeResult.conflicts;
              if (mergeConflicts && Object.keys(mergeConflicts).length > 0) {
                await conflictResolutionService.handleConflicts(mergeConflicts, async (info: ConflictResolvedInfo) => {
                  if (info.resolution === 'server' && info.server_data) {
                    await this.bulkUpsertByEntityType(info.entityType, [
                      { item: info.server_data, syncId: info.sync_id },
                    ]);
                  }
                });
              }

              await this.reconcileLocalConflictsFromServer();

              const succeededIds = new Set<string>();
              const successStatuses = ['created', 'updated', 'deleted', 'skipped'];
              for (const status of successStatuses) {
                const entityMap = (mergeResult.results as Record<string, Record<string, Array<{ sync_id: string } | string>>>)[status];
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
              if (mergeResult.errors) {
                for (const entityErrors of Object.values(mergeResult.errors as Record<string, Array<{ sync_id?: string }>>)) {
                  if (!Array.isArray(entityErrors)) continue;
                  for (const err of entityErrors) {
                    if (err.sync_id) errorIds.add(err.sync_id);
                  }
                }
              }

              const toRemove = chunkItemIds.filter((id) => succeededIds.has(id) && !errorIds.has(id));
              return { ok: true as const, toRemove, result: mergeResult };
            }

            return { ok: false as const };
          }),
        );

        for (const settled of results) {
          if (settled.status === 'rejected') {
            if (settled.reason instanceof AuthExpiredError) {
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
            debug('[SYNC-PQ] removed from queue:', settled.value.toRemove);
            successfullyProcessedIds.push(...settled.value.toRemove);
          }

          if (settled.value.result && (!finalResult || settled.value.result.serverTime)) {
            finalResult = settled.value.result;
          }
        }
      }

      // Si last_sync era '0' (full sync), no avanzar para mantener comportamiento de full sync
      const beforeSync = localStorage.getItem(LAST_SYNC_KEY) || '0';
      const wasFullSyncBeforeProcess = beforeSync === '0';

      if (allChunksSucceeded && finalResult?.serverTime) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const serverTime = finalResult.serverTime;
        // Solo avanzar last_sync si NO era full sync
        if (!wasFullSyncBeforeProcess) {
          if (serverTime > nowSeconds + 300) {
            localStorage.setItem(LAST_SYNC_KEY, String(nowSeconds));
          } else if (serverTime > nowSeconds) {
            localStorage.setItem(LAST_SYNC_KEY, String(serverTime - 60));
          } else {
            localStorage.setItem(LAST_SYNC_KEY, String(serverTime));
          }
        }
      }

      await this.processPendingAttachments();

      const remainingCount = await syncQueueDb.count();
      debug('[SYNC-PQ] done. allChunksSucceeded:', allChunksSucceeded, 'remainingQueue:', remainingCount, 'finalResult:', finalResult ? 'ok' : 'null');

      return finalResult || null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await this.applyBackoffToIds(queuedItems.map((i) => i.id), msg);
      throw error;
    } finally {
      debug('[SYNC-PQ] lock released');
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

  async bulkUpsertByEntityType(entityType: string, items: Array<{ item: SyncItemData; syncId: string }>): Promise<void> {
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

    const accountIdMap = new Map<number, string>();
    const accounts = await accountsDb.getAll();
    for (const a of accounts) {
      if (a.serverId != null) accountIdMap.set(Number(a.serverId), a.sync_id);
    }

    const providerIdMap = new Map<number, string>();
    const providers = await budgetProvidersDb.getAll();
    for (const p of providers) {
      if (p.serverId != null) providerIdMap.set(Number(p.serverId), p.sync_id);
    }

    const supplierProductIdMap = new Map<number, string>();
    const sps = await supplierProductsDb.getAll();
    for (const sp of sps) {
      if (sp.serverId != null) supplierProductIdMap.set(Number(sp.serverId), sp.sync_id);
    }

    const recurringRecordIdMap = new Map<number, string>();
    const rrs = await recurringRecordsDb.getAll();
    for (const rr of rrs) {
      if (rr.serverId != null) recurringRecordIdMap.set(Number(rr.serverId), rr.sync_id);
    }

    const toPut: any[] = [];
    for (const { item, syncId } of items) {
      const ex = existingMap.get(syncId);
      const base: any = ex ? { ...ex } : {};
      const row = await mapServerItemToRow({ entityType, item, base, accountIdMap, providerIdMap, supplierProductIdMap, recurringRecordIdMap });
      if (!row) continue;
      row.sync_id = syncId;
      row.syncedAt = Date.now();
      if ((entityType === 'budget_entry' || entityType === 'budget_provider') && row.date) {
        row.date = String(row.date).substring(0, 10);
      }
      toPut.push(row);
    }

    if (toPut.length > 0) {
      await dbAccessor.bulkPut({ entries: toPut });
    }
  }

  async saveChangesToLocalDb(
    changes: Record<string, SyncItemData[]>,
    onChangesSaved?: (changes: Record<string, SyncItemData[]>) => Promise<void>,
  ): Promise<{ failedEntityTypes: string[] }> {
    const queueItems = await syncQueueDb.getAll();
    const queuedSyncIds = new Set<string>(queueItems.map((q) => q.id));
    const failedEntityTypes: string[] = [];

    const sortedEntityTypes = Object.keys(changes).sort((a, b) => {
      const order = ['account', 'supplier', 'budget_provider', 'recurring_record', 'budget_entry', 'budget_provider_product', 'supplier_product', 'recurring_record_product'];
      return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
    });

    for (const entityType of sortedEntityTypes) {
      const items = changes[entityType];
      if (!Array.isArray(items) || items.length === 0) continue;

      const deleteIds: string[] = [];
      const upsertItems: Array<{ item: SyncItemData; syncId: string }> = [];

      for (const item of items) {
        const syncId = (item.sync_id || item.id) as string;
        if (!syncId) continue;
        if (queuedSyncIds.has(syncId)) {
          continue;
        }
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

    let lastSync = localStorage.getItem(LAST_SYNC_KEY) || '0';
    const wasFullSync = lastSync === '0';
    // Prevent future timestamps (more than 5 minutes ahead)
    const now = Math.floor(Date.now() / 1000);
    if (parseInt(lastSync, 10) > now + 300) {
      console.warn('[SyncQueueService] last_sync is in the future, resetting to 0');
      lastSync = '0';
      localStorage.setItem(LAST_SYNC_KEY, '0');
    }
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
            this.notifyAuthExpired();
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
          // Si era full sync (last_sync=0) y trajo cambios, NO avanzar last_sync
          // Esto permite que el próximo sync también traiga todos los datos
          if (wasFullSync) {
            // No avanzamos last_sync, se mantiene en 0
          } else if (serverTime && failedEntityTypes.length === 0) {
            const now = Math.floor(Date.now() / 1000);
            if (serverTime <= now + 300) {
              localStorage.setItem(LAST_SYNC_KEY, String(serverTime));
            } else {
              localStorage.setItem(LAST_SYNC_KEY, String(serverTime - 60));
            }
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
      this.notifyAuthExpired();
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
      // Si era full sync y trajo cambios, NO avanzar last_sync
      if (wasFullSync) {
        // No avanzamos last_sync
      } else if (fullResult.serverTime && failedEntityTypes.length === 0) {
        const now = Math.floor(Date.now() / 1000);
        if (fullResult.serverTime <= now + 300) {
          localStorage.setItem(LAST_SYNC_KEY, String(fullResult.serverTime));
        } else {
          localStorage.setItem(LAST_SYNC_KEY, String(now));
        }
      } else if (failedEntityTypes.length > 0) {
        console.warn(`[SyncQueueService] Not advancing last_sync due to failed entity types: ${failedEntityTypes.join(', ')}`);
      }
      return changes;
    }

    return {};
  }

  private async reconcileLocalConflictsFromServer(): Promise<void> {
    try {
      const response = await syncApiService.getActiveConflicts({});
      if (!response.ok) return;

      const data = await response.json();
      const activeConflicts: Array<{ entity_type: string; entity_id: string }> = data.conflicts ?? [];

      const activeSet = new Set<string>();
      for (const conflict of activeConflicts) {
        activeSet.add(`${conflict.entity_type}:${conflict.entity_id}`);
      }

      const stored = await conflictResolutionService.getStore().getAll();
      for (const { entityType, item } of stored) {
        const key = `${entityType}:${item.sync_id}`;
        if (!activeSet.has(key)) {
          await conflictResolutionService.getStore().remove({
            entityType,
            sync_id: item.sync_id,
          });
        }
      }
    } catch {
      // Reconciliación best-effort: un fallo no debe romper la sync
    }
  }

  async getConflicts(): Promise<Record<string, SyncConflictItem[]>> {
    const response = await syncApiService.getActiveConflicts();
    if (!response.ok) return {};

    const data = await response.json();
    const conflicts: Record<string, SyncConflictItem[]> = {};

    const items = data.conflicts ?? [];
    for (const meta of items) {
      const payload = meta.conflict_data ?? {};
      const entityType = meta.entity_type;
      conflicts[entityType] = conflicts[entityType] || [];
      conflicts[entityType].push({
        sync_id: meta.entity_id ?? '',
        client_data: payload.client_data ?? {},
        server_data: payload.server_data ?? {},
        conflict_type: payload.conflict_type ?? 'semantic',
        overlapping_fields: payload.overlapping_fields ?? [],
        server_hash: payload.server_hash ?? '',
        client_hash: payload.client_hash ?? '',
      });
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

  async fullSyncAndSave(
    onChangesSaved?: (changes: Record<string, SyncItemData[]>) => Promise<void>,
  ): Promise<void> {
    performanceMonitor.startSyncMeasurement('fullSyncAndSave')
    try {
      if (!this._isOnline) {
        throw new Error('Cannot perform full sync while offline');
      }

      const { hasToken } = await import('@/services/tokenStorage');
      if (!(await hasToken())) {
        return;
      }

      try {
        await this.pullChanges(onChangesSaved);
        await this.processQueue();
      } catch (error) {
        if (error instanceof AuthExpiredError) {
          this.notifyAuthExpired();
          throw error;
        }
        throw error;
      }
    } finally {
      performanceMonitor.endSyncMeasurement('fullSyncAndSave')
    }
  }

  async reconstructQueueForUnsyncedCreates(): Promise<{ created: number }> {
    const queuedItems = await syncQueueDb.getAll();
    const queuedSyncIds = new Set(queuedItems.map(q => q.id));
    const now = Date.now();
    const toQueue: Array<{
      id: string;
      entityType: SyncEntityType;
      operation: 'create';
      data: SyncItemData;
      timestamp: number;
      retryCount: number;
    }> = [];

    const tables: Array<{
      getAll: () => Promise<any[]>;
      entityType: SyncEntityType;
    }> = [
      { getAll: () => accountsDb.getAll(), entityType: 'account' },
      { getAll: () => budgetEntriesDb.getAll(), entityType: 'budget_entry' },
      { getAll: () => budgetProvidersDb.getAll(), entityType: 'budget_provider' },
      { getAll: () => budgetProviderProductsDb.getAll(), entityType: 'budget_provider_product' },
      { getAll: () => suppliersDb.getAll(), entityType: 'supplier' },
      { getAll: () => supplierProductsDb.getAll(), entityType: 'supplier_product' },
      { getAll: () => recurringRecordsDb.getAll(), entityType: 'recurring_record' },
      { getAll: () => recurringRecordProductsDb.getAll(), entityType: 'recurring_record_product' },
    ];

    for (const { getAll, entityType } of tables) {
      const items = await getAll();
      for (const item of items) {
        if (queuedSyncIds.has(item.sync_id)) continue;
        if (item.status === 'deleted') continue;
        if (item.serverId != null && item.serverId !== 0) continue;

        const data = toApiFormat(entityType, item);
        if (!data) continue;
        toQueue.push({
          id: item.sync_id,
          entityType,
          operation: 'create',
          data,
          timestamp: now,
          retryCount: 0,
        });
      }
    }

    if (toQueue.length > 0) {
      await syncQueueDb.bulkPut({ entries: toQueue });
    }

    return { created: toQueue.length };
  }
}

export const syncQueueService = new SyncQueueService();
