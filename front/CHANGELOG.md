## [v0.12.1] - 2025-12-30

### Fixed

- Fix typos in ProvidersSummary component (`io-label` → `ion-label`)
- Update ProvidersComponent prop naming to follow Vue kebab-case convention

### Changed

- Refactor BudgetView by removing unused template modal and supplier popover functionality
- Remove unused `initialPreviewPayload` prop from ProvidersComponent

### Files changed (staged)

- src/views/budget/BudgetView.vue (modified)
- src/views/budget/ProvidersComponent.vue (modified)
- src/views/budget/components/ProvidersSummary.vue (modified)

---

## [v0.12.0] - 2025-12-28

### Added

- Add migration to copy `ingresos` -> `entries` in old backups (`src/migrations/addEntriesKeyToBackups.ts`) and a `needsEntriesKeyCheck` helper.
- Add admin maintenance UI to run the entries migration (`src/views/admin/maintenance/MigrateEntries.vue`) and route (`/admin/maintenance/migrate-entries`).
- Add new budget views/components: `InicioViewComponent.vue`, `ProvidersComponent.vue`, `ProvidersSummary.vue`, `SummaryCards.vue` to support provider summaries and cards.
- Add `normalizeName` utility for supplier/provider name normalization (`src/utils/date.ts`).

### Fixed

- Improve merging of backup data to correctly preserve `entries` arrays when combining backups (`src/controllers/migrationService.ts`).
- Various logging cleanups (replace noisy console logs with comments) across controllers and services.

### Changed

- App now detects when an entries migration is required and guides the user to the appropriate maintenance page (`src/App.vue`).
- Router updated to expose the new migration page and maintenance navigation (`src/router/index.ts`, `src/views/admin/MaintenancePage.vue`).
- Template service and other helpers now initialize `entries` arrays where applicable to ensure consistent shape (`src/controllers/templateService.ts`).
- Multiple performance and UI improvements across statistics and budget views.

### Files changed (staged)

- package.json (version bump)
- src/App.vue (modified)
- src/controllers/backupController.ts (modified)
- src/controllers/dixie.ts (modified)
- src/controllers/migrationService.ts (modified)
- src/controllers/templateService.ts (modified)
- src/migrations/addEntriesKeyToBackups.ts (added)
- src/migrations/normalizeBackupsDates.ts (modified)
- src/router/index.ts (modified)
- src/utils/date.ts (modified)
- src/views/admin/MaintenancePage.vue (modified)
- src/views/admin/maintenance/MigrateEntries.vue (added)
- src/views/budget/BudgetView.vue (modified)
- src/views/budget/InicioViewComponent.vue (added)
- src/views/budget/ProviderCardComponent.vue (modified)
- src/views/budget/ProvidersComponent.vue (added)
- src/views/budget/components/ProvidersSummary.vue (added)
- src/views/budget/components/SummaryCards.vue (added)
- src/views/statistics/cashFlow/day/DayComponent.vue (modified)
- src/views/statistics/cashFlow/month/MonthComponent.vue (modified)
- src/views/statistics/cashFlow/week/WeekComponent.vue (modified)
- src/views/statistics/cashFlow/year/YearComponent.vue (modified)
- src/views/statistics/performance/day/DayPerformanceComponent.vue (modified)
- src/views/statistics/performance/month/MonthPerformanceComponent.vue (modified)
- src/views/statistics/performance/week/WeekPerformanceComponent.vue (modified)
- src/views/statistics/performance/year/DayPerformanceComponent.vue (modified)

---

## [v0.11.0] - 2025-12-23

### Fixed

- Remove duplicated and stray code in `BudgetView.vue` that caused Vue SFC parsing errors.
- Refactor `saveProductsModal`, `applyTemplateFromModal`, `onMoveProvider` and `saveFinishDay` in `src/views/budget/BudgetView.vue` to extract helper functions and improve clarity while preserving behavior.

### Changed

- Internal reorganizations and helper extractions inside `src/views/budget/BudgetView.vue` to improve maintainability (no external API changes).

### Files changed (staged)

- src/views/budget/BudgetView.vue (modified)
- src/views/budget/ProviderCardComponent.vue (modified)
- src/views/templates/modals/ApplyTemplateComponent.vue (modified)
- src/views/budget/FinishDayForm.vue (added)

---

## [v0.10.1] - 2025-12-23

### Fixed

- Remove duplicated and stray code in `BudgetView.vue` that caused Vue SFC parsing errors.
- Refactor `saveProductsModal`, `applyTemplateFromModal`, `onMoveProvider` and `saveFinishDay` in `src/views/budget/BudgetView.vue` to extract helper functions and improve clarity while preserving behavior.

### Changed

- Internal reorganizations and helper extractions inside `src/views/budget/BudgetView.vue` to improve maintainability (no external API changes).

### Files changed (staged)

- src/views/budget/BudgetView.vue (modified)
- src/views/budget/ProviderCardComponent.vue (modified)
- src/views/templates/modals/ApplyTemplateComponent.vue (modified)
- package.json (version bump)

---
