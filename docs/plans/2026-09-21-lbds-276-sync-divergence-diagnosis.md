---
title: LBDS-276 — Sync divergence diagnosis & repair plan
status: active
ticket: LBDS-276
branch: dowardev/lbds-276-diagnose-and-repair-clientserver-de-synchronization-local-vs
mr: !76 (draft)
---

# LBDS-276 — Client ↔ server de-synchronization

This is the diagnosis document for the LBDS-276 ticket. It names six divergence
classes the team could reproduce, attaches evidence to each, and lists the
chosen repair (or a recorded decision when a class is not auto-repairable).

> Everything here was verified against the current branch (`main` @ 752ce1a,
> base for this work). The scout that produced the first draft is referenced
> in the related memory observation (topic `onespend/lbds-276-sync-divergence-diagnosis`).

## 0. Scope

In scope for this ticket:
- Detect each class without re-architecture.
- Repair each class that is auto-repairable inside the change boundary.
- Record an explicit decision for every class that is not.

Out of scope (raised as separate tickets by the original author):
- Category *catalogue* sync to the server (LBDS-221 — server has no category
  table; "device-local" is intentional).
- Retry scheduler internals (LBDS-272).
- The remaining `last_sync` filter exactness on the server (partitioning /
  monotonicity improvements on a per-row level).

## 1. Confirmed divergence classes

### Class 1 — Dangling category & supplier/product references **CONFIRMED**

**What the data does today.** Categories are device-local with no server table:

- The client sends the raw category id in the payload (`front/src/services/sync/entityMappers.ts:34`, `category: row.category ?? undefined`).
- The server persists it (`back/database/migrations/2026_09_01_000000_add_category_to_budget_entries_table.php:19`, declared fillable in `back/app/Models/BudgetEntry.php:29`).
- But the live pull mapper in `front/src/services/sync/SyncQueueService.ts:155-171` never reads `item.category` — `grep category SyncQueueService.ts` returns no match in the pull path.
- And `seedRows` (`front/src/db/controllers/entryCategoriesDb.ts:25-55`) plus `generateCategoryId()` (`:42-47`) produce ids that are *deterministic keywords* (`salary`, `food`, …) for the built-ins, but **random UUID-style ids** (`cat-<ms>-<rand>`) for everything the user creates.

**Reproduction.**
1. Device A: `budgetEntriesDb.add({ name: 'Lunch', category: 'food' })` → server creates the row.
2. Add a second category "Resto" on A: `entryCategoriesDb.add({ name: 'Resto' })` → id is `cat-…` (random).
3. Add a new entry on A with that category; the entry creates; the server stores `category = "cat-<ts>-<rand>"`.
4. Device B first sync: entries arrive with `category = "cat-<ts>-<rand>"`. B's `entryCategories` has no such id → label resolves to empty.
5. Even if the entries index had the id, the *name* "Resto" was never sent to the server, so it is genuinely unrecoverable.

**Failing stage.** Pull path (`mapServerItemToRow` for `budget_entry`).

**Repair.** This ticket *cannot* recover the user-assigned name (it never left device A). What it can do, and will:

- (a) Fix the data loss on the pull path: the id must survive a pull
  (`mapServerItemToRow` reads `item.category`).
- (b) Add a per-row "dangling reference" report to the divergence detector
  (see Deliverable 2).
- (c) Record an explicit decision (this doc): the label of a *user-created*
  category **is not auto-repairable**. The user action is either
  re-categorize the entry on the new device, or re-publish the catalogue
  (out of scope, LBDS-221). *Built-in* (keyword) categories resolve fine on the
  new device because their ids are seeded.

Supplier/product ids are server-mapped numeric ids (`<…>Db.ts` build the
`serverId` index); they round-trip via `ForeignKeyResolver` and are **not**
dangling in the same sense. The detector still reports "missing-on-server"
or "missing-on-local" for any entity row whose FK does not resolve.

### Class 2 — Pull overwrite eats server-persisted fields **CONFIRMED**

**What the data does today.** `mapServerItemToRow` (`SyncQueueService.ts:117-255`)
rebuilds every row from `r = { ...base }; …` — i.e. the local Dexie row is the
base, and the mapper overwrites only the fields it explicitly reads. That is
fine for fields that have no server counterpart (they survive the pull via the
spread). The bug is fields whose **server stored value the mapper never reads**:
those drop the server-truthful value on a fresh pull that reaches a row with no
local base yet (`base = {}`).

Specific holes verified:

