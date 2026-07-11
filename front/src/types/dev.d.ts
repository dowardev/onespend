import type { BudgetEntryRow } from '@/db/types';

interface DevDb {
  countSyncQueue(): Promise<number>;
  getBudgetEntries(): Promise<BudgetEntryRow[]>;
  addConflict(params: {
    entityType: string;
    sync_id: string;
    client_data: Record<string, unknown>;
    server_data?: Record<string, unknown>;
  }): Promise<void>;
  removeConflict(params: { entityType: string; sync_id: string }): Promise<void>;
  clearConflicts(): Promise<void>;
  getConflictCount(): Promise<number>;
}

interface Window {
  __devDb?: DevDb;
}
