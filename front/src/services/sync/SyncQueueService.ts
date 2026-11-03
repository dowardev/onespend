// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

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
import { syncApiService, AuthExpiredError, SyncDisabledError } from './SyncApiService';
import { syncLockService } from './SyncLockService';
import { conflictResolutionService } from './ConflictResolutionService';
import { readSyncConfig } from './syncConfig';
import pendingAttachmentsService from '../pendingAttachmentsService';
import attachmentService from '../attachmentService';
import { toApiFormat } from './entityMappers';
import { normalizeTime } from '@/utils/timeFormat';
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

// GitLab #15: the sync entity types and the local table that holds each of
// them. Used by the ack phase to align the local `version` of every acked
// row with the server's.
const SYNC_ENTITY_TABLES: Record<string, {
  bulkGet: (params: { syncIds: string[] }) => Promise<any[]>;
  bulkPut: (params: { entries: any[] }) => Promise<any>;
}> = {
  account: accountsDb,
  supplier: suppliersDb,
  supplier_product: supplierProductsDb,
  budget_provider: budgetProvidersDb,
  budget_provider_product: budgetProviderProductsDb,
  budget_entry: budgetEntriesDb,
  recurring_record: recurringRecordsDb,
  recurring_record_product: recurringRecordProductsDb,
};

// LBDS-244: ack ids arrive in mixed shapes (plain string, {sync_id},
// {sync_id, id}, legacy {sync_id: null}). Centralize extraction so a
// falsy sync_id can still fall back to id instead of sticking the queue.
export function extractAckId(params: { item: unknown }): string | null {
  const { item } = params;
  if (typeof item === 'string') return item || null;
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>;
    const id = record.sync_id || record.id;
    if (typeof id === 'string') return id || null;
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  }
  return null;
}

// LBDS-244: POST /api/sync/merge used to answer serverTime as an ISO-8601
// string while the client stores unix seconds in last_sync. Normalize any
// shape to unix seconds; null means 'do not advance last_sync'.
export function normalizeServerTime(params: { serverTime: unknown }): number | null {
  const { serverTime } = params;
  if (typeof serverTime === 'number' && Number.isFinite(serverTime)) {
    const floored = Math.floor(serverTime);
    return floored > 0 ? floored : null;
  }
  if (typeof serverTime === 'string') {
    const trimmed = serverTime.trim();
    if (trimmed !== '') {
      const asNumber = Number(trimmed);
      if (Number.isFinite(asNumber)) {
        const floored = Math.floor(asNumber);
        return floored > 0 ? floored : null;
      }
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
    }
  }
  return null;
}

// Collect ack ids from one results bucket (conflicts/errors), tolerating
// every shape extractAckId understands.
export function collectAckIds(params: { bucket: unknown }): string[] {
  const { bucket } = params;
  if (!Array.isArray(bucket)) return [];
  const out: string[] = [];
  for (const item of bucket) {
    const id = extractAckId({ item });
    if (id) out.push(id);
  }
  return out;
}

// Split sent chunk ids into queue-draining acks vs silent drops. Silent
// drops (server 200 but item neither acked, errored nor conflicted) are
// backed off so they reach the DLQ with a message instead of retrying
// forever with an unchanged retryCount (LBDS-244 Bug C).
export function partitionChunkIds(params: { chunkItemIds: string[]; succeededIds: string[]; errorIds: string[]; conflictIds: string[] }): { toRemove: string[]; missed: string[] } {
  const { chunkItemIds, succeededIds, errorIds, conflictIds } = params;
  const succeeded = new Set(succeededIds);
  const errored = new Set(errorIds);
  const conflicted = new Set(conflictIds);
  const toRemove = chunkItemIds.filter((id) => succeeded.has(id) && !errored.has(id));
  const missed = chunkItemIds.filter((id) => !succeeded.has(id) && !errored.has(id) && !conflicted.has(id));
  return { toRemove, missed };
}

const LAST_SYNC_KEY = 'last_sync';
// LBDS-289: separate client-clock timestamp for UI display. The
// `last_sync` cursor stores server time (used to query the next
// incremental pull) and may be hours behind the client's wall clock
// when the server is in a different timezone or returns a non-UTC
// ISO-8601 string. The UI must NOT show that skew as 'hace 10h' —
// we track the client's local time of the last successful sync
// separately.
const LAST_SYNC_DISPLAY_KEY = 'last_sync_at';

/**
 * LBDS-276 class 5: monotonic guard for `last_sync`. The old code could
 * rewind the cursor when the client clock was behind the server's (merge
 * branch) or simply used the server `now()` instead of the max row
 * `updated_at` actually delivered (pull branch), opening a skip window.
 *
 * This helper never decreases the stored value. Callers keep their own
 * "preferred candidate" logic; the persistence side is monotone-only.
 */
export function advanceLastSyncMonotonic(params: { candidate: number | null | undefined }): void {
  const { candidate } = params;
  if (!Number.isFinite(candidate ?? NaN)) return;
  const c = Math.floor(Number(candidate));
  if (c <= 0) return;
  const prevRaw = localStorage.getItem(LAST_SYNC_KEY);
  const prev = prevRaw ? parseInt(prevRaw, 10) : 0;
  const safePrev = Number.isFinite(prev) && prev >= 0 ? prev : 0;
  const next = Math.max(safePrev, c);
  if (next > safePrev) {
    localStorage.setItem(LAST_SYNC_KEY, String(next));
    // LBDS-289: stamp the client's wall-clock time alongside the
    // server cursor so the UI can show 'Synced just now' even when
    // the server's clock is in a different timezone.
    localStorage.setItem(LAST_SYNC_DISPLAY_KEY, String(Date.now()));
  }
}

/** Inverse of the monotonic guard: returns the parsed stored value. */
export function readLastSync(): number {
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** LBDS-276 class 3 / 5 combined helper: pull-time advance.
 *
 *  Closes the skip window in `updated_at >= last_sync` semantics by anchoring
 *  on the max delivered `updated_at` when at least one row came back (rows
 *  we actually saw set the floor; anything between that and `serverTime` is
 *  re-delivered next pull). Falls back to `serverTime` when the response
 *  carried no rows (so the cursor still moves monotonically). The helper
 *  never rewinds.
 */
export function advanceLastSyncAfterPull(params: { serverTime?: number; maxUpdatedAt?: number }): void {
  const { serverTime, maxUpdatedAt } = params;
  // LBDS-276 class 3 fix: anchor on `maxUpdatedAt` when present, NOT on
  // `serverTime`. Using serverTime re-opens the skip window this method
  // exists to close.
  if (Number.isFinite(maxUpdatedAt ?? NaN) && (maxUpdatedAt ?? 0) > 0) {
    advanceLastSyncMonotonic({ candidate: maxUpdatedAt });
    return;
  }
  if (Number.isFinite(serverTime ?? NaN) && (serverTime ?? 0) > 0) {
    advanceLastSyncMonotonic({ candidate: serverTime });
  }
}
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

export async function mapServerItemToRow(params: {
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
      // LBDS-276 class 1: restore `category` from the server payload so the
      // reference id survives a second-device pull. The label lookup is a
      // device-local join through entryCategories; the diagnostic detector
      // reports dangling ids.
      r.category = i.category != null ? String(i.category) : (base.category ?? undefined);
      // LBDS-275: notes must travel in the live pull path. Without this, a
      // server response that carries `notes` (or even one that doesn't) would
      // silently drop the local note on bulkPut, so reopen-after-update
      // would show the field empty even though the local Dexie write looked
      // correct. Mirrors the pattern of `category` / `_fromRecurringId`:
      // take the server value when present, fall back to the local base.
      r.notes = i.notes != null ? String(i.notes) : (base.notes ?? undefined);
      // LBDS-273: `time` must be restored in the LIVE pull path (this
      // mapper), not only in entityMappers.fromApiFormat — the latter is
      // not what the merge/upsert flow uses. The server stores a MySQL
      // TIME and returns "HH:MM:SS"; the local row (and the sync push
      // payload) use the canonical zero-padded "HH:MM", so normalize here.
      // Normalizing matters for the roundtrip in two ways: the next push
      // sends the local value, and the back computes the conflict-detection
      // field hash over the value it receives — if the client sent "9:00"
      // and the server stored "09:00", the two hashes would differ and
      // every push of that row would raise a phantom conflict.
      r.time = normalizeTime(i.time) ?? (base.time ?? undefined);
      // LBDS-276 class 2: `_from_recurring_id` is server-persisted (migration
      // 2026_05_26_000002; fillable in BudgetEntry::$fillable) but the live
      // pull mapper did not read it. Resolves the recurring → entry link.
      r._fromRecurringId = i._from_recurring_id != null
        ? String(i._from_recurring_id)
        : (base._fromRecurringId ?? null);
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
      // LBDS-276 class 2: the prior mapper assigned `r.frequency` from
      // `i.frequency`, but the front row uses `repeatFrequency`. A pull on a
      // brand-new local row left the field undefined. Map the full server-side
      // repeated schedule onto the camelCase `RecurringRecordRow` keys.
      r.type = (i.type ?? base.type) != null ? String(i.type ?? base.type) : (base.type ?? '');
      r.repeatFrequency = String(i.repeat_frequency ?? base.repeatFrequency ?? 'monthly');
      r.repeatInterval = Number(i.repeat_interval ?? base.repeatInterval ?? 1);
      r.repeatDays = Array.isArray(i.repeat_days)
        ? i.repeat_days as number[]
        : (Array.isArray(base.repeatDays) ? (base.repeatDays as number[]) : undefined);
      r.repeatMonthDay = i.repeat_month_day != null ? Number(i.repeat_month_day) : (base.repeatMonthDay ?? undefined);
      r.repeatMonthWeekdayMode = i.repeat_month_weekday_mode != null ? Boolean(i.repeat_month_weekday_mode) : (base.repeatMonthWeekdayMode ?? undefined);
      r.repeatMonthWeekday = i.repeat_month_weekday != null ? Number(i.repeat_month_weekday) : (base.repeatMonthWeekday ?? undefined);
      r.repeatMonthWeekdayOrdinal = i.repeat_month_weekday_ordinal != null ? Number(i.repeat_month_weekday_ordinal) : (base.repeatMonthWeekdayOrdinal ?? undefined);
      r.repeatYearMonth = i.repeat_year_month != null ? Number(i.repeat_year_month) : (base.repeatYearMonth ?? undefined);
      r.repeatYearDay = i.repeat_year_day != null ? Number(i.repeat_year_day) : (base.repeatYearDay ?? undefined);
      r.time = i.time ?? base.time ?? undefined;
      r.autoInsert = i.auto_insert != null ? Boolean(i.auto_insert) : (base.autoInsert ?? false);
      r.estimated = i.estimated != null ? Number(i.estimated) : (base.estimated ?? undefined);
      r.items = Array.isArray(i.items) ? (i.items as unknown[]) : (base.items ?? undefined);
      // LBDS-275-class field (notes on recurring_record). Server persists
      // `notes`; pull mapper previously dropped it for new rows.
      r.notes = i.notes != null ? String(i.notes) : (base.notes ?? undefined);
      // LBDS-273: `category` must be restored in the LIVE pull path (this
      // mapper). The id is device-local (the Dexie `entryCategories` table
      // is the source of truth) and the sync payload carries only the id,
      // so a pull has to carry it back or the recurring loses its category
      // on every other device. An empty string means "no category" and is
      // normalized to null, the same way the server treats it.
      r.category = i.category != null && i.category !== ''
        ? String(i.category)
        : (base.category ?? undefined);
      r.status = String(i.status ?? base.status ?? 'active');
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

  // LBDS-244: a merge response that does not acknowledge the sent ids (or an
  // HTTP failure) puts the affected items into backoff. Nothing used to re-run
  // processQueue when that backoff expired, so the queue stayed stuck at
  // "N pendientes" with no error shown and no retry. This timer re-checks the
  // queue while backoffed items exist and self-clears once it drains.
  private backoffRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private static readonly BACKOFF_RETRY_MIN_MS = 1000;
  private static readonly BACKOFF_RETRY_MAX_MS = 30000;

  // LBDS-244: a lock collision applies no backoff, so the retry it arms is a
  // plain 1s re-check. Without a budget, a lock that is never released (a run
  // that hangs before its finally, or one left behind by a page load whose
  // heartbeat died) would keep that 1s loop alive forever. Reset on every
  // successful acquire.
  private lockRetryAttempts = 0;
  private static readonly LOCK_RETRY_MAX_ATTEMPTS = 45;

  // LBDS-244: un 401 deja el token inválido. Sin este flag, el scheduler
  // reintentaba el merge cada ~1s contra un token vencido (applyBackoffToIds
  // usa skipIncrements en el 401, así que retryCount nunca crece y el item
  // jamás llega al DLQ). Se limpia cuando una corrida termina bien, de modo
  // que un re-login reanuda los reintentos.
  private syncBlockedByAuth = false;

  // LBDS-289: the F-Droid reviewer asked for offline-first: no HTTP
  // request fires until the user opts in via Settings. Every sync entry
  // point (processQueue / processPendingAttachments / pullChanges /
  // fullSyncAndSave) short-circuits when this gate is closed. The flag
  // is read from configDb on every entry point rather than cached so a
  // toggle in Settings takes effect on the very next run.
  //
  // Reads of configDb are cheap (IndexedDB cursor) and the entry points
  // are already gated by `navigator.onLine`, a lock acquire, and the
  // scheduler's debounce — adding one IndexedDB read on top does not
  // change the throughput profile.
  private async isSyncEnabledForRun(): Promise<boolean> {
    // LBDS-289: gate on both the opt-in flag AND a non-empty server
    // URL. Without the URL check, scheduled retries / background
    // processQueue runs can acquire the lock and only fail on the
    // first API call, surfacing a red banner instead of the /sync
    // gate card. Matches the UI `syncConfigured` predicate.
    const cfg = await readSyncConfig();
    return cfg.enabled && cfg.hasServerUrl;
  }

  // LBDS-287: processPendingAttachments() used to be a side-effect of
  // processQueue()'s post-merge-success block, so a 500 from the merge
  // endpoint, a lock collision, or any per-chunk error path that surfaced
  // as a throw stranded the upload. The drain is now independent: this
  // timer polls pendingAttachments while there is work, fires on online
  // recovery, fires when the page becomes visible, and re-arms itself
  // only while the table is non-empty.
  private pendingAttachmentsRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  public static readonly PENDING_ATTACHMENTS_RETRY_MIN_MS = 5000;
  public static readonly PENDING_ATTACHMENTS_RETRY_MAX_MS = 30000;

  // LBDS-244: los handlers se guardan como campos para poder quitarlos en
  // dispose(); antes cada instancia dejaba online/offline/visibilitychange
  // colgados (p. ej. una instancia nueva por test).
  private readonly onOnlineHandler = (): void => {
    this.handleOnline();
  };

  private readonly onOfflineHandler = (): void => {
    this.handleOffline();
  };

  private readonly onVisibilityHandler = (): void => {
    if (!document.hidden) {
      this.refreshOnlineStatus();
      // LBDS-287: a foregrounded tab is the cheapest "the user is back"
      // signal. Re-arm the pending-attachments drain so any uploads the
      // user queued while backgrounded drain immediately on focus.
      void this.schedulePendingAttachmentsRetry();
    }
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this._isOnline = navigator.onLine;
      window.addEventListener('online', this.onOnlineHandler);
      window.addEventListener('offline', this.onOfflineHandler);
      // The 'online' event is unreliable on real devices (it can be missed
      // when the OS restores connectivity or the page was backgrounded),
      // leaving the queue stuck behind a stale offline flag. Re-read the
      // live value whenever the page becomes visible again.
      document.addEventListener('visibilitychange', this.onVisibilityHandler);
    }
  }

  /**
   * LBDS-244: quita los listeners registrados en el constructor y cancela el
   * timer de reintento. Sin esto, cada instancia (p. ej. una por test) sigue
   * viva y puede armar timers aunque ya no se use.
   */
  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnlineHandler);
      window.removeEventListener('offline', this.onOfflineHandler);
      document.removeEventListener('visibilitychange', this.onVisibilityHandler);
    }
    if (this.backoffRetryTimeout) {
      clearTimeout(this.backoffRetryTimeout);
      this.backoffRetryTimeout = null;
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    // LBDS-287: same hygiene for the pending-attachments drain timer.
    if (this.pendingAttachmentsRetryTimeout) {
      clearTimeout(this.pendingAttachmentsRetryTimeout);
      this.pendingAttachmentsRetryTimeout = null;
    }
  }

  /**
   * Re-reads the live `navigator.onLine` value and reconciles the cached
   * flag. Call before any user-initiated sync/pull so a missed 'online'
   * event cannot block syncing forever. Returns the reconciled status.
   */
  refreshOnlineStatus(): boolean {
    if (typeof window !== 'undefined') {
      const online = navigator.onLine;
      if (online !== this._isOnline) {
        const wasOffline = !this._isOnline;
        this._isOnline = online;
        if (wasOffline) this.resumeInterruptedRetries();
        this.onlineListeners.forEach((listener) => listener(online));
      }
    }
    return this._isOnline;
  }

  private handleOnline() {
    const wasOffline = !this._isOnline;
    this._isOnline = true;
    if (wasOffline) this.resumeInterruptedRetries();
    // LBDS-287: coming back online is also the moment pending uploads
    // should drain. The merge queue gets its own retry via
    // resumeInterruptedRetries above; the attachment drain needs the same
    // "we just got connectivity, re-check" arm.
    void this.schedulePendingAttachmentsRetry();
    this.onlineListeners.forEach((listener) => listener(true));
  }

  private handleOffline() {
    this.cancelActiveRequests();
    this._isOnline = false;
    // LBDS-244: sin conexión, processQueue devuelve null sin lanzar, así que
    // un retry ya armado se re-armaba para siempre. Lo cancelamos acá.
    if (this.backoffRetryTimeout) {
      clearTimeout(this.backoffRetryTimeout);
      this.backoffRetryTimeout = null;
    }
    // LBDS-287: same self-containment for the pending-attachments drain.
    // An armed timer whose callback would have hit an offline check is
    // wasted work; clear it so a fresh attempt arms on the next online.
    if (this.pendingAttachmentsRetryTimeout) {
      clearTimeout(this.pendingAttachmentsRetryTimeout);
      this.pendingAttachmentsRetryTimeout = null;
    }
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

  notifyAuthExpired(): void {
    // LBDS-244: bloquea los reintentos automáticos hasta que un run vuelva a
    // tener token válido (ver syncBlockedByAuth). Public since LBDS-287 so
    // external callers (e.g. useAttachments.saveAttachments on an inline
    // upload 401) can mark the sync as blocked without having to wait for
    // the next processQueue chunk to see the 401.
    this.syncBlockedByAuth = true;
    this.authExpiredListeners.forEach((listener) => listener());
  }

  /**
   * LBDS-244: cualquier respuesta exitosa del servidor prueba que el token
   * volvió a ser válido. Limpiamos el bloqueo por auth y, si quedaron ítems en
   * backoff, re-armamos el reintento sin esperar un tap manual.
   */
  private resumeRetriesAfterAuthRecovery(): void {
    if (!this.syncBlockedByAuth) return;
    this.syncBlockedByAuth = false;
    void this.scheduleBackoffRetry();
    // LBDS-287: the merge queue re-arms on auth recovery, but the
    // attachment drain is a separate scheduler. Without this, a user
    // who re-logs in after a 401 would see the merge queue drain but
    // pending uploads stay parked until the next visibility / online
    // event. Re-arm here so uploads follow the same recovery.
    void this.schedulePendingAttachmentsRetry();
  }

  /**
   * LBDS-244: al recuperar la conexión, un retry interrumpido por
   * handleOffline() quedó sin timer. Sólo lo re-armamos si hay evidencia de un
   * reintento interrumpido (retryCount > 0 o nextRetryAt), para no
   * auto-sincronizar ítems frescos que se encolaron estando offline.
   */
  private resumeInterruptedRetries(): void {
    void syncQueueDb.getAll()
      .then((queue) => {
        const hasInterruptedRetry = queue.some(
          (item) => (item.retryCount ?? 0) > 0 || item.nextRetryAt !== undefined,
        );
        if (hasInterruptedRetry) void this.scheduleBackoffRetry();
      })
      .catch((error) => {
        debug('resumeInterruptedRetries failed:', error);
      });
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
        // LBDS-280: each chunk shape declares the new `attachment` slot so a
        // delete queued by syncQueue.syncAttachment lands in the same chunk
        // the orchestrator hands to /api/sync/merge.
        attachment: [],
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

  private async applyBackoffToIds(ids: string[], errorMsg: string, skipIncrements = false, onIssue?: (message: string) => void): Promise<void> {
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
    onIssue?.(
      `El servidor no confirmó ${updated.length} ${updated.length === 1 ? 'cambio' : 'cambios'} pendientes: ${errorMsg}`,
    );
    // LBDS-244: without this, a dropped/unacked item waited forever — nothing
    // retried when its backoff expired and the badge never returned to zero.
    this.scheduleBackoffRetry();
  }

  /**
   * Re-arms a queue re-check while the queue is non-empty. The delay comes
   * from the live queue (earliest pending nextRetryAt) and is clamped, so a
   * long backoff is still re-checked periodically and a lock no-op is retried
   * too (its items are ready, not backoffed, and still need the retry that
   * LBDS-244 used to lack). Stops on its own once the queue drains.
   *
   * LBDS-244: se auto-contiene. No arma nada si estamos offline ni si un 401
   * bloqueó la sync por auth, y cualquier fallo interno se traga para que sus
   * call sites no puedan producir un unhandled rejection.
   */
  private async scheduleBackoffRetry(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      if (!this._isOnline) return;
      if (this.syncBlockedByAuth) return;
      const queue = await syncQueueDb.getAll();
      if (queue.length === 0) return;

      const now = Date.now();
      const backoffed = queue.filter((item) => item.nextRetryAt !== undefined && item.nextRetryAt > now);
      const earliest = backoffed.length > 0
        ? Math.min(...backoffed.map((item) => item.nextRetryAt!))
        : now;
      const delay = Math.min(
        SyncQueueService.BACKOFF_RETRY_MAX_MS,
        Math.max(SyncQueueService.BACKOFF_RETRY_MIN_MS, earliest - now + 250),
      );

      if (this.backoffRetryTimeout) clearTimeout(this.backoffRetryTimeout);
      this.backoffRetryTimeout = setTimeout(() => {
        this.backoffRetryTimeout = null;
        debug('[SYNC-PQ] backoff retry firing — calling processQueue');
        void this.processQueue()
          .then(() => this.scheduleBackoffRetry())
          .catch((error) => {
            if (error instanceof AuthExpiredError) return;
            debug('Backoff retry failed:', error);
          });
      }, delay);
    } catch (error) {
      debug('scheduleBackoffRetry failed:', error);
    }
  }

  /**
   * LBDS-287: re-arms the pending-attachments drain independently of
   * `processQueue`. The drain used to be a side-effect of a successful
   * merge (called at the end of processQueue, inside the try), so a 500
   * from the merge endpoint, a lock collision, or any per-chunk error
   * path that surfaced as a throw stranded the upload forever. Now the
   * drain is its own loop: it polls the pendingAttachments table while
   * it is non-empty and only stops once everything drained (or the
   * online / auth gates fail closed).
   *
   * Self-containment, same shape as scheduleBackoffRetry:
   *  - no-op when nothing is pending
   *  - no-op while offline (handleOffline already cleared the timer)
   *  - no-op while a 401 has blocked sync (avoids spamming the server
   *    with the same upload against an expired token)
   *  - any internal error is swallowed so its call sites cannot produce
   *    an unhandled rejection
   */
  // LBDS-287: consecutive-non-empty counter for exponential backoff.
  // Resets to 0 as soon as the scheduler observes an empty pending
  // table. The drain itself does not change the counter — the next
  // scheduler tick reads the table and either increments (still work)
  // or resets (all done).
  private pendingAttachmentsConsecutiveNonEmpty = 0;

  private async schedulePendingAttachmentsRetry(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      if (!this._isOnline) return;
      if (this.syncBlockedByAuth) return;
      const pending = await pendingAttachmentsService.getAllPendingAttachments();
      if (pending.length === 0) {
        this.pendingAttachmentsConsecutiveNonEmpty = 0;
        return;
      }
      this.pendingAttachmentsConsecutiveNonEmpty++;

      const base = SyncQueueService.PENDING_ATTACHMENTS_RETRY_MIN_MS;
      // LBDS-287: exponential backoff capped at MAX. First tick uses the
      // base; each subsequent tick while pending stays non-empty doubles
      // up to the cap. Resets to base the moment the table empties, so a
      // one-off transient 5xx does not lock us into a slow cadence.
      const delay = Math.min(
        SyncQueueService.PENDING_ATTACHMENTS_RETRY_MAX_MS,
        base * Math.pow(2, Math.max(0, this.pendingAttachmentsConsecutiveNonEmpty - 1)),
      );

      if (this.pendingAttachmentsRetryTimeout) clearTimeout(this.pendingAttachmentsRetryTimeout);
      this.pendingAttachmentsRetryTimeout = setTimeout(() => {
        this.pendingAttachmentsRetryTimeout = null;
        debug('[SYNC-PQ] pending attachments retry firing');
        this.processPendingAttachments()
          .then(() => this.schedulePendingAttachmentsRetry())
          .catch((error) => {
            debug('Pending attachments retry failed:', error);
            // Even on failure, re-arm so a transient 5xx does not strand
            // the queue forever. The drain itself short-circuits while
            // offline or auth-blocked.
            void this.schedulePendingAttachmentsRetry();
          });
      }, delay);
    } catch (error) {
      debug('schedulePendingAttachmentsRetry failed:', error);
    }
  }

  /**
   * LBDS-287: public trigger so callers that just enqueued a pending
   * attachment (e.g. `useAttachments.saveAttachments` after a new-entry
   * save) can request a drain without waiting for the next processQueue
   * or the next visibility tick. The scheduler is self-containing: if
   * there is nothing pending, or we are offline / auth-blocked, it is
   * a no-op.
   */
  runPendingAttachmentsDrain(): void {
    void this.schedulePendingAttachmentsRetry();
  }

  /**
   * GitLab #15: align the local `version` of every acked row with the
   * server's.
   *
   * The ack carries the version the row has on the server now, so the
   * client mirrors it. The client must not infer the version: an inferred
   * one drifts as soon as an ack is replayed or the server did not write
   * the row, and the local counter then disagrees with the server for
   * good.
   */
  private async applyServerVersionsFromAck(params: {
    results: Record<string, Record<string, Array<{ sync_id: string; id?: number | null; version?: number | null }>>>;
  }): Promise<void> {
    const { results } = params;

    await this.alignLocalVersions({ bucket: results?.created });
    await this.alignLocalVersions({ bucket: results?.updated });
  }

  private async alignLocalVersions(params: {
    bucket: Record<string, Array<Record<string, unknown> | string>> | undefined;
  }): Promise<void> {
    const { bucket } = params;
    if (!bucket) return;

    for (const [entityType, items] of Object.entries(bucket)) {
      const table = SYNC_ENTITY_TABLES[entityType];
      if (!table) continue; // unknown type (e.g. attachment) -> nothing to align
      if (!Array.isArray(items) || items.length === 0) continue;

      const syncIds: string[] = [];
      const versions = new Map<string, number>();
      for (const item of items) {
        const syncId = extractAckId({ item });
        if (!syncId) continue;
        syncIds.push(syncId);

        // The ack carries the version the row has on the server now. The
        // client mirrors it: inferring it would drift as soon as an ack is
        // replayed or the server did not write the row.
        const raw = item && typeof item === 'object' ? (item as Record<string, unknown>).version : null;
        const version = Number(raw);
        if (Number.isFinite(version) && version > 0) versions.set(syncId, version);
      }
      if (syncIds.length === 0) continue;

      try {
        const rows = await table.bulkGet({ syncIds });
        const updatedRows: any[] = [];

        for (const row of rows) {
          if (!row) continue;
          const version = versions.get(row.sync_id);
          if (version === undefined) continue;
          const current = Number(row.version ?? 0);
          if (version === current) continue;
          updatedRows.push({ ...row, version });
        }

        if (updatedRows.length > 0) {
          await table.bulkPut({ entries: updatedRows });
        }
      } catch (error) {
        // A local write failure must not break the ack phase: the row is
        // synced, only its local version counter lags behind.
        console.warn(`[SYNC-PQ] version alignment failed for ${entityType}:`, error);
      }
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

  // LBDS-287: processPendingAttachments() is now reachable from four
  // triggers (processQueue finally, the self-rearming scheduler, the
  // saveAttachments public drain, and handleOnline/visibilitychange).
  // Without a guard, two triggers firing while the previous drain is
  // still in flight (e.g. the upload took >5s and the scheduler's timer
  // fired concurrently) both read the same pending rows, both call the
  // upload endpoint, and the server ends up with two rows per file —
  // a sync_id-distinct duplicate that the mobile then mirrors as a
  // double attachment. The in-flight flag serialises the calls: the
  // second one exits, the scheduler re-arms on its own .then if there
  // is still pending, and any rows the first drain did not get to
  // (because they were added while it was running) are picked up
  // there.
  private pendingDrainInFlight = false;

  private async processPendingAttachments() {
    // LBDS-289: skip the drain (and its HTTP upload) when sync is off.
    // Local pending attachments stay queued in pendingAttachments — when
    // the user re-enables sync, the scheduler's first tick picks them up.
    if (!(await this.isSyncEnabledForRun())) {
      debug('[SYNC-PQ] pending attachments drain skipped — sync disabled');
      return;
    }
    if (this.pendingDrainInFlight) {
      debug('[SYNC-PQ] pending attachments drain already in flight — skipping concurrent call');
      return;
    }
    // LBDS-287: a 401 from the merge sets syncBlockedByAuth and the
    // processQueue finally block still calls this drain. Without this
    // guard the drain would attempt uploads with the dead token, fail,
    // and the scheduler would re-arm every backoff tick forever. The
    // merge queue's scheduleBackoffRetry honours the flag; the
    // attachment drain must too.
    if (this.syncBlockedByAuth) {
      debug('[SYNC-PQ] drain skipped: auth blocked');
      return;
    }
    if (!this._isOnline) return;

    this.pendingDrainInFlight = true;
    try {
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
    } finally {
      this.pendingDrainInFlight = false;
    }
  }

  async processQueue(params?: { onIssue?: (message: string) => void }): Promise<SyncResult | null> {
    debug('[SYNC-PQ] start');
    // LBDS-244: el issue es por corrida, no estado compartido del servicio. Así
    // un run de fondo (debounce/timer) no puede pisar lo que reporta el tap del
    // usuario. Solo se emite el primer mensaje de la corrida.
    const { onIssue } = params ?? {};
    let issueReported = false;
    const reportIssue = (message: string): void => {
      if (issueReported) return;
      issueReported = true;
      onIssue?.(message);
      debug('[SYNC-ISSUE]', message);
    };
    // LBDS-289: no HTTP request until the user enables sync in Settings.
    // Mirrors the offline branch below so the scheduler / debounce / user
    // tap all see the same shape (returns null, no merge attempted).
    if (!(await this.isSyncEnabledForRun())) {
      debug('[SYNC-PQ] skipped — sync disabled in Settings');
      return null;
    }
    if (!this._isOnline) {
      return null;
    }

    debug('[SYNC-PQ] acquiring lock...');
    const lockAcquired = await syncLockService.acquire({ timeoutMs: 0 });
    if (!lockAcquired) {
      // LBDS-244: an in-flight run (or a stale localStorage lock, which can
      // survive a page navigation for up to 30s because release() compares a
      // per-page-load tabId) used to turn a user-initiated sync into a silent
      // no-op. Surface it instead.
      reportIssue('Hay otra sincronización en curso; reintentá en unos segundos');
      // LBDS-244: surfacing it was not enough — the tap armed nothing, so the
      // queue stayed at "N pendientes" until the user tapped again. Re-check on
      // its own until the lock frees (no backoff is applied on this path, so
      // the scheduler re-checks every second) and stop once the queue drains.
      // The counter bounds the loop, so a lock that is never released cannot
      // turn into an endless 1s re-check.
      if (this.lockRetryAttempts < SyncQueueService.LOCK_RETRY_MAX_ATTEMPTS) {
        this.lockRetryAttempts++;
        debug('[SYNC-PQ] lock busy — silent retry', this.lockRetryAttempts);
        this.scheduleBackoffRetry();
      } else {
        debug('[SYNC-PQ] lock busy — retry budget exhausted');
      }
      return null;
    }
    debug('[SYNC-PQ] lock acquired');
    this.lockRetryAttempts = 0;

    const zombieIds: string[] = [];
    const zombieEntries: DeadLetterItem[] = [];
    const queuedItems: SyncItem[] = [];

    // LBDS-287: el drain de attachments corre en el finally (ver más abajo),
    // sin condicionarse al éxito del merge. Para eso el catch ya no relanza
    // y el return final del try se acumula acá, así podemos limpiar y
    // drenar antes de propagar el resultado o el error al caller.
    let pendingError: unknown = null;
    let pendingResult: SyncResult | null = null;

    try {
      const queue = await this.getQueue();
      debug('[SYNC-PQ] queue items:', queue.length, JSON.stringify(queue.map(q => ({ id: q.id, op: q.operation, retry: q.retryCount, nextRetry: q.nextRetryAt }))));
      if (queue.length === 0) {
        debug('[SYNC-PQ] queue empty');
        return null;
      }

      const now = Date.now();

      // Legacy zombies (pre-patch malformed items) can stay stuck if
      // the server silently drops them without an error bucket.
      // Quarantine after 3 retries or when stale, so the user sees them
      // in DLQ instead of a stuck "1 pendiente" counter.
      const STALE_MS = 24 * 60 * 60 * 1000;
      for (const item of queue) {
        const isStale = now - item.timestamp > STALE_MS && item.retryCount > 0;
        if (item.retryCount >= 3 || isStale) {
          debug('[SYNC-PQ] zombie (retry>=3|stale):', item.id);
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
        // LBDS-244: everything is inside its backoff window. This used to be a
        // silent no-op for a user-initiated sync; say so instead.
        reportIssue('Cambios en reintento automático; esperá unos segundos y volvé a sincronizar');
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
        // LBDS-280: same as the chunk shape; queue drains still iterate by
        // entity type, but an attachment delete is its own bucket.
        attachment: [],
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
              await this.applyBackoffToIds(chunkItemIds, msg, false, reportIssue);
              throw error;
            }

            if (response.status === 401) {
              this.syncBlockedByAuth = true;
              await this.applyBackoffToIds(chunkItemIds, 'HTTP 401: Authentication expired', true, reportIssue);
              this.notifyAuthExpired();
              throw new AuthExpiredError();
            }

            if (!response.ok) {
              debug('[SYNC-PQ] HTTP', response.status, response.statusText, 'for chunk ids', chunkItemIds);
              const pendingIds = this.buildIdQueue(allQueuedIds, successfullyProcessedIds);
              await this.applyBackoffToIds(pendingIds, `HTTP ${response.status}: ${response.statusText}`, false, reportIssue);
              return { ok: false as const };
            }

            // LBDS-244: el merge respondió sin 401, el token es válido otra vez.
            this.resumeRetriesAfterAuthRecovery();

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

              // GitLab #15: keep the local row's `version` aligned with the
              // server's. The ack does not carry the server version (the
              // merge response is compressed to sync_id + id), so the client
              // mirrors the server rule: a create leaves the row at version
              // 1, an applied update bumps it by one.
              await this.applyServerVersionsFromAck({
                results: mergeResult.results,
              });

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
                    const id = extractAckId({ item });
                    if (id) succeededIds.add(id);
                  }
                }
              }

              const errorIds = new Set<string>();
              const errorMessages: string[] = [];
              for (const source of [mergeResult.errors, mergeResult.results?.errors]) {
                if (!source || typeof source !== 'object') continue;
                for (const entityErrors of Object.values(source as Record<string, unknown>)) {
                  if (!Array.isArray(entityErrors)) continue;
                  for (const err of entityErrors) {
                    const errorId = extractAckId({ item: err });
                    if (!errorId) continue;
                    errorIds.add(errorId);
                    const message = (err as Record<string, unknown>)?.error;
                    if (typeof message === 'string' && message) errorMessages.push(message);
                  }
                }
              }
              
              const conflictIds = new Set<string>();
              const conflictsMap = mergeResult.results?.conflicts ?? mergeResult.conflicts;
              if (conflictsMap && typeof conflictsMap === 'object') {
                for (const conflictItems of Object.values(conflictsMap as Record<string, unknown>)) {
                  for (const conflictId of collectAckIds({ bucket: conflictItems })) conflictIds.add(conflictId);
                }
              }
              
              const { toRemove, missed } = partitionChunkIds({
                chunkItemIds,
                succeededIds: [...succeededIds],
                errorIds: [...errorIds],
                conflictIds: [...conflictIds],
              });
              if (errorIds.size > 0) {
                await this.applyBackoffToIds([...errorIds], errorMessages[0] ?? 'Server reported an error', false, reportIssue);
              }
              if (missed.length > 0) {
                await this.applyBackoffToIds(missed, 'Server did not acknowledge item; retrying then quarantining', false, reportIssue);
              }
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

      // LBDS-289: advance last_sync even on the first sync (wasFullSync=true).
      // Previously the cursor was kept at 0 so the next sync would re-fetch
      // everything, but that left the menu's 'Never synced' label stuck on
      // 'Never synced' forever. The cursor is still monotonic; the only
      // change is that after a successful first sync, last_sync moves to
      // the server's clock.
      const pushServerTime = normalizeServerTime({ serverTime: finalResult?.serverTime });
      if (allChunksSucceeded && pushServerTime !== null) {
        const serverTime = pushServerTime;
        // LBDS-276 class 5: monotonically advance only. We never rewind to
        // the client clock (which can sit behind the server) and we never
        // pick `nowSeconds` over a higher stored value.
        advanceLastSyncMonotonic({ candidate: serverTime });
      }

      const remainingCount = await syncQueueDb.count();
      debug('[SYNC-PQ] done. allChunksSucceeded:', allChunksSucceeded, 'remainingQueue:', remainingCount, 'finalResult:', finalResult ? 'ok' : 'null');

      // LBDS-244: la corrida llegó al final sin 401; un re-login ya puede
      // reanudar los reintentos automáticos.
      this.syncBlockedByAuth = false;

      pendingResult = finalResult || null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await this.applyBackoffToIds(queuedItems.map((i) => i.id), msg, false, reportIssue);
      // LBDS-287: el drain corre en el finally de todos modos; guardamos
      // el error para re-lanzarlo DESPUÉS de que el drain haya intentado
      // subir archivos pendientes.
      pendingError = error;
    } finally {
      debug('[SYNC-PQ] lock released');
      syncLockService.release();
      // LBDS-287: el drain ya no es un side-effect de un merge exitoso. La
      // llamada anterior vivía dentro del try, así que cualquier throw
      // del loop del merge (HTTP 500, colisión de lock, 503 per-chunk)
      // saltaba processPendingAttachments y dejaba el upload huérfano
      // para siempre. Ahora corre DESPUÉS de soltar el lock, sin
      // condicionarse al éxito del merge: si el merge falló, la entry
      // drena por su propio retry path y el upload la sigue cuando la
      // entidad ya existe en el servidor. El drain es self-containing
      // (offline / auth-bloqueado son no-ops) y el scheduler se re-arma
      // en línea, visibilidad y post-merge.
      try {
        await this.processPendingAttachments();
      } catch (drainError) {
        debug('[SYNC-PQ] processPendingAttachments failed in processQueue:', drainError);
      }
      void this.schedulePendingAttachmentsRetry();
    }

    if (pendingError) throw pendingError;
    return pendingResult;
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
    // LBDS-276 class 4: keep the queued *operation* alongside the id so we
    // can decide what to do with each locally-queued id when the server
    // delivers a competing change.
    const queuedOpById = new Map<string, 'create' | 'update' | 'delete'>();
    for (const q of queueItems) {
      queuedOpById.set(q.id, q.operation);
    }
    const failedEntityTypes: string[] = [];
    // Queue ids we should drop as part of this pull (e.g. a queued create
    // whose row the server has soft-deleted — doomed push).
    const queueIdsToDrop: string[] = [];
    // Conflicts to escalate: the server-side change contradicted a queued
    // local op (e.g. a tombstone arrived while a queued update was pending).
    const conflictsToAdd: Array<{ entityType: string; syncId: string; reason: string; clientData?: SyncItemData; serverData?: SyncItemData }> = [];

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
        const queuedOp = queuedOpById.get(syncId);

        // LBDS-276 class 4: case-aware decision when the row is also queued
        // locally. The old blanket `continue` made the queue's later update
        // resurrect soft-deleted server rows.
        if (queuedOp !== undefined) {
          if (item._deleted) {
            if (queuedOp === 'create') {
              // Drop the queued create: the server never carried it (or has
              // already deleted it). Applying the delete locally keeps both
              // sides converged; the queue entry is now meaningless and
              // would only produce a doomed "create against deleted row".
              queueIdsToDrop.push(syncId);
              deleteIds.push(syncId);
              continue;
            }
            if (queuedOp === 'delete') {
              // Both sides agree the row is gone. Apply the local delete and
              // drop the now-satisfied queue entry. No conflict to surface.
              queueIdsToDrop.push(syncId);
              deleteIds.push(syncId);
              continue;
            }
            // queuedOp is `update`. We cannot apply the server's tombstone
            // locally because the user's pending update would undo it on its
            // next drain. Surface as a conflict so the divergence detector
            // and the user can resolve it.
            conflictsToAdd.push({
              entityType,
              syncId,
              reason: `server tombstone unapplied: queued ${queuedOp} for the same sync_id`,
              clientData: queueItems.find((q) => q.id === syncId)?.data as SyncItemData | undefined,
              serverData: item,
            });
            continue;
          }
          // Non-deletion incoming change while a local op is queued. Skip to
          // keep the user's pending intent authoritative — the queued op
          // drains on its own path.
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

    // Persist queue drops + conflict escalation OUTSIDE the per-type try/catch
    // so a queue/concurrency failure does not roll back the local-data writes.
    if (queueIdsToDrop.length > 0) {
      try {
        await syncQueueDb.bulkDelete({ ids: queueIdsToDrop });
        debug('[SyncQueueService] dropped queued creates superseded by server tombstones:', queueIdsToDrop);
      } catch (error) {
        console.warn('[SyncQueueService] Failed to drop queued items after tombstone resolution:', error);
      }
    }
    if (conflictsToAdd.length > 0) {
      try {
        const { conflictResolutionService } = await import('@/services/sync/ConflictResolutionService');
        for (const c of conflictsToAdd) {
          await conflictResolutionService.getStore().add({
            entityType: c.entityType,
            item: {
              sync_id: c.syncId,
              client_data: c.clientData ?? ({} as SyncItemData),
              server_data: c.serverData,
              reason: c.reason,
            },
          });
        }
      } catch (error) {
        console.warn('[SyncQueueService] Failed to escalate tombstone-vs-queued conflicts:', error);
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
    // LBDS-289: a pull is an HTTP request too. Skip when sync is off so
    // the F-Droid reviewer sees zero outbound traffic on a fresh install.
    if (!(await this.isSyncEnabledForRun())) {
      throw new SyncDisabledError();
    }
    if (!this._isOnline) {
      throw new Error('Cannot pull changes while offline');
    }

    const lastSync = localStorage.getItem(LAST_SYNC_KEY) || '0';
    // LBDS-276 class 5: the previous "reset to 0 if last_sync is more than
    // 5 minutes ahead of the client clock" guard was the single remaining
    // way to rewind the cursor. A client clock ≥ 5 min behind the server
    // (the very case the monotonic advance exists to handle) would have
    // its correct last_sync value clobbered to '0', forcing a full sync on
    // the next call. The monotonic advance plus the server-side filter
    // (`updated_at >= last_sync`) is now the source of truth; any past
    // over-write by a buggy build stays frozen at its old value and gets
    // resolved on the next reconciliation pull.
    const MAX_PULL_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_PULL_RETRIES; attempt++) {
      try {
        let cursor: string | null = null;
        const allChanges: Record<string, SyncItemData[]> = {};
        let serverTime = 0;
        let maxUpdatedAt = 0;

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

          // LBDS-244: pull exitosa — el token volvió a ser válido.
          this.resumeRetriesAfterAuthRecovery();

          const result = (await response.json()) as ServerSyncResponse;

          if (result.changes) {
            for (const [type, items] of Object.entries(result.changes)) {
              allChanges[type] = [...(allChanges[type] || []), ...items];
            }
            // LBDS-276 class 3: track the max updated_at actually delivered
            // so the advance cannot skip rows committed in the gap between
            // the server `now()` and the last row in the response. Tombstones
            // (no updated_at) are skipped here.
            for (const items of Object.values(result.changes)) {
              if (!Array.isArray(items)) continue;
              for (const item of items) {
                const u = (item as { updated_at?: unknown }).updated_at;
                if (typeof u === 'number' && Number.isFinite(u) && u > maxUpdatedAt) {
                  maxUpdatedAt = u;
                }
              }
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
            // LBDS-276 class 3: prefer the max updated_at actually delivered
            // (a real cursor); fall back to serverTime when no rows came
            // back. The helper is monotonic; `last_sync` never decreases.
            // LBDS-289: wasFullSync branch removed — after a successful
            // first sync the cursor MUST advance, otherwise the menu's
            // 'Never synced' label stays stuck forever.
            advanceLastSyncAfterPull({ serverTime, maxUpdatedAt });
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
      // LBDS-244: 304 también prueba que el token sigue siendo válido.
      this.resumeRetriesAfterAuthRecovery();
      return {};
    }

    if (fullResponse.status === 401) {
      this.notifyAuthExpired();
      throw new AuthExpiredError();
    }

    if (!fullResponse.ok) {
      throw new Error(`Failed to pull changes: ${fullResponse.statusText}`);
    }

    // LBDS-244: fullSync exitoso — el token volvió a ser válido.
    this.resumeRetriesAfterAuthRecovery();

    const responseEtag = fullResponse.headers.get('ETag');
    if (responseEtag) {
      localStorage.setItem(FULL_SYNC_ETAG_KEY, responseEtag);
    }

    const fullResult = (await fullResponse.json()) as ServerSyncResponse;

    if (fullResult.data || fullResult.changes) {
      const changes = fullResult.data || fullResult.changes || {};
      const { failedEntityTypes } = await this.saveChangesToLocalDb(changes, onChangesSaved);
      if (fullResult.serverTime && failedEntityTypes.length === 0) {
        // LBDS-276 class 5: never decrease `last_sync`. The branch above is
        // the fullSync fallback; the helper is the same one used elsewhere
        // so the timestamp can only move forward.
        // LBDS-289: wasFullSync branch removed — the cursor must advance on
        // the first sync too, otherwise the 'Never synced' menu label
        // stays stuck forever.
        advanceLastSyncMonotonic({ candidate: fullResult.serverTime });
      } else if (failedEntityTypes.length > 0) {
        console.warn(`[SyncQueueService] Not advancing last_sync due to failed entity types: ${failedEntityTypes.join(', ')}`);
      }
      return changes;
    }

    // LBDS-289: fullSync returned no data (empty server). Still advance
    // the cursor so the menu's 'Never synced' label can move to
    // 'Synced just now'. Falls back to client clock if the server didn't
    // include a serverTime.
    const fullServerTime = normalizeServerTime({ serverTime: fullResult.serverTime });
    if (fullServerTime !== null) {
      advanceLastSyncMonotonic({ candidate: fullServerTime });
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
    if (!lastSync) return 0;
    const parsed = parseInt(lastSync, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    // LBDS-289: the cursor is stored as seconds (serverTime / updated_at
    // come from the backend that way). Normalize to milliseconds before
    // returning so consumers (SyncStatus) can compare with Date.now()
    // without ending up with a `now - seconds` of ~1.7e12 — that was
    // rendering the menu label as 'Sincronizado hace 20710d' because
    // `diff / 86400000` produced a 5-digit day count.
    //
    // F11 (pre-merge review): the auto-detect (`parsed < 1e12 ? *1000
    // : parsed`) is now a migration aid only — `advanceLastSyncMonotonic`
    // is the only writer and it stores seconds, so fresh installs always
    // hit the `* 1000` branch. We keep the detect to gracefully handle
    // any user upgrading from a pre-LBDS-276 build where the value was
    // stored as ms. Remove this branch once we are confident no such
    // installs exist in the wild.
    return parsed < 1e12 ? parsed * 1000 : parsed;
  }

  /**
   * LBDS-289: returns the CLIENT's wall-clock time of the last
   * successful sync, in milliseconds. This is the value the menu
   * label should use. Separate from getLastSyncTime() which returns
   * the server-cursor (used for incremental queries) and may have
   * any timezone skew.
   */
  getLastSyncDisplayTime(): number {
    if (typeof window === 'undefined') return 0;
    const raw = localStorage.getItem(LAST_SYNC_DISPLAY_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  async fullSyncAndSave(
    onChangesSaved?: (changes: Record<string, SyncItemData[]>) => Promise<void>,
  ): Promise<void> {
    performanceMonitor.startSyncMeasurement('fullSyncAndSave')
    try {
      // LBDS-289: fullSyncAndSave is the entry point used by main.ts on
      // every SSO login. The gate is the same as processQueue / pullChanges
      // — when sync is off, do nothing and let the user enable it from
      // Settings when they want to.
      if (!(await this.isSyncEnabledForRun())) {
        debug('[fullSyncAndSave] skipped — sync disabled in Settings');
        return;
      }
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
