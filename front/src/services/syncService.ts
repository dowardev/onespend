import { getToken, hasToken } from './tokenStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

const SYNC_QUEUE_KEY = 'sync_queue';
const LAST_SYNC_KEY = 'last_sync';
const PENDING_OPERATIONS_KEY = 'pending_operations';

export interface SyncItem {
  id: string;
  entityType: 'account' | 'budget' | 'entry' | 'supplier' | 'template';
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

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
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

    if (this.isOnline) {
      this.processQueue();
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
        entry: [],
        supplier: [],
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

    const headers = await this.getAuthHeaders();
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