| Row type | Field (front) | Server column | Mapped today? |
|---|---|---|---|
| `BudgetEntryRow` | `category` | `category` | **NO** (grep returns 0) |
| `BudgetEntryRow` | `fromRecurringId` | `_from_recurring_id` | **NO** (column + migration + `BudgetEntrySyncRequest::validate` exist; only `toApiFormat` and `mapServerItemToRow` are missing it) |
| `RecurringRecordRow` | `type` | `type` | **NO** (pull mapper never reads) |
| `RecurringRecordRow` | `repeatFrequency` | `repeat_frequency` | wrong key — the pull mapper writes `r.frequency = String(i.frequency ?? …)`. Front uses `repeatFrequency`. |
| `RecurringRecordRow` | `repeatInterval`, `repeatDays`, `repeatMonthDay`, `repeatMonthWeekdayMode`, `repeatMonthWeekday`, `repeatMonthWeekdayOrdinal`, `repeatYearMonth`, `repeatYearDay` | `repeat_*` | **NO** |
| `RecurringRecordRow` | `time`, `autoInsert`, `estimated`, `items`, `notes`, `status` | server-persisted | **NO** (LBDS-275 NOT merged in this branch; `recurring_record.notes` loss is provable) |
| `RecurringRecordRow` | `products` (rel) | `recurring_record_products` table | server emits them inline (`formatItem` ends with `data['products'] = …`), but the front pull mapper doesn't `bulkPut` the products at all. |

Notes:
- `front/src/db/mappers.ts:52` and `:87` already read both `_fromRecurringId` and `from_recurring_id` on the row→DB path.
- `supplier_product.imageBase64` is *intentionally* dropped on the server side
  (`back/app/Http/Controllers/SyncController.php:1207-1210` only emits `imageUrl`
  and unsets `image_base64`). The pull mapper preserves any local base via
  `?? base.imageBase64`. This is **by design**, not a bug — recorded here so
  future reviewers don't reopen it.

**Reproduction (recurring_record.notes as the worked example).**
1. Create a recurring record on device A with `notes = 'monthly subscription'`. Server stores it.
2. Device B's first sync pulls the record — `r.notes` is never assigned by the pull
   mapper, so the spread keeps whatever the row had before; for a row new to B
   (no base), the value is `undefined`. UI shows empty.
3. Same mechanism applies to all the other fields above.

**Failing stage.** `mapServerItemToRow`, function `SyncQueueService.ts:117-255`.

**Repair.**
- Pull: add the missing fields with correct front key names.
- `toApiFormat` for `budget_entry`: include `_from_recurring_id` from the row (the server already validates it).
- Add tests round-tripping fixture server payloads → expected front rows.

### Class 3 — Partial pull: cursor semantics **PARTIAL**

**What the data does today.**
- Cursor is per-call (`SyncQueueService.ts:1309 do {…; cursor = result.cursor ?? null; …} while (cursor)`) and **never persisted** — a mid-loop crash resets the cursor. Since every page is held in memory (`allChanges`) and applied in one pass via `saveChangesToLocalDb`, the local state is **not** half-updated by a crash. Good.
- The real issue is the `last_sync` advance: `pullChanges` writes `last_sync = serverTime` (`SyncController.php:226` returns `now()->timestamp`, applied at `SyncQueueService.ts:1347`), and the change filter is `updated_at >= last_sync` (`SyncController.php:303`).
- Because `serverTime` is the build-time `now()` rather than the max delivered `updated_at`, rows committed after the paging query but with `updated_at ≤ serverTime` are silently not delivered, and the next pull starts at `last_sync = serverTime` (filter inclusive on `>=`) so the duplicate window re-delivers the boundary second.

**Reproduction (analytic, not a live race).**
1. Server `users.user1` has rows R1 (`updated_at=10s`), R2 (`updated_at=20s`).
2. Server `now()` is `30s`; client pulls with `last_sync=15s`.
3. The filter `>= 15s` matches both. Cursor iteration returns pages; `serverTime=30s`.
4. Right after the response is built, another write lands (R3 `updated_at=25s`).
5. Client stores `last_sync = 30s`. Next pull: `>= 30s` filters R3 (not 25s).

**Failing stage.** `pullChanges` advance (`:1344-1349`).

**Repair.** Track the max `updated_at` actually delivered across the pull and advance `last_sync` to that max when at least one row was delivered. If no rows were delivered, advance to `serverTime` like today. The filter is inclusive (`>=`), so re-delivering the boundary second is safe (the upsert is idempotent). Maintain a monotonic guard so the value never decreases (Class 5).

### Class 4 — Delete + queued row resurrection **CONFIRMED**

**What the data does today.**

On the **server**:
1. `delete()` soft-deletes and marks `sync_metadata.sync_status = 'deleted'` (back/app/Sync/Processors/AbstractEntityProcessor.php:318-343, :392).
2. Tombstones are emitted as `{ id, _deleted: true }` while the metadata row still has `sync_status = 'deleted'` (back/app/Http/Controllers/SyncController.php:204, :196).
3. `markSynced(..., 'synced')` (`back/app/Services/SyncMetadataRepository.php:26-47`) overwrites `sync_status` to `'synced'`. The update path runs a raw `DB::update` that **ignores the SoftDeletes scope** and then calls `markSynced(…, 'synced')` (AbstractEntityProcessor.php:397). The net effect: a queued update on the client lifts the server tombstone to `synced` and the delete is gone forever.

On the **client**:
- `saveChangesToLocalDb` (`SyncQueueService.ts:1253-1257`) SKIPS any item whose `syncId` is currently in `queuedSyncIds` — *before* it inspects `_deleted`. Concretely:

```ts
const syncId = (item.sync_id || item.id) as string;
if (!syncId) continue;
if (queuedSyncIds.has(syncId)) {
  continue;          // <-- the skip; the _deleted check below is unreachable for queued ids
}
if (item._deleted) { ... }
```

So a tombstone that targets a locally-queued id is silently ignored. The local
op completes and resurrects the row on the server.

**Reproduction.**
1. Device A creates an entity. Queue: `op=create, sync_id=X`. Local exists, server doesn't.
2. Device A deletes the entity while offline → still in queue as `create` (DeleteRescue …) — hmm, actually for this to queue as a delete, the create has to have acked first. Reproduce differently:
   1. Device A creates + syncs.
   2. Device A edits the row offline (queued: `op=update`).
   3. Device B deletes the same row.
   4. Device A comes online → pull arrives with `{sync_id=X, _deleted: true}`. Today: ignored (queued). Local update drains, hits the server with a raw `update` ignoring SoftDeletes → tombstones cleared.

**Failing stage.** `saveChangesToLocalDb` (SyncQueueService.ts:1253-1257).

**Repair.** Replace the blanket `queuedSyncIds.has(syncId)` skip with a case-aware decision:

- If the queued op is `create` and the incoming change is a tombstone → drop the queue item (the server never had it; nothing to resurrect) and apply the delete locally.
- If the queued op is `update` / `delete` → keep the local queue, but register an entry in the conflict store so the divergence detector surfaces "tombstone unapplied because of pending op X". (No silent resurrection.)

The exact existing conflict-store wiring for the second case is the same as
`ConflictResolutionService.add` (called already from other paths). Tests cover
both branches.

### Class 5 — Clock / cursor semantics **CONFIRMED**

**What the data does today.**

- Server returns `serverTime` as unix seconds (LBDS-244 fix); client normalizes via `normalizeServerTime` (`SyncQueueService.ts:58-82`). Units aligned.
- The advance writes (`SyncQueueService.ts:1347-1349` for pull, `:1109-1111` for merge) have a case where, if the client clock is far **behind** server time:
  ```ts
  if (serverTime <= now + 300) localStorage.setItem(serverTime);
  else localStorage.setItem(serverTime - 60);
  ```
  Re-shaped: `now = floor(Date.now()/1000)` (client). When `serverTime > now + 300` (client clock behind), the code sets `last_sync = serverTime - 60` — **not less than serverTime**, but it's still ahead of the client's view of time; no rewind here.
  However, the merge branch (`:1109-1111`):
  ```ts
  if (serverTime > nowSeconds + 300) setItem(nowSeconds);
  else if (serverTime > nowSeconds) setItem(serverTime - 60);
  ```
  When `serverTime > nowSeconds + 300` (client clock behind) → **`setItem(nowSeconds)`** rewinds `last_sync` to the client's clock → next pull re-fetches the gap (duplicates, not skips). The "skips a row" reading in the diagnostic scout is more nuanced — this is a *duplicate* pathology, not a skip — but the underlying rule (letting the client clock rewrite `last_sync`) is the bug.

**Repair.** Monotonic guard at every write site:

```ts
const computed = (() => { ... })(); // current branch
const prev = parseInt(localStorage.getItem(LAST_SYNC_KEY) ?? '0', 10);
const next = Math.max(prev, computed);
localStorage.setItem(LAST_SYNC_KEY, String(next));
```

Drops the `setItem(nowSeconds)` rewind branch on merge and the analog on pull.
Other branches unchanged.

### Class 6 — Merge ack contract **SANE (verified)**

`back/app/Http/Controllers/SyncController.php:396-431` (`compressMergeResults`) normalizes every id-bearing bucket to `{sync_id, id}` and handles the LBDS-244 scalar/delete shape:

