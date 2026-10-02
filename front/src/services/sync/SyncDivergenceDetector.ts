// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * SyncDivergenceDetector — LBDS-276
 *
 * Pure-comparison core + a thin Dexie / HTTP wrapper that compares the local
 * IndexedDB against the server snapshot, per synced entity type, and returns a
 * divergence report. The report categorizes drift into five buckets:
 *
 *   - missingOnServer         a row the server never received
 *   - missingOnLocal          a server row not yet pulled down
 *   - versionMismatch         ids present on both but version / updated_at disagree
 *   - localOnlyFields         pull-overwrite evidence: local rows whose value
 *                             would be lost on a subsequent pull because the
 *                             server does not store those fields
 *   - danglingCategoryIds     budget_entry rows whose category id does not
 *                             resolve to a local entryCategories record
 *   - serverTombstoneUnapplied server-side `_deleted:true` ids that the client
 *                             has not yet deleted locally
 *
 * The pure core (`compareEntitySets`) does NOT touch Dexie, the network, or any
 * other side effect: unit tests drive it with synthetic arrays. The runtime
 * `detectDivergence()` orchestrates a one-shot server snapshot + Dexie reads
 * and forwards the result.
 *
 * Related: `docs/plans/2026-09-21-lbds-276-sync-divergence-diagnosis.md`.
 */

import type { SyncEntityType } from '@/db/types';

// ---------- Types -----------------------------------------------------------

export interface ServerSnapshotRow {
  /** server-side sync_id (UUID-ish) shared between client and server */
  sync_id: string;
  /** client/server version counters; absent means "unknown" */
  version?: number;
  /** server-side updated_at in unix seconds, when available */
  updated_at?: number;
  /** server-side soft-delete marker; pulled-down tombstones set this */
  _deleted?: boolean;
  /** remaining server payload fields (the detector does not interpret them) */
  [k: string]: unknown;
}

export interface LocalRowSnapshot {
  sync_id: string;
  version?: number;
  /** client-side updatedAt in unix seconds */
  updatedAt?: number;
  /** client-side soft-delete status when applicable; mirrors `status === 'deleted'` */
  deleted?: boolean;
  [k: string]: unknown;
}

export interface EntityDivergence {
  entityType: string;
  localCount: number;
  serverCount: number;
  /** Live local rows whose sync_id is not present on the server snapshot. */
  missingOnServer: string[];
  /** Server snapshot rows whose sync_id is not present locally. */
  missingOnLocal: string[];
  /**
   * Ids present on both sides whose version or updated_at disagrees. When the
   * client has pending changes queued, the report flags those separately so
   * the UI does not interpret a pending update as a "drift" event.
   */
  versionMismatch: Array<{
    sync_id: string;
    localVersion?: number;
    serverVersion?: number;
    localUpdatedAt?: number;
    serverUpdatedAt?: number;
  }>;
  /**
   * Pull-overwrite evidence (class 2): per-sync_id list of fields that the
   * client currently holds a value for but that the server cannot reproduce
   * (they have no server column). A subsequent pull from the server would
   * effectively drop these values.
   */
  localOnlyFields: Array<{ sync_id: string; fields: string[] }>;
  /**
   * Dangling reference evidence (class 1, budget_entry only): the entry's
   * `category` references an id that has no matching `entryCategories` row.
   */
  danglingCategoryIds: Array<{
    sync_id: string;
    name?: string;
    categoryId: string;
  }>;
  /**
   * Class 4 evidence: tombstones (`_deleted`) that the server delivered but
   * the client has not applied locally. Detected as ids present on the server
   * tombstone list, absent from the live local rows.
   */
  serverTombstoneUnapplied: string[];
  /** True iff any of the above lists is non-empty. */
  hasDrift: boolean;
}

export interface EntitySetComparisonInput {
  entityType: string;
  localRows: LocalRowSnapshot[];
  serverRows: ServerSnapshotRow[];
  /**
   * Fields that the front row holds but the server does not carry. Used to
   * detect class 2 ("pull overwrites local-only fields"). Per-entity
   * registry lives in `LocalOnlyFieldRegistry` below.
   */
  localOnlyFieldSet?: readonly string[];
  /**
   * Optional budget_entry-specific context: the set of category ids that
   * resolve locally (entryCategories rows). The detector only reports
   * dangling ids when this set is provided.
   */
  resolvedCategoryIds?: ReadonlySet<string>;
  /** Pulled tombstone ids (subset of serverRows where `_deleted === true`). */
  serverTombstoneIds?: string[];
  /**
   * Sync ids the client is currently holding in the queue (pending creates,
   * updates or deletes). Used to flag "versionMismatch but locally queued"
   * separately — those are not drift in the user-visible sense.
   */
  locallyQueuedIds?: ReadonlySet<string>;
}

export interface DivergenceReport {
  generatedAt: number;
  serverTime?: number;
  serverReachable: boolean;
  entities: Record<string, EntityDivergence>;
  /** Concatenated drift summary, sorted, capped to a sane browser size. */
  summary: string[];
  hasDrift: boolean;
}

// ---------- Pure core -------------------------------------------------------

/**
 * LBDS-276 — pure comparator. No I/O, no side effects. The unit-test
 * suite in `SyncDivergenceDetector.spec.ts` drives this with synthetic
 * arrays covering the three acceptance criteria for the detector (LBDS-276
 * ticket acceptance hints):
 *
 *   - "a row the server never received"            → missingOnServer
 *   - "a local-only field was dropped by a pull"   → localOnlyFields
 *   - "a dangling category id after a second-device pull" → danglingCategoryIds
 */
export function compareEntitySets(params: EntitySetComparisonInput): EntityDivergence {
  const {
    entityType,
    localRows,
    serverRows,
    localOnlyFieldSet = [],
    resolvedCategoryIds,
    serverTombstoneIds,
    locallyQueuedIds,
  } = params;

  // Live local rows = anything not soft-deleted locally AND not in the queue
  // (queue is the user's pending intent; we still want to know whether the
  // server has *anything* though, so we keep them in the "local" set for
  // accounting purposes).
  const localLiveRows = localRows.filter((r) => !r.deleted);
  const localLiveIds = new Set(localLiveRows.map((r) => r.sync_id));

  const serverLiveRows = serverRows.filter((r) => !r._deleted);
  const serverIds = new Set(serverRows.map((r) => r.sync_id));

  const missingOnServer: string[] = [];
  for (const r of localLiveRows) {
    if (!serverIds.has(r.sync_id)) {
      missingOnServer.push(r.sync_id);
    }
  }
  missingOnServer.sort();

  const missingOnLocal: string[] = [];
  for (const r of serverLiveRows) {
    if (!localLiveIds.has(r.sync_id)) {
      missingOnLocal.push(r.sync_id);
    }
  }
  missingOnLocal.sort();

  // Version / updatedAt mismatch (both sides have the id).
  const versionMismatch: EntityDivergence['versionMismatch'] = [];
  const localIndex = new Map(localRows.map((r) => [r.sync_id, r]));
  const serverIndex = new Map(serverRows.map((r) => [r.sync_id, r]));
  for (const id of [...localLiveIds].filter((x) => serverIds.has(x)).sort()) {
    const l = localIndex.get(id)!;
    const s = serverIndex.get(id)!;
    // Skip if the client is currently updating this row; otherwise the mismatch
    // is just the user's pending intent, not drift.
    if (locallyQueuedIds && locallyQueuedIds.has(id)) continue;
    const lv = l.version ?? 0;
    const sv = s.version ?? 0;
    const lu = l.updatedAt ?? 0;
    const su = s.updated_at ?? 0;
    if (lv !== sv || lu !== su) {
      versionMismatch.push({
        sync_id: id,
        localVersion: l.version,
        serverVersion: s.version,
        localUpdatedAt: l.updatedAt,
        serverUpdatedAt: s.updated_at,
      });
    }
  }

  // Local-only fields (class 2). For each live row whose server counterpart
  // either lacks a value for a local-only field or simply does not exist on
  // the server side, list the present local-only fields. The user reading
  // the report interprets these as "this would be lost on the next pull".
  const localOnlyFields: EntityDivergence['localOnlyFields'] = [];
  if (localOnlyFieldSet.length > 0) {
    for (const l of localLiveRows) {
      const present: string[] = [];
      for (const f of localOnlyFieldSet) {
        const v = l[f];
        if (v === undefined || v === null) continue;
        if (typeof v === 'string' && v === '') continue;
        present.push(f);
      }
      if (present.length > 0) localOnlyFields.push({ sync_id: l.sync_id, fields: present });
    }
  }

  // Dangling category ids (class 1, budget_entry only).
  const danglingCategoryIds: EntityDivergence['danglingCategoryIds'] = [];
  if (entityType === 'budget_entry' && resolvedCategoryIds !== undefined) {
    for (const l of localLiveRows) {
      const cat = (l as { category?: unknown }).category;
      if (typeof cat !== 'string' || cat.trim() === '') continue;
      if (!resolvedCategoryIds.has(cat)) {
        danglingCategoryIds.push({
          sync_id: l.sync_id,
          name: typeof l.name === 'string' ? l.name : undefined,
          categoryId: cat,
        });
      }
    }
    danglingCategoryIds.sort((a, b) => a.sync_id.localeCompare(b.sync_id));
  }

  // Class 4: server tombstones not yet applied locally.
  const serverTombstoneUnapplied: string[] = [];
  if (serverTombstoneIds && serverTombstoneIds.length > 0) {
    for (const id of serverTombstoneIds) {
      // Local tombstone count: treat a row with `deleted === true` or absent
      // entry as already applied. The wrapper passes already-deleted rows
      // through `localRows` with `deleted:true`, so the "absent" case here
      // reduces to "id has no live local row AND no deleted local row".
      const anyLocal = localRows.some((r) => r.sync_id === id);
      if (!anyLocal) serverTombstoneUnapplied.push(id);
    }
    serverTombstoneUnapplied.sort();
  }

  const hasDrift =
    missingOnServer.length +
      missingOnLocal.length +
      versionMismatch.length +
      localOnlyFields.length +
      danglingCategoryIds.length +
      serverTombstoneUnapplied.length >
    0;

  return {
    entityType,
    localCount: localRows.length,
    serverCount: serverRows.length,
    missingOnServer,
    missingOnLocal,
    versionMismatch,
    localOnlyFields,
    danglingCategoryIds,
    serverTombstoneUnapplied,
    hasDrift,
  };
}

// ---------- Registry of fields that have no server column ------------------

/**
 * Per-entity: which front fields are pure-local (no server column). Pulling
 * any row that does NOT already exist locally drops these. Driven by reading
 * the front row type vs the server `$fillable` + the migration list; see
 * `docs/plans/2026-09-21-lbds-276-sync-divergence-diagnosis.md` (Class 2).
 */
export const LocalOnlyFieldRegistry: Readonly<Record<SyncEntityType, readonly string[]>> = {
  account: [],
  budget_entry: ['providerGroupId', 'providerName', 'isDayClosed', 'finishDayData'],
  budget_provider: [],
  budget_provider_product: [],
  recurring_record: [],
  recurring_record_product: [],
  supplier: [],
  supplier_product: [],
  // LBDS-280: attachments only travel through the queue as deletes today;
  // there are no local-only fields because the push mapper mirrors the
  // server schema 1:1 (sync_id, entity_type, mime_type, ...).
  attachment: [],
};

// ---------- Runtime detector ----------------------------------------------

/** Maximum server snapshot pages to walk when assembling the report. */
const MAX_SNAPSHOT_PAGES = 25;
/** Page size requested from `/api/sync/full` style snapshots. */
const SNAPSHOT_PAGE_LIMIT = 200;

/**
 * Probe-shaped subset of `SyncApiService`. We depend only on the methods we
 * actually call so the detector stays easy to mock in tests.
 */
export interface SnapshotServiceLike {
  getChanges(params: { lastSync: string; cursor?: string | null; limit?: number; types?: string[] }): Promise<Response>;
}

/** Dexie-shaped subset we need from `OneSpendDB`. The interface mirrors the
 *  tables we read and keeps the dependency injection trivial in tests. */
export interface LocalDbLike {
  accounts?: DexieTableLike<LocalRowSnapshot>;
  budgetEntries?: DexieTableLike<LocalRowSnapshot>;
  budgetProviders?: DexieTableLike<LocalRowSnapshot>;
  budgetProviderProducts?: DexieTableLike<LocalRowSnapshot>;
  suppliers?: DexieTableLike<LocalRowSnapshot>;
  supplierProducts?: DexieTableLike<LocalRowSnapshot>;
  recurringRecords?: DexieTableLike<LocalRowSnapshot>;
  recurringRecordProducts?: DexieTableLike<LocalRowSnapshot>;
  entryCategories?: DexieTableLike<{ id: string }>;
  syncQueue?: DexieTableLike<{ id: string }>;
}

export interface DetectorDeps {
  api: SnapshotServiceLike;
  db: LocalDbLike;
  /** Iff supplied, the detector uses the entryCategories table it carries. */
  fetchServerSnapshot?: (types: string[]) => Promise<{
    serverTime?: number;
    rowsByType: Record<string, ServerSnapshotRow[]>;
    tombstoneIdsByType: Record<string, string[]>;
  }>;
}

type DexieTableLike<T> = {
  toArray(): Promise<T[]>;
};

/** Local Dexie → comparator input. Pulled out so tests can target it. */
export async function readLocalSnapshots(
  db: LocalDbLike,
): Promise<{ rowsByType: Record<string, LocalRowSnapshot[]>; queuedIds: Set<string>; resolvedCategoryIds: Set<string> }> {
  const rowsByType: Record<string, LocalRowSnapshot[]> = {};
  const queueTable = db.syncQueue as DexieTableLike<{ id: string }> | undefined;
  const queuedIds = new Set<string>(queueTable ? (await queueTable.toArray()).map((q) => q.id) : []);
  const categoriesTable = db.entryCategories as DexieTableLike<{ id: string }> | undefined;
  const resolvedCategoryIds = new Set<string>(categoriesTable ? (await categoriesTable.toArray()).map((c) => c.id) : []);

  const writeTable = async (entityType: string, table?: DexieTableLike<LocalRowSnapshot>) => {
    if (!table) {
      rowsByType[entityType] = [];
      return;
    }
    const rows = await table.toArray();
    rowsByType[entityType] = rows.map((r) => ({
      ...r,
      deleted: r.deleted ?? ((r as { status?: string }).status === 'deleted'),
    }));
  };

  await Promise.all([
    writeTable('account', db.accounts as DexieTableLike<LocalRowSnapshot> | undefined),
    writeTable('budget_entry', db.budgetEntries as DexieTableLike<LocalRowSnapshot> | undefined),
    writeTable('budget_provider', db.budgetProviders as DexieTableLike<LocalRowSnapshot> | undefined),
    writeTable('budget_provider_product', db.budgetProviderProducts as DexieTableLike<LocalRowSnapshot> | undefined),
    writeTable('supplier', db.suppliers as DexieTableLike<LocalRowSnapshot> | undefined),
    writeTable('supplier_product', db.supplierProducts as DexieTableLike<LocalRowSnapshot> | undefined),
    writeTable('recurring_record', db.recurringRecords as DexieTableLike<LocalRowSnapshot> | undefined),
    writeTable('recurring_record_product', db.recurringRecordProducts as DexieTableLike<LocalRowSnapshot> | undefined),
  ]);

  // Defensive default for missing tables.
  for (const t of [
    'account',
    'budget_entry',
    'budget_provider',
    'budget_provider_product',
    'supplier',
    'supplier_product',
    'recurring_record',
    'recurring_record_product',
  ]) {
    if (!rowsByType[t]) rowsByType[t] = [];
  }

  return { rowsByType, queuedIds, resolvedCategoryIds };
}

/**
 * Walk the server via `/api/sync/changes?last_sync=0` pages to collect every
 * live row + every tombstone across all synced entity types. Self-contained;
 * survives at most `MAX_SNAPSHOT_PAGES` round trips to keep a stuck sync
 * session from holding the detector forever.
 *
 * Tombstones are tracked per-entity-type so the per-entity report does not
 * attribute account tombstones to budget_entry. The server emits each
 * tombstone inside the entity's own bucket (`/api/sync/changes` returns
 * `{id, _deleted: true}` under the matching key), and we keep that
 * attribution here.
 */
export async function fetchServerSnapshot(
  api: SnapshotServiceLike,
  options: { entityTypes?: readonly string[] } = {},
): Promise<{
  serverTime?: number;
  rowsByType: Record<string, ServerSnapshotRow[]>;
  tombstoneIdsByType: Record<string, string[]>;
}> {
  const types = options.entityTypes ?? [
    'account',
    'supplier',
    'budget_provider',
    'recurring_record',
    'budget_entry',
    'budget_provider_product',
    'supplier_product',
    'recurring_record_product',
  ];
  const rowsByType: Record<string, ServerSnapshotRow[]> = {};
  const tombstoneIdsByType: Record<string, string[]> = {};
  for (const t of types) {
    rowsByType[t] = [];
    tombstoneIdsByType[t] = [];
  }
  let cursor: string | null = null;
  let serverTime: number | undefined;
  for (let page = 0; page < MAX_SNAPSHOT_PAGES; page++) {
    const response = await api.getChanges({ lastSync: '0', cursor, limit: SNAPSHOT_PAGE_LIMIT, types: [...types] });
    if (!response.ok) {
      throw new Error(`fetchServerSnapshot: server returned ${response.status}`);
    }
    const body = (await response.json()) as {
      changes?: Record<string, ServerSnapshotRow[]>;
      cursor?: string | null;
      serverTime?: number;
    };
    if (body.changes) {
      for (const t of types) {
        const items = body.changes[t];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (item._deleted) {
            const id =
              typeof item.sync_id === 'string'
                ? item.sync_id
                : typeof (item as unknown as { id?: unknown }).id === 'string'
                  ? (item as unknown as { id: string }).id
                  : null;
            if (id) tombstoneIdsByType[t].push(id);
          } else {
            rowsByType[t].push(item);
          }
        }
      }
    }
    if (typeof body.serverTime === 'number' && (!serverTime || body.serverTime > serverTime)) serverTime = body.serverTime;
    cursor = body.cursor ?? null;
    if (!cursor) break;
  }
  return { serverTime, rowsByType, tombstoneIdsByType };
}

/** Runs the four stages end to end. */
export async function detectDivergence(deps: DetectorDeps): Promise<DivergenceReport> {
  const localReadout = await readLocalSnapshots(deps.db);
  let serverReadout: Awaited<ReturnType<NonNullable<DetectorDeps['fetchServerSnapshot']>>> | undefined;
  let serverReachable = true;
  try {
    const fetcher = deps.fetchServerSnapshot ?? ((types: string[]) => fetchServerSnapshot(deps.api, { entityTypes: types }));
    serverReadout = await fetcher([
      'account',
      'supplier',
      'budget_provider',
      'recurring_record',
      'budget_entry',
      'budget_provider_product',
      'supplier_product',
      'recurring_record_product',
    ]);
  } catch {
    serverReachable = false;
    serverReadout = { serverTime: undefined, rowsByType: {}, tombstoneIdsByType: {} };
  }

  const entityTypes: SyncEntityType[] = [
    'account',
    'budget_entry',
    'budget_provider',
    'budget_provider_product',
    'supplier',
    'supplier_product',
    'recurring_record',
    'recurring_record_product',
  ];
  const entities: Record<string, EntityDivergence> = {};
  for (const et of entityTypes) {
    const localRows = localReadout.rowsByType[et] ?? [];
    const serverRows = serverReadout.rowsByType[et] ?? [];
    // LBDS-276: tombstones are tracked per-entity-type in the snapshot so the
    // per-entity report does not attribute account tombstones to budget_entry.
    entities[et] = compareEntitySets({
      entityType: et,
      localRows,
      serverRows,
      localOnlyFieldSet: LocalOnlyFieldRegistry[et] ?? [],
      resolvedCategoryIds: et === 'budget_entry' ? localReadout.resolvedCategoryIds : undefined,
      serverTombstoneIds: serverReadout.tombstoneIdsByType[et] ?? [],
      locallyQueuedIds: localReadout.queuedIds,
    });
  }

  const summary: string[] = [];
  for (const et of entityTypes) {
    const e = entities[et];
    if (!e.hasDrift) continue;
    if (e.missingOnServer.length > 0) summary.push(`${et}: ${e.missingOnServer.length} row(s) missing on server`);
    if (e.missingOnLocal.length > 0) summary.push(`${et}: ${e.missingOnLocal.length} server row(s) not pulled`);
    if (e.versionMismatch.length > 0) summary.push(`${et}: ${e.versionMismatch.length} version drift`);
    if (e.localOnlyFields.length > 0) summary.push(`${et}: ${e.localOnlyFields.length} row(s) with pull-droppable fields`);
    if (e.danglingCategoryIds.length > 0) summary.push(`budget_entry: ${e.danglingCategoryIds.length} dangling category id(s)`);
    if (e.serverTombstoneUnapplied.length > 0) summary.push(`${et}: ${e.serverTombstoneUnapplied.length} server tombstone(s) not applied`);
  }
  return {
    generatedAt: Math.floor(Date.now() / 1000),
    serverTime: serverReadout.serverTime,
    serverReachable,
    entities,
    summary,
    hasDrift: summary.length > 0,
  };
}
