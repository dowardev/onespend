import { getToken, hasToken } from './tokenStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

const SYNC_QUEUE_KEY = 'sync_queue';
const LAST_SYNC_KEY = 'last_sync';
const PENDING_OPERATIONS_KEY = 'pending_operations';

export interface SyncItemData {
  name?: string;
  date?: string;
  estimated?: number;
  account_id?: number | string;
  efectividad?: number;
  tarjeta?: number;
  credito?: number;
  notes?: string;
  visited?: boolean;
  supplier_id?: number | string;
  price?: number | string;
  image_base64?: string;
  initial_balance?: number;
  description?: string;
  suppliers?: string[];
  suppliers_snapshot?: string[];
  is_day_closed?: boolean;
  finish_day_data?: unknown;
  amount?: number | string;
  payment_type?: string;
  entry_type?: string;
  accountId?: number | string;
  groups?: string[];
  _from_provider_group_id?: number | string;
  _provider_name?: string;
  _supplier_id?: number | string;
  _supplier_name?: string;
  budget_provider_id?: number | string;
  supplier_product_id?: number | string;
  product_name?: string;
  product_price?: number | string;
  quantity?: number;
  updated_at?: number;
  [key: string]: unknown;
}

export interface SyncItem {
  id: string;
  entityType: 'account' | 'budget' | 'budget_provider' | 'budget_provider_product' | 'entry' | 'supplier' | 'supplier_product' | 'template';
  operation: 'create' | 'update' | 'delete';
  data: SyncItemData;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncResult {
  success: boolean;
  created: Record<string, Array<{ sync_id: string; id: number }>>;
  updated: Record<string, Array<{ sync_id: string; id?: number }>>;
  deleted: Record<string, string[]>;
  conflicts: Record<string, SyncConflictItem[]>;
  serverTime: number;
}

export interface SyncConflictItem {
  sync_id: string;
  client_data: SyncItemData;
  server_data?: SyncItemData;
  [key: string]: unknown;
}

export interface ServerSyncResponse {
  success: boolean;
  results?: Record<string, Record<string, Array<{ sync_id: string; id?: number | null }>>>;
  changes?: Record<string, SyncItemData[]>;
  data?: Record<string, SyncItemData[]>;
  conflicts?: Record<string, SyncConflictItem[]>;
  serverTime?: number;
  server_time?: number;
}

interface EntityIdEntry {
  sync_id: string;
  id?: number | null;
}

type EntityResults = Record<string, EntityIdEntry[]>;
type SyncResults = Record<string, EntityResults>;

export interface SyncConflictResolution {
  entity_type: string;
  entity_id: string;
  resolution: 'client' | 'server' | 'merge';
  client_data?: SyncItemData;
  server_data?: SyncItemData;
}

export interface SupplierEntry {
  name?: string;
  products?: SupplierProduct[];
  sync_id?: string;
  serverId?: number;
  synced_at?: number;
  [key: string]: unknown;
}

export interface SupplierProduct {
  sync_id?: string;
  name?: string;
  serverId?: number;
  synced_at?: number;
  [key: string]: unknown;
}

export interface SupplierProductInfo {
  id?: number | string;
  sync_id?: number | string;
  name?: string;
  price?: number | string;
  [key: string]: unknown;
}

class SyncService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private onlineListeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private handleOnline() {
    this.isOnline = true;
    this.notifyOnlineListeners();
    this.processQueue();
  }

  private handleOffline() {
    this.isOnline = false;
    this.notifyOnlineListeners();
  }

  private notifyOnlineListeners() {
    this.onlineListeners.forEach(listener => listener(this.isOnline));
  }

  onOnlineChange(callback: (online: boolean) => void) {
    this.onlineListeners.add(callback);
    return () => this.onlineListeners.delete(callback);
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  async isAuthenticated(): Promise<boolean> {
    return hasToken();
  }

  private async getAuthHeaders(contentType = 'application/json'): Promise<HeadersInit> {
    const token = await getToken();
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
    };
    
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    return headers;
  }

  private getQueue(): SyncItem[] {
    const queue = localStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  }

