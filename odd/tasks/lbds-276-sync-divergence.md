# LBDS-276 — Sync divergence: detector, repairs, diagnosis

Branch: `dowardev/lbds-276-diagnose-and-repair-clientserver-de-synchronization-local-vs`
MR: !76 (draft) · Linear: LBDS-276 (In Progress)

## Goal

Make the client↔server de-sync surface **visible** (detector + diagnosis doc), fix
the data-loss bugs that are repairable inside this ticket, and record an explicit
decision for the ones that aren't.

## Confirmed divergence classes (already evidenced by the read-only scout)

| # | Class | Verdict | Repair action |
|---|-------|---------|---------------|
| 1 | Dangling category/supplier/product ids; `category` lost on pull | CONFIRMED (worse than label-loss) | `mapServerItemToRow` must read `category`; detector reports id-not-in-local; **label not auto-repairable** (custom UUID → name lost) — recorded decision: the user re-categorizes on the second device |
| 2 | Pull overwrite eats local-only fields | CONFIRMED; biggest hole: `recurring_record` pull mapper drops `type`, all `repeat*`, `time`, `autoInsert`, `estimated`, `items`, `notes`, `status`; `budget_entry` pull drops `category` and `fromRecurringId`; `recurring_record` maps `i.frequency` under the wrong key (`repeatFrequency`) | Fix the mappers and the send side (`toApiFormat`) where the column exists server-side |
| 3 | Partial pull: `last_sync` advances to server `now()` instead of max delivered `updated_at` → skip window + boundary re-delivery | PARTIAL | Advance `last_sync` to the max delivered `updated_at` (monotonic); preserve existing full-sync behavior |
| 4 | Delete/queued-row resurrection (server update overwrites a tombstone; client `saveChangesToLocalDb` skips locally-queued syncIds entirely, even for tombstones) | CONFIRMED | Define outcome for "tombstone vs locally-queued": if queued op is `create` → drop the queue item, keep the delete; if queued op is `update` → keep local, register a conflict so the detector surfaces it |
| 5 | Clock skew lets a behind clock *decrease* `last_sync` (duplicates, not skips) | CONFIRMED | Monotonic guard: `setItem(max(existing, computed))`; drop the `nowSeconds` rewind path on the pull branch |
| 6 | Merge ack contract | SANE today (LBDS-244 fixed delete/id-echo; all 8 processors echo). | Detector cross-checks the merge response ack shape only |

Out-of-scope (per ticket): category catalogue sync (LBDS-221) and the retry
scheduler (LBDS-272).

## Concrete deliverables

1. **Diagnosis doc** — `docs/plans/2026-09-21-lbds-276-sync-divergence-diagnosis.md`,
   names each class, the failing stage, the reproduction, and the repair decision.
   Delivered as its own work-unit commit (docs).
2. **Detector** — `front/src/services/sync/SyncDivergenceDetector.ts`: a pure
   `compareEntitySets` core (testable without a server) + a wrapper that fetches
   the server snapshot (auth-aware) and reads the local Dexie tables. Exposes
   `EntityDivergence` per entity type with `missingOnServer`, `missingOnLocal`,
   `versionMismatch`, `localOnlyFields` (pull-overwrite evidence),
   `danglingCategoryIds`, `unappliedTombstones`. Exposed to dev-only
   `window.__devDb.detectDivergence()` and to the sync controller for `repair`.
3. **Pull-fidelity fix** — fill the gaps in `mapServerItemToRow`
   (`SyncQueueService.ts`) for `budget_entry.category`, `budget_entry._from_recurring_id`,
   and the full `recurring_record` server-side field set under the correct front
   key names. Verify `toApiFormat` sends `_from_recurring_id` (server already
   valid-keys it in `BudgetEntrySyncRequest`).
4. **Cursor/clock monotonicity** — `pullChanges` advances `last_sync` to the max
   delivered `updated_at`; never decrease it.
