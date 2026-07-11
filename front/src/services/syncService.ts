import { syncQueueService } from './sync/SyncQueueService';

export { AuthExpiredError } from './sync/SyncApiService';
export type * from './sync/types';
export { syncQueueService as syncService };

if (typeof window !== 'undefined') {
  (window as any).syncService = syncQueueService;
}