- `created` → processor returns `{sync_id, id}` (AbstractEntityProcessor.php:170-172) ✓
- `updated` → returns `{sync_id}` (after `_original` stripped at SyncController.php:565) ✓
- `deleted` → `delete()` returns scalar strings; scalar branch of `compressMergeResults` maps to `{sync_id: <string>, id: null}` (`:420`) ✓ — this is the LBDS-244 fix
- `skipped` → array of `{sync_id}` or scalar counts. Today, all 8 processors are registered (`back/app/Providers/SyncServiceProvider.php:39-46`), so every entity reaches a processor — the scalar-count branch is unreachable in current code.
- `conflicts` → each entry carries `sync_id` (back/app/Sync/ConflictDetector.php:171, :189) ✓

Client ack matching: `extractAckId` (`SyncQueueService.ts:42-56`) prefers `sync_id` then `id`; `partitionChunkIds` (`:94-103`) drains the queue when acked, back-offs when the id is silent. Coverage looks complete for every entity × op.

The detector will cross-check this contract at runtime by asserting that every
sent id appears in one of the four ack buckets — but only on diagnostic runs;
no behavior change.

## 2. What is NOT auto-repairable (explicit decisions)

| Class | Reason not auto-repaired | User action |
|---|---|---|
| Class 1 — user-created category **name** | The name was never synced (LBDS-221). Only the id was. The id survives (after the pull fix); the label is unrecoverable. | Re-assign the category on the new device, or publish the catalogue. |
| Class 1 — class of category *id only-dangling* | Detectable; surfaced by the divergence detector. | Re-assign the category (a UUID id is unrecoverable). |
| Supplier product `imageBase64` (this is NOT a bug) | Server intentionally serves `imageUrl` only. | Re-upload the image if it didn't sync. |
| Class 3 — exact-change-during-pull races | Single-row skip is a race; not reproducible deterministically. The max-updated_at fix closes the *systematic* skip window. | Already-covered by the new cursor rule. |

## 3. Deliverables (recap of `odd/tasks/lbds-276-sync-divergence.md`)

1. **Detector** — `front/src/services/sync/SyncDivergenceDetector.ts` (pure
   compare core + Dexie/HTTP wrapper). Three required cases covered: (a) row
   missing on server, (b) row with dropped local-only field, (c) dangling
   category id.
2. **Pull fidelity** — restore `budget_entry.category`, `budget_entry._from_recurring_id`,
   and the full `recurring_record` server-persisted field set under the
   correct front key (`repeatFrequency`, not the wrong-key `frequency`).
3. **Monotonic cursor** — `pullChanges` advances `last_sync` to max delivered
   `updated_at`, never decreases.
4. **Tombstone vs queued row** — case-aware skip in `saveChangesToLocalDb`;
   conflict escalation when a queued op blocks a tombstone.
5. **Wiring** — `window.__devDb.detectDivergence()`, `syncController.detectDivergence()`,
   `syncController.repairDivergence()`; minimal "Diagnóstico de divergencias"
   inside the LBDS-263 advanced accordion.
6. **Tests** — `front/tests/unit/SyncDivergenceDetector.spec.ts` (covers the
   3 acceptance criteria without a live server) +
   `front/tests/unit/SyncPullFidelity.spec.ts` (round-trips the mappers).
7. **Changelog entries** in `CHANGELOG.md` (no internals) and `front/CHANGELOG.md`
   (technical).

## 4. Risks and how this PR uses them

- Sync-core code (`saveChangesToLocalDb`) changes → the new branch adds a unit
  test for the *resurrection* scenario *and* the *pass-through* scenario.
- The pull mapper is touched for two entity types → each in its own commit;
  the mappers' spec asserts round-trip.
- `last_sync` advance is a precision change → guarded by a monotonic rule and
  by pinning the previous value in the test fixture.

## 5. References

- `front/src/services/sync/{SyncQueueService.ts,SyncApiService.ts,entityMappers.ts,ConflictResolutionService.ts}`
- `front/src/db/{OneSpendDB.ts,types.ts,mappers.ts,controllers/entryCategoriesDb.ts}`
- `front/src/controllers/syncController.ts:186`
- `back/app/Http/Controllers/SyncController.php:117…` (`formatItem`), `:204..226` (tombstones & serverTime), `:396-431` (`compressMergeResults`)
- `back/app/Models/{BudgetEntry.php,BudgetProvider.php,RecurringRecord.php}`
- `back/app/Sync/Processors/AbstractEntityProcessor.php:318..397`
- `back/app/Services/SyncMetadataRepository.php:26-47`
- `back/database/migrations/2026_05_26_000002_add_from_recurring_id_to_budget_tables.php`, `…_09_01_000000_add_category_to_budget_entries_table.php`
