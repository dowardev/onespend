// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

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
    | 'supplier_product'
    // LBDS-280: attachment rows are queue-op-only and only ever travel as
    // `delete`. Mirrored here so the typed merge of queue items accepts
    // the new entity without a cast.
    | 'attachment';
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

export type SyncEntityType =
  | 'account'
  | 'budget_provider'
  | 'budget_provider_product'
  | 'budget_entry'
  | 'recurring_record'
  | 'recurring_record_product'
  | 'supplier'
  | 'supplier_product'
  // LBDS-280: see SyncItem.entityType comment above.
  | 'attachment';
