# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Historial search by name and calendar date filter.
- Performance empty-section "Agregar" buttons now navigate to the entry form.
- Performance help button (per empty section) that explains the concept via the financial glossary.

### Changed
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