# Changelog

All notable changes to the OneSpend backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


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
