# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Explicit entry categories (global id+name, device-local): picked at entry creation via a searchable, accent-insensitive picker modal; synced to backend via the new nullable `category` field on budget entries.
- Performance config page (`/statistics/performance/config`) with per-section category mapping (single assign modal, 1 category to 1 section).
- Historial search by name and calendar date filter.
- Performance empty-section "Agregar" buttons now navigate to the entry form.
- Performance help button (per empty section) that explains the concept via the financial glossary.

### Changed
- Income Statement classification now uses the explicit category-to-section mapping, keeping the keyword heuristic as a byte-identical fallback for unmapped entries.
- App boot no longer blocks on SSO network calls (mount-first); Budget page entry gate is non-blocking.
- Budget account balances computed in a single pass.
- Performance page refreshes on every view entry, so records created in Budget show without a manual reload.
- Recurring list pause/resume button is now icon-only (with an aria-label); status badge and delete button kept.
- Recurring auto-insert moved to an app-level background processor that runs independently of the active screen.

### Fixed
- Recurring charge save button now enables correctly.
- Recurring auto-insert no longer requires a page reload.
- Recurring pause/resume works in both directions (DataCloneError from reactive proxies fixed by deep-cloning in the sync queue).
- A recurring record resumed after its due time no longer backfills the paused day.
- Pause/resume from the edit-page header popover works for synced records (record id now resolves to `sync_id`).
- Recurring time picker now saves the selected value.
- Performance "Agregar" buttons that did nothing now navigate to the entry form.
- Entry category is persisted on create and edit, and editing an entry shows its current category.
- Custom section assignments and category names now apply live in Performance (section map is read reactively; previous-period comparison uses the same registry).
- Reassigning a seed category to another section no longer double-counts it in both sections.
- Excel export folds custom-category amounts into "other" buckets so it matches on-screen totals.
- Creating a duplicate category keeps the alert open instead of closing silently.
- Editing an entry's date together with other fields no longer drops the non-date changes.