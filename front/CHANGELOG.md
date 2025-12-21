## [v0.8.0] - 2025-12-20

### Added

- New centralized migration helpers: `src/controllers/migrationService.ts` provides date-normalization utilities and data-merge helpers for backups.
- New template application service: `src/controllers/templateService.ts` adds helpers to build payloads from templates and to apply/merge/overwrite template data safely.

### Changed

- Refactor: extract date-normalization logic from multiple places into `migrationService` and reuse it from `backupController` and migrations.
- Improve template application flow: delegate building, conflict detection and merge/overwrite logic to `templateService` and use `backupController` for persistence.
- UI integration: `src/views/budget/BudgetView.vue` now uses `templateService` helpers and shows a conflict modal with clearer messages and safer saving strategies.

### Fixed

- Avoid accidental loss of user `ingresos` when applying templates: preserve existing `ingresos` during combine/overwrite flows where appropriate.
- Ensure backups are saved with consistent payload shape (`{ entry: ... }`) in all save paths.

### Files changed (staged)

- src/controllers/backupController.ts (modified)
- src/controllers/migrationService.ts (new)
- src/controllers/templateService.ts (new)
- src/migrations/normalizeBackupsDates.ts (modified)
- src/views/budget/BudgetView.vue (modified)
- src/views/templates/TemplatesView.vue (modified)
- src/views/templates/modals/AddTemplateComponent.vue (modified)
- src/views/templates/modals/ApplyTemplateComponent.vue (modified)

---

## [v0.7.1] - 2025-12-20

### Fixed

- Preserve user `ingresos` when applying/overwriting templates or backups: template application now keeps existing `ingresos` data for the same date to avoid accidental loss of income entries.
- Ensure `backupController.saveBackup` receives a consistent payload shape (`{ entry: ... }`) in overwrite/merge flows to reduce save errors.
- Correct Spanish user-facing conflict messages to explicitly reference `proveedores` (providers) when detecting provider conflicts.

### Changed

- Improve detection of "meaningful" backup content: ignore `ingresos` when deciding whether a backup blocks template application; focus on `proveedores` and provider-related totals instead.
- Add conservative totals handling: prefer existing `totalIngresos` when preserving ingresos and recompute provider totals defensively.
- Add targeted debug logging in `hasBackupMeaningfulContent` to assist diagnosing backup-content checks.
- Minor component import: register `IonSplitPane` in `src/App.vue` for layout completeness.

### Files changed (staged)

- src/App.vue (modified)
- src/views/budget/BudgetView.vue (modified)
- src/views/templates/TemplatesView.vue (modified)

---

## [v0.7.0] - 2025-12-20

### Added

- Admin maintenance UI: `src/views/admin/MaintenancePage.vue` and `src/views/admin/maintenance/MigrateDates.vue` provide a guided interface to export backups, run a dry-run of the migration and apply date-normalization.
- Migration scripts: `scripts/run-normalize-dates.ts` and `src/migrations/normalizeBackupsDates.ts` implement a dry-runable migration that normalizes date fields inside stored backups and marks processed entries with `meta.__datesNormalized`.
- Documentation: `scripts/MIGRATE_README.md` — usage notes and safety steps for running the migration from the project.

### Features

- Add a runtime check and user notice: the app now detects backups that require normalization (`needsNormalizeCheck`) and shows a migration toast to guide users to the admin migration UI.
- Provide a CLI/ts-node script to run the migration outside the UI (`scripts/run-normalize-dates.ts`).
- Expose `parseLocalDate` utility and improve `formatLocalDate` behavior to reliably parse and produce local `YYYY-MM-DD` dates.

### Changed

- Centralized date parsing and formatting in `src/utils/date.ts` to avoid timezone-induced day shifts; prefer constructing local dates for plain `YYYY-MM-DD` strings and fall back to `parseISO` for full ISO timestamps.
- Integrate migration controls into `src/App.vue` (menu entry, toast notifications, navigation helpers) and wire the migration checks into app startup flow.
- Add store flag and controller helpers to allow users to dismiss the migration notice (`useSystemConfig` additions and `systemConfigController` helpers).
- Register admin routes in `src/router/index.ts` and add compatibility redirect for older `/admin/migrate-dates` path.

### Fixed

- Prevent incorrect date offsets caused by UTC parsing of plain date strings by explicitly constructing local dates when input is `YYYY-MM-DD`.
- Improve defensive parsing and logging across migration and UI code to reduce runtime exceptions during dry-runs and listing backups.

### Migration

- `migrateNormalizeBackupDates` supports `dryRun` and `verbose` modes. When applied it updates backup entries and sets `meta.__datesNormalized = true` to avoid reprocessing.
- A user-facing flow (export backup → dry-run → review → apply) is provided in the admin UI and documented in `scripts/MIGRATE_README.md`.

### Files changed (staged)

- scripts/MIGRATE_README.md (new)
- scripts/run-normalize-dates.ts (new)
- src/App.vue (modified)
- src/controllers/systemConfigController.ts (modified)
- src/migrations/normalizeBackupsDates.ts (modified)
- src/router/index.ts (modified)
- src/stores/useSystemConfig.ts (modified)
- src/utils/date.ts (modified)
- src/views/admin/MaintenancePage.vue (new)
- src/views/admin/maintenance/MigrateDates.vue (new)
- src/views/budget/BudgetView.vue (modified)
- src/views/statistics/cashFlow/day/DayChartComponent.vue (modified)
- src/views/statistics/cashFlow/day/DayComponent.vue (modified)
- src/views/statistics/cashFlow/month/MonthChartComponent.vue (modified)
- src/views/statistics/cashFlow/month/MonthComponent.vue (modified)
- src/views/statistics/cashFlow/week/WeekChartComponent.vue (modified)
- src/views/statistics/cashFlow/week/WeekComponent.vue (modified)
- src/views/statistics/cashFlow/year/YearComponent.vue (modified)
- src/views/statistics/performance/day/DayPerformanceComponent.vue (modified)
- src/views/statistics/performance/month/MonthPerformanceComponent.vue (modified)
- src/views/statistics/performance/week/WeekPerformanceComponent.vue (modified)
- src/views/statistics/performance/year/YearPerformanceComponent.vue (modified)
- src/views/templates/TemplatesView.vue (modified)
- src/views/templates/modals/ApplyTemplateComponent.vue (modified)

---
