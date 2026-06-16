import { syncApiService, AuthExpiredError } from './sync/SyncApiService';
import { conflictResolutionService } from './sync/ConflictResolutionService';
import { syncQueueService } from './sync/SyncQueueService';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { hasToken } from './tokenStorage';

export { AuthExpiredError } from './sync/SyncApiService';

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
  groups?: Array<{ sync_id?: string; amount: number; accountId: string | number }>;
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
  entityType:
    | 'account'
    | 'budget_provider'
    | 'budget_provider_product'
    | 'budget_entry'
    | 'recurring_record'
    | 'recurring_record_product'
    | 'supplier'
    | 'supplier_product';
  operation: 'create' | 'update' | 'delete';
  data: SyncItemData;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  nextRetryAt?: number;
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
  errors?: Record<string, Array<{ sync_id: string; error: string }>>;
  cursor?: string | null;
  has_more?: boolean;
  serverTime?: number;
}

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

export class SyncService {
  private isOnline: boolean = true;
  private onlineListeners: Set<(online: boolean) => void> = new Set();
  private authExpiredListeners: Set<() => void> = new Set();
  private readonly authExpiredHandler: () => void;

  constructor() {
    this.authExpiredHandler = () => this.notifyAuthExpired();

    syncQueueService.onAuthExpired = this.authExpiredHandler;

    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private handleOnline() {
    this.isOnline = true;
    syncQueueService.setOnline(true);
    this.notifyOnlineListeners();
  }

  private handleOffline() {
    this.cancelActiveRequests();
    this.isOnline = false;
    syncQueueService.setOnline(false);
    this.notifyOnlineListeners();
  }

  private cancelActiveRequests() {
    syncApiService.cancelActiveRequests();
  }

  private notifyOnlineListeners() {
    this.onlineListeners.forEach((listener) => listener(this.isOnline));
  }

  private notifyAuthExpired() {
    this.authExpiredListeners.forEach((listener) => listener());
  }

  onOnlineChange(callback: (online: boolean) => void) {
    this.onlineListeners.add(callback);
    return () => this.onlineListeners.delete(callback);
  }

  onAuthExpired(callback: () => void) {
    this.authExpiredListeners.add(callback);
    return () => this.authExpiredListeners.delete(callback);
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  async isAuthenticated(): Promise<boolean> {
    return hasToken();
  }

  async queueOperation(item: Omit<SyncItem, 'timestamp' | 'retryCount'>): Promise<void> {
    await syncQueueService.queueOperation(item);
  }

  async processQueue(): Promise<SyncResult | null> {
    performanceMonitor.startSyncMeasurement('processQueue')
    try {
      return await syncQueueService.processQueue()
    } finally {
      performanceMonitor.endSyncMeasurement('processQueue')
    }
  }

  async getQueueCount(): Promise<number> {
    return syncQueueService.getQueueCount();
  }

  async getQueueItems(): Promise<SyncItem[]> {
    return syncQueueService.getQueueItems();
  }

  getLastSyncTime(): number {
    return syncQueueService.getLastSyncTime();
  }

  async clearQueue(): Promise<void> {
    return syncQueueService.clearQueue();
  }

  async getConflicts(): Promise<Record<string, SyncConflictItem[]>> {
    return syncQueueService.getConflicts();
  }

  getConflictStore() {
    return conflictResolutionService.getStore();
  }

  async pullChanges(
    onChangesSaved?: (changes: Record<string, SyncItemData[]>) => Promise<void>,
  ): Promise<Record<string, SyncItemData[]>> {
    performanceMonitor.startSyncMeasurement('pullChanges')
    try {
      return await syncQueueService.pullChanges(onChangesSaved)
    } finally {
      performanceMonitor.endSyncMeasurement('pullChanges')
    }
  }

  async fullSyncAndSave(): Promise<void> {
    performanceMonitor.startSyncMeasurement('fullSyncAndSave')
    try {
      if (!this.isOnline) {
        throw new Error('Cannot perform full sync while offline');
      }

      if (!(await hasToken())) {
        return;
      }

      try {
        await syncQueueService.pullChanges();
        await syncQueueService.processQueue();
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
}

export const syncService = new SyncService();

if (typeof window !== 'undefined') {
  (window as unknown as { syncService: SyncService }).syncService = syncService;
}