  private saveQueue(queue: SyncItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  queueOperation(item: Omit<SyncItem, 'timestamp' | 'retryCount'>): void {
    const syncItem: SyncItem = {
      ...item,
      timestamp: Date.now(),
      retryCount: 0,
    };

    console.log('[SyncService] queueOperation:', syncItem.entityType, syncItem.operation, syncItem.id);
    console.log('[SyncService] isOnline:', this.isOnline);

    const queue = this.getQueue();
    console.log('[SyncService] Current queue length:', queue.length);

    const existingIndex = queue.findIndex(
      q => q.id === syncItem.id && q.entityType === syncItem.entityType
    );

    if (existingIndex !== -1) {
      if (syncItem.operation === 'delete') {
        queue[existingIndex] = syncItem;
      } else {
        queue[existingIndex].data = syncItem.data;
        queue[existingIndex].timestamp = syncItem.timestamp;
      }
    } else {
      queue.push(syncItem);
    }

    this.saveQueue(queue);

    if (this.isOnline) {
      if (this.syncTimeout) {
        clearTimeout(this.syncTimeout);
      }
      this.syncTimeout = setTimeout(async () => {
        console.log('[SyncService] Calling processQueue after debounce...');
        const result = await this.processQueue();
        console.log('[SyncService] processQueue result:', JSON.stringify(result, null, 2));
      }, 100);
    } else {
      console.log('[SyncService] Currently OFFLINE, not processing');
    }
  }

  async processQueue(): Promise<SyncResult | null> {
    console.log('[SyncService] processQueue called, isOnline:', this.isOnline, 'syncInProgress:', this.syncInProgress);
    
    if (this.syncInProgress || !this.isOnline) {
      console.log('[SyncService] processQueue - Skipping, not online or sync in progress');
      return null;
    }

    const queue = this.getQueue();
    console.log('[SyncService] processQueue - Queue length:', queue.length);

    if (queue.length === 0) {
      console.log('[SyncService] processQueue - Empty queue, returning null');
      return null;
    }

    this.syncInProgress = true;

    try {
      const headers = await this.getAuthHeaders();
      const data: Record<string, SyncItemData[]> = {
        account: [],
        budget: [],
        budget_provider: [],
        budget_provider_product: [],
        entry: [],
        supplier: [],
        supplier_product: [],
        template: [],
      };

      const processedIds: string[] = [];

      for (const item of queue) {
        if (item.retryCount >= 3) {
          processedIds.push(item.id);
          continue;
        }

        const formattedItem = {
          id: item.id,
          ...item.data,
          updated_at: item.timestamp,
        };

        if (item.operation === 'delete') {
          formattedItem._deleted = true;
        }

        data[item.entityType].push(formattedItem);
        processedIds.push(item.id);
      }

      console.log('[SyncService] processQueue - Sending to backend, items per type:', 
        Object.entries(data).map(([k, v]) => `${k}: ${v.length}`).join(', '));

      const response = await fetch(`${API_URL}/api/sync/merge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.results) {
        console.log('[SyncService] syncQueue - Server response:', result);
        await this.updateLocalRecordsWithMysqlIds(result.results);
      } else {
        console.warn('[SyncService] syncQueue - Server response without results:', result);
      }

      const remainingQueue = queue.filter(item => !processedIds.includes(item.id));

      for (const id of processedIds) {
        const index = remainingQueue.findIndex(q => q.id === id);
        if (index !== -1) {
          remainingQueue.splice(index, 1);
        }
      }

      this.saveQueue(remainingQueue);

      localStorage.setItem(LAST_SYNC_KEY, String(result.serverTime));

      if (Object.keys(result.conflicts || {}).length > 0) {
        await this.handleConflicts(result.conflicts);
      }

      return result;
    } catch (error) {
      const queue = this.getQueue();
      for (const item of queue) {
        item.retryCount++;
        item.lastError = error instanceof Error ? error.message : 'Unknown error';
      }
      this.saveQueue(queue);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async handleConflicts(conflicts: Record<string, SyncConflictItem[]>): Promise<void> {
    const pendingConflicts: Record<string, SyncConflictItem[]> = {};

    for (const [entityType, items] of Object.entries(conflicts)) {
      for (const item of items) {
        const resolution = await this.resolveConflictDialog(entityType, item);
        if (resolution) {
          pendingConflicts[entityType] = pendingConflicts[entityType] || [];
          pendingConflicts[entityType].push(resolution);
        }
      }
    }

    if (Object.keys(pendingConflicts).length > 0) {
      const headers = await this.getAuthHeaders();
      await fetch(`${API_URL}/api/sync/resolve-conflict`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ conflicts: pendingConflicts }),
      });
    }
  }

  private async resolveConflictDialog(entityType: string, item: SyncConflictItem): Promise<SyncConflictResolution> {
    return {
      entity_type: entityType,
      entity_id: item.sync_id,
      resolution: 'client',
      client_data: item.client_data,
    };
  }

  private async updateLocalRecordsWithMysqlIds(results: Record<string, Record<string, Array<{ sync_id: string; id?: number | null }>>>): Promise<void> {
    console.log('[SyncService] 🔵 updateLocalRecordsWithMysqlIds - Starting');
    console.log('[SyncService] Results structure:', JSON.stringify(results, null, 2));

    const { DixieController } = await import('@/controllers/dixie');

    const entityTypeToStore: Record<string, string> = {
      'account': 'accounts',
      'budget': 'budget',
      'budget_provider': 'budget_providers',
      'budget_provider_product': 'budget_provider_products',
      'entry': 'entries',
      'supplier': 'suppliers',
      'supplier_product': 'supplier_products',
      'template': 'templates',
    };

    let updatedCount = 0;

    // Primero,收集 todos los IDs de productos de todos los statuses
    const allProductIds: Map<string, number> = new Map();
    for (const [status, entityMap] of Object.entries(results)) {
      for (const [entityType, ids] of Object.entries(entityMap)) {
        if (entityType === 'supplier_product' && Array.isArray(ids)) {
          for (const idEntry of ids) {
              if (idEntry.sync_id && idEntry.id) {
                allProductIds.set(idEntry.sync_id, idEntry.id);
                console.log(`[SyncService] Mapped product sync_id ${idEntry.sync_id} -> serverId ${idEntry.id}`);
              }
          }
        }
      }
    }

    // Procesar proveedores y actualizar sus productos embebidos
    for (const [status, entityMap] of Object.entries(results)) {
      for (const [entityType, ids] of Object.entries(entityMap)) {
        if (entityType !== 'supplier') continue;
        
        const storeName = 'suppliers';
        if (!Array.isArray(ids)) continue;

        console.log(`[SyncService] Processing supplier (${status}), count: ${ids.length}`);

        const ctrl = new DixieController({ name: 'ABOgazDB', storeName });

        for (const idEntry of ids) {
          const syncId = idEntry.sync_id;
          const mysqlId = idEntry.id;

          if (!syncId) continue;

          console.log(`[SyncService] Looking for supplier sync_id: ${syncId}`);

          try {
            const existing = await ctrl.getEntry(syncId);
            if (existing) {
              console.log(`[SyncService] Found supplier ${existing.name}`);

              const updatedEntry: SupplierEntry = {
                ...existing,
                serverId: mysqlId,
                synced_at: Date.now(),
              };

              // Actualizar productos embebidos si existen
              if (existing.products && Array.isArray(existing.products)) {
                console.log(`[SyncService] Processing ${existing.products.length} embedded products`);
                
                updatedEntry.products = existing.products.map((product: SupplierProduct) => {
                  const productServerId = allProductIds.get(product.sync_id);
                  if (productServerId) {
                    console.log(`[SyncService] ✅ Product ${product.name} sync_id ${product.sync_id} got serverId ${productServerId}`);
                    return {
                      ...product,
                      serverId: productServerId,
                      synced_at: Date.now(),
                    };
                  }
                  console.log(`[SyncService] Product ${product.name} sync_id ${product.sync_id} NOT found in server response`);
                  return product;
                });
              }

              await ctrl.putEntry({ entry: updatedEntry });
              console.log(`[SyncService] ✅ Updated supplier ${syncId} with serverId ${mysqlId}`);
              updatedCount++;
            } else {
              console.warn(`[SyncService] No existing supplier found for sync_id: ${syncId}`);
            }
          } catch (error) {
            console.error(`[SyncService] Failed to update supplier ${syncId}:`, error);
          }
        }
      }
    }

    console.log(`[SyncService] 🔵 updateLocalRecordsWithMysqlIds - Complete. Updated ${updatedCount} records.`);
  }

  getQueueCount(): number {
    return this.getQueue().length;
  }

  getLastSyncTime(): number {
    if (typeof window === 'undefined') return 0;
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    return lastSync ? parseInt(lastSync, 10) : 0;
  }

  clearQueue(): void {
    this.saveQueue([]);
  }

  async getConflicts(): Promise<Record<string, SyncConflictItem[]>> {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY) || '0';
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

  async pullChanges(): Promise<Record<string, SyncItemData[]>> {
    if (!this.isOnline) {
      throw new Error('Cannot pull changes while offline');
    }

    const lastSync = localStorage.getItem(LAST_SYNC_KEY) || '0';
    const headers = await this.getAuthHeaders();

    // Try /api/sync/changes first, fallback to /api/sync/full if it fails
    try {
      const response = await fetch(`${API_URL}/api/sync/changes?last_sync=${lastSync}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json() as ServerSyncResponse;
        
        if (result.changes || result.data) {
          const changes = result.changes || result.data || {};
          await this.saveChangesToLocalDb(changes);
          return changes;
        }
      } else {
        console.warn('[SyncService] /api/sync/changes failed, trying /api/sync/full');
      }
    } catch (error) {
      console.warn('[SyncService] /api/sync/changes error, trying /api/sync/full:', error);
    }

    // Fallback to full sync
    const fullResponse = await fetch(`${API_URL}/api/sync/full`, {
      method: 'GET',
      headers,
    });

    if (!fullResponse.ok) {
      throw new Error(`Failed to pull changes: ${fullResponse.statusText}`);
    }

    const fullResult = await fullResponse.json() as ServerSyncResponse;
    
    if (fullResult.data || fullResult.changes) {
      const changes = fullResult.data || fullResult.changes || {};
      await this.saveChangesToLocalDb(changes);
      return changes;
    }

    return {};
  }

  private async saveChangesToLocalDb(changes: Record<string, SyncItemData[]>): Promise<void> {
    console.log('[SyncService] Saving changes to local DB:', Object.keys(changes));
    
    const { DixieController } = await import('@/controllers/dixie');
    
    const entityTypeToStore: Record<string, string> = {
      'account': 'accounts',
      'budget': 'budget',
      'budget_provider': 'budget_providers',
      'budget_provider_product': 'budget_provider_products',
      'entry': 'entries',
      'supplier': 'suppliers',
      'supplier_product': 'supplier_products',
      'template': 'templates',
    };

    for (const [entityType, items] of Object.entries(changes)) {
      if (!Array.isArray(items) || items.length === 0) continue;
      
      const storeName = entityTypeToStore[entityType];
      if (!storeName) {
        console.warn(`[SyncService] Unknown entity type: ${entityType}`);
        continue;
      }

      const ctrl = new DixieController({ name: 'ABOgazDB', storeName });
      
      for (const item of items) {
        try {
          const syncId = item.sync_id;
          if (!syncId) {
            console.warn(`[SyncService] Item missing sync_id:`, item);
            continue;
          }

          if (item._deleted) {
            await ctrl.deleteBackup(syncId);
            console.log(`[SyncService] Deleted ${entityType} with sync_id: ${syncId}`);
          } else {
            const existing = await ctrl.getEntry(syncId);
            if (existing) {
              const updated = { ...existing, ...item, synced_at: Date.now() };
              await ctrl.putEntry({ entry: updated });
              console.log(`[SyncService] Updated ${entityType} with sync_id: ${syncId}`);
            } else {
              const newItem = { ...item, synced_at: Date.now() };
              await ctrl.addEntry({ entry: newItem });
              console.log(`[SyncService] Added ${entityType} with sync_id: ${syncId}`);
            }
          }
        } catch (error) {
          console.error(`[SyncService] Failed to save ${entityType} item:`, error);
        }
      }
    }
  }

  async fullSyncAndSave(): Promise<void> {
    console.log('[SyncService] Starting full sync and save...');
    
    if (!this.isOnline) {
      throw new Error('Cannot perform full sync while offline');
    }

    try {
      // First, pull all changes from server
      await this.pullChanges();
      console.log('[SyncService] Pull changes completed');
      
      // Then, process any pending local changes
      const queueResult = await this.processQueue();
      if (queueResult) {
        console.log('[SyncService] Queue processed successfully');
      }
      
      console.log('[SyncService] Full sync and save completed');
    } catch (error) {
      console.error('[SyncService] Full sync and save failed:', error);
      throw error;
    }
  }
}

export const syncService = new SyncService();

// Exponer para debugging en consola
if (typeof window !== 'undefined') {
  (window as Window & { syncService: SyncService }).syncService = syncService;
}