5. **Tombstone vs queued row** — `saveChangesToLocalDb` distinguishes a tombstone
   (`_deleted`) targeting a queued id: drop the queue item when op is `create`,
   escalate to a conflict when op is `update`/`delete`.
6. **Wiring + repair** — `syncController.detectDivergence()` /
   `syncController.repairDivergence(report)`; reuse the detector, extend
   `repairSync` beyond `reconstructQueueForUnsyncedCreates`. Sync-screen surface:
   minimal "Diagnóstico de divergencias" `ion-item` inside the existing advanced
   accordion (LBDS-263 layout), showing per-entity counts + "Reparar" action;
   full report via `__devDb`. Streamlines the "wire it to the Sync screen (or
   __devDb)" deliverable: both, small UI footprint.
7. **Tests** — `front/tests/unit/SyncDivergenceDetector.spec.ts` (pure compare
   core) covering the three acceptance criteria (missing-on-server, dropped
   local-only field, dangling category id). `front/tests/unit/SyncPullFidelity.spec.ts`
   round-trips the mappers end-to-end against fixture server payloads. Backend
   tests if class 4 is changed server-side (it's not — class 4 fix is front-only).
8. **Changelog entries** — `[Unreleased]` lines in `front/CHANGELOG.md`
   (technical) and `CHANGELOG.md` (user-facing, no internals).

## Acceptance evidence

- `pnpm run typecheck` — green.
- `pnpm run lint` — green.
- `pnpm run test:unit` — green; the three detector cases are assertions in
  `SyncDivergenceDetector.spec.ts`.
- Detector output reproducible from unit tests (no live server needed).

## Work-unit commits (one per deliverable, work-unit sized)

| # | Commit | Files | Risk |
|---|--------|-------|------|
| 1 | `docs(sync): diagnose six divergence classes with the fix/decision per class` | `docs/plans/2026-09-21-lbds-276-...md`, `odd/tasks/lbds-276-sync-divergence.md` | none (docs) |
| 2 | `feat(sync): add SyncDivergenceDetector (pure core + tests)` | new: detector + spec | low (new files) |
| 3 | `fix(sync): restore budget_entry.category and _from_recurring_id on pull` | `SyncQueueService.ts` + spec | low (table-level) |
| 4 | `fix(sync): map the recurring_record server-persisted fields on pull` | `SyncQueueService.ts` + spec | medium (mapper) |
| 5 | `fix(sync): advance last_sync to max delivered updated_at; never decrease` | `SyncQueueService.ts` + spec | medium (cursor semantics) |
| 6 | `fix(sync): define the tombstone-vs-queued-row outcome (drop create / escalate update)` | `SyncQueueService.ts` + spec | medium-high (sync core) |
| 7 | `feat(sync): wire divergence detector to __devDb and syncController; repair path` | `OneSpendDB.ts`, `syncController.ts`, `SyncView.vue` (+ spec) | medium |
| 8 | `docs: record the divergence detector and repairs in both changelogs` | `CHANGELOG.md`, `front/CHANGELOG.md` | none (docs) |

Commits 3-6 each are the smallest reviewable slice; commits 2 and 7 are the
infrastructure. The high-risk one is 6 (class 4 sync-core change) — its spec
must cover the resurrection scenario with a queued update + tombstone.

## Reviewer's checklist (per PR / merge)

For each commit, the corresponding unit test must fail before and pass after,
and `pnpm run typecheck && pnpm run lint && pnpm run test:unit` must pass.

## Open decisions captured

- "Stop category ids from silently dangling" — implemented as: (a) the pull
  restores `category`, (b) the detector surfaces dangling ids, (c) the
  *label* is **not** auto-repairable and the documented user action is "the
  origin device re-published the category; this device should re-categorize".
- `supplier_product.imageBase64` — intentional server-side drop (`imageUrl`
  only). Not a bug; documented in the diag doc so we don't try to fix it again.

## TDD / checks

TDD mode not explicitly configured for this repo; per-convention I'll write the
failing unit test alongside each fix before the implementation edit (in the same
commit), and run vitest before committing.
