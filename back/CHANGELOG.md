# Changelog

All notable changes to the OneSpend backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v0.81.0] - 2026-11-10

### Added
- `App\Support\CanonicalTime`: the single place in the back that holds the canonical `"HH:MM"` rule for a time of day. It matches the client's `front/src/utils/timeFormat.ts` `normalizeTime` character for character, and it is used by the `BudgetEntry` and `RecurringRecord` model accessors and by both sync processors, so the two entities cannot drift apart (GitLab #17).

### Fixed
- `RecurringRecord::getTimeAttribute` normalizes the MySQL `TIME` value to `"HH:MM"`, exactly like `BudgetEntry::getTimeAttribute`. The column is a MySQL TIME, so the API used to hand `"14:30:00"` back while the client stores `"14:30"`, and the two strings disagreed on the field hash the server computes — a phantom conflict on every push of that row (GitLab #17).
- `RecurringRecordProcessor` normalizes `time` before writing it, like the budget entries' processor already did: an empty string (a client that clears the field without dropping the key) became an invalid MySQL TIME insert and failed the whole batch, and a malformed value could poison the row. An unusable time is now stored as `null` (GitLab #17).
- The live pull mapper (`SyncQueueService.mapServerItemToRow`) normalizes `recurring_record.time` to `"HH:MM"`, falling back to the local row's time when the server omits it (GitLab #17).

### Removed
- `BudgetEntrySyncRequest` and `RecurringRecordSyncRequest`: dead classes, not wired into any route, request or controller. The live push validation lives in `StoreBudgetEntryRequest` and `StoreRecurringRecordRequest`, and it is unchanged (GitLab #17).

## [v0.80.0] - 2026-10-27

### Added
- `time` on budget entries and `category` on recurring records: migrations `2026_10_18_000000_add_time_to_budget_entries_table` and `2026_10_18_000001_add_category_to_recurring_records_table` add the nullable columns. `BudgetEntry::$fillable` / `$casts` accept `time` and `RecurringRecord::$fillable` accepts `category`. `BudgetEntry::getTimeAttribute` normalizes the MySQL `TIME` value to `HH:MM`, so the field hash the server computes matches the one the client computes over its `HH:MM` local value and the round-trip does not raise a false conflict. `BudgetEntryProcessor` stores both on create and update, and normalizes an empty `time` to `null` (LBDS-273).

### Fixed
- `notes` field on budget entries: migration `2026_10_12_000000_add_notes_to_budget_entries_table` adds the nullable `text` column, `BudgetEntry::$fillable` accepts it, and `BudgetEntrySyncRequest` validates `nullable|string|max:2000`. `BudgetEntryProcessor` stores the note on create + update (including clearing back to `null`), and the new `BudgetEntryProcessorTest` cases pin the round-trip (LBDS-275).
- `AbstractEntityProcessor::bulkUpdateByCase` derives the `SET` column list from the union of the keys of every item in the batch instead of the first item only, so a column carried by a later item (e.g. `notes`) is no longer silently dropped from the `UPDATE`. An item that does not carry a column keeps the value the server already has (the client contract: an absent key means "don't touch this field", only an explicit `null` clears it). Pinned by `BudgetEntryProcessorTest::test_batch_update_applies_notes_to_every_item` (GitLab #16).

## [v0.79.0] - 2026-10-11

No backend changes in this release. The version bump tracks the frontend (SSO endpoint override in Conexiones, LBDS-295) and the F-Droid release-side changes.

## [v0.78.0] - 2026-10-06

### Added

- New `AttachmentProcessor` wired into the sync pipeline (`back/app/Services/Sync/Processors/AttachmentProcessor.php`) so attachment deletes follow the same queue + ack contract as the other entity types, instead of being a side effect of the merge (LBDS-280).
- Tests: `OrchestratorAttachmentDeleteTest` (orchestrator routing) and `AttachmentProcessorTest` (processor contract) (LBDS-280).

### Changed

- `AbstractEntityProcessor` exposes the hooks the new `AttachmentProcessor` needs (deleted-row sentinel + delete-ack path) (LBDS-280).
- `SyncController::merge` acknowledges attachment deletes with the same `sync_id` + `skipped` semantics as the rest of the entities (LBDS-280, mirrors LBDS-244).
- `SyncOrchestratorService` and `SyncServiceProvider` register the attachment processor alongside the other entity processors (LBDS-280).
- Build toolchain moved to mise-managed PHP 8.4 (`back/mise.toml`, `PHP_PREBUILT_STATIC=true`).

## [v0.77.0] - 2026-09-18

### Added

- `MergeDeleteAckContractTest` covering the merge delete-acknowledgement contract (LBDS-244).

### Changed

- `POST /api/sync/merge` responses carry a `skipped` bucket inside `results`, listing ids dropped by deduplication so the client can acknowledge and drain them (LBDS-244).
- `compressMergeResults` logs and drops non-array result buckets instead of failing the ack map, and normalises scalar acks to `sync_id` (LBDS-244).
- Build toolchain moved to mise-managed PHP 8.4 (`back/mise.toml`).

### Fixed

- Merge acknowledgement echoed `null` instead of `sync_id` for deletes, so deleted rows were never acknowledged and the client queue never drained (LBDS-244).
- Merge `serverTime` was serialised as an ISO-8601 string, which corrupted the client `last_sync` cursor; it is now a unix timestamp (LBDS-244).
- A batch failing mid-merge no longer discards the whole chunk: `processEntityType` retries per item so sibling rows still sync and the failing rows come back with their real `sync_id` in `errors` (LBDS-244).

## [v0.76.2] - 2026-09-10

### Fixed

- Syncing an entry update with an explicit empty `groups` array now clears its groups; updates that omit `groups` leave existing groups untouched (LBDS-228).

## [v0.76.1-rc.4] - 2026-09-04

### Added

- Nullable `category` (string, 100) field on budget entries: migration `2026_09_01_000000_add_category_to_budget_entries_table`, `BudgetEntry::$fillable`, and `BudgetEntrySyncRequest` validation (`nullable|string|max:100`) (LBDS-210).
