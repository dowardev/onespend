import { getToken, hasToken } from './tokenStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

const SYNC_QUEUE_KEY = 'sync_queue';
const LAST_SYNC_KEY = 'last_sync';
const PENDING_OPERATIONS_KEY = 'pending_operations';

export interface SyncItem {
  id: string;
  entityType: 'account' | 'budget' | 'budget_provider' | 'budget_provider_product' | 'entry' | 'supplier' | 'supplier_product' | 'template';
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncResult {
  success: boolean;
  created: Record<string, string[]>;
  updated: Record<string, string[]>;
  deleted: Record<string, string[]>;
  conflicts: Record<string, any[]>;
  serverTime: number;
}

class SyncService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private syncTimeout: number | null = null;
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
    if (typeof window === 'undefined') return [];
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

    console.log('syncService.queueOperation - Queued:', syncItem);

    const queue = this.getQueue();
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

    // Don't process immediately - wait for multiple items to be queued
    // processQueue will be called after a short delay or manually
    if (this.isOnline) {
      // Debounce the sync call to wait for multiple items
      if (this.syncTimeout) {
        clearTimeout(this.syncTimeout);
      }
      this.syncTimeout = setTimeout(async () => {
        const result = await this.processQueue();
        console.log('syncService.queueOperation - processQueue result:', JSON.stringify(result, null, 2));
      }, 100);
    }
  }

  async processQueue(): Promise<SyncResult | null> {
    if (this.syncInProgress || !this.isOnline) {
      return null;
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      return null;
    }

    this.syncInProgress = true;

    try {
      const headers = await this.getAuthHeaders();
      const data: Record<string, any[]> = {
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

      console.log('syncService.processQueue - Sending to backend:', { data });

      const response = await fetch(`${API_URL}/api/sync/merge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();

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

  private async handleConflicts(conflicts: Record<string, any[]>): Promise<void> {
    const pendingConflicts: Record<string, any[]> = {};

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

  private async resolveConflictDialog(entityType: string, item: any): Promise<any> {
    return {
      entity_type: entityType,
      entity_id: item.sync_id,
      resolution: 'client',
      client_data: item.client_data,
    };
  }

  async pullChanges(): Promise<Record<string, any[]>> {
    if (!this.isOnline) {
      throw new Error('Cannot pull changes while offline');
    }

    const lastSync = localStorage.getItem(LAST_SYNC_KEY) || '0';

    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_URL}/api/sync/changes?last_sync=${lastSync}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to pull changes: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.changes) {
      localStorage.setItem(LAST_SYNC_KEY, String(result.server_time));
    }

    return result.changes || {};
  }

  async fullSync(): Promise<Record<string, any[]>> {
    if (!this.isOnline) {
      throw new Error('Cannot full sync while offline');
    }

    const headers = await this.getAuthHeaders(null);
    const response = await fetch(`${API_URL}/api/sync/full`, { headers });

    if (!response.ok) {
      throw new Error(`Failed to full sync: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      localStorage.setItem(LAST_SYNC_KEY, String(result.server_time));
    }

    return result.data || {};
  }

  async fullSyncAndSave(): Promise<void> {
    console.log('syncService.fullSyncAndSave - Starting...');
    
    const data = await this.fullSync();
    console.log('syncService.fullSyncAndSave - Data received:', JSON.stringify({
      accounts: data.accounts?.length,
      suppliers: data.suppliers?.length,
      supplier_products: data.supplier_products?.length,
      templates: data.templates?.length,
      budgets: data.budgets?.length,
      entries: data.entries?.length,
      budget_providers: data.budget_providers?.length,
      budget_provider_products: data.budget_provider_products?.length,
    }));

    // Save each entity type to its corresponding store
    if (data.accounts && data.accounts.length > 0) {
      console.log('syncService - Saving accounts:', data.accounts.length);
      await this.saveEntitiesToStore('accounts', data.accounts);
    }
    if (data.suppliers && data.suppliers.length > 0) {
      console.log('syncService - Saving suppliers:', data.suppliers.length);
      console.log('syncService - First supplier products:', JSON.stringify(data.suppliers[0].products));
      await this.saveEntitiesToStore('suppliers', data.suppliers);
    }
    if (data.supplier_products && data.supplier_products.length > 0) {
      console.log('syncService - Saving supplier_products:', data.supplier_products.length);
      await this.saveEntitiesToStore('supplier_products', data.supplier_products);
    }
    if (data.templates && data.templates.length > 0) {
      await this.saveEntitiesToStore('templates', data.templates);
    }
    if (data.budgets && data.budgets.length > 0) {
      await this.saveEntitiesToStore('budgets', data.budgets);
    }
    if (data.entries && data.entries.length > 0) {
      await this.saveEntitiesToStore('entries', data.entries);
    }
    if (data.budget_providers && data.budget_providers.length > 0) {
      await this.saveEntitiesToStore('budget_providers', data.budget_providers);
    }
    if (data.budget_provider_products && data.budget_provider_products.length > 0) {
      await this.saveEntitiesToStore('budget_provider_products', data.budget_provider_products);
    }

    console.log('syncService.fullSyncAndSave - Data saved successfully');
  }

  private async saveEntitiesToStore(storeName: string, entities: any[]): Promise<void> {
    const { DixieController } = await import('@/controllers/dixie');
    const ctrl = new DixieController({ name: 'ABOgazDB', storeName });
    
    for (const entity of entities) {
      const entry = { ...entity };
      if (entry.id != null) {
        entry.sync_id = entry.id;
        delete entry.id;
      }
      await ctrl.putEntry({ entry });
    }
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

  async getConflicts(): Promise<Record<string, any[]>> {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY) || '0';
    const changes = await this.pullChanges();
    
    const conflicts: Record<string, any[]> = {};
    for (const [entityType, items] of Object.entries(changes)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item._deleted) continue;
          if (item._conflict) {
            conflicts[entityType] = conflicts[entityType] || [];
            conflicts[entityType].push(item);
          }
        }
      }
    }

    return conflicts;
  }
}

export const syncService = new SyncService();
