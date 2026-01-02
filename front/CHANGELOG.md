## [v0.15.1] - 2026-01-02

### Added

- Add provider notes modal with save functionality in ProvidersComponent

### Fixed

- Filter providers to show only those with actual financial data (efectivo, tarjeta, credito, dollar, estimated) in InicioViewComponent

### Changed

- Standardize comments across budget and statistics views (popovers, alerts, modals sections)
- Refactor popover content styling to use ion-item with ion-label instead of ion-button for better UX
- Update popover dismiss behavior from keep-contents-mounted to dismiss-on-select

### Files changed (staged)

- src/components/statistics/PeriodLayout.vue (modified)
- src/views/budget/BudgetView.vue (modified)
- src/views/budget/InicioViewComponent.vue (modified)
- src/views/budget/ProviderCardComponent.vue (modified)
- src/views/budget/ProvidersComponent.vue (modified)
- src/views/statistics/cashFlow/day/DayComponent.vue (modified)
- src/views/statistics/cashFlow/month/MonthComponent.vue (modified)
- src/views/statistics/cashFlow/week/WeekComponent.vue (modified)
- src/views/statistics/cashFlow/year/YearComponent.vue (modified)
- src/views/statistics/performance/day/DayPerformanceComponent.vue (modified)
- src/views/statistics/performance/month/MonthPerformanceComponent.vue (modified)
- src/views/statistics/performance/week/WeekPerformanceComponent.vue (modified)
- src/views/statistics/performance/year/YearPerformanceComponent.vue (modified)
- src/views/suppliers/SuppliersPage.vue (modified)
- src/views/templates/TemplatesView.vue (modified)

---

## [v0.15.0] - 2026-01-01

### Added

- Extract main menu into reusable `MainMenu.vue` component with proper emits for navigation and migration dismissal
- Redesign `SummaryCards.vue` "required" section with card-based design showing Sobrante/Faltante/Cuadrado status with color-coded results for efectivo, tarjeta, and credito

### Changed

- Refactor `App.vue` to use `MainMenu` component instead of inline menu template
- Add card shadow CSS variables (`--card-shadow-light`, `--card-shadow-heavy`, `--card-shadow-subtle`) for theme consistency in both light and dark modes
- Add `.ion-padding-top` class to `BudgetView.vue` section for better spacing
- Adjust `InicioViewComponent` column size from 2 to 3 for improved layout

### Files changed (staged)

- src/App.vue (modified)
- src/components/MainMenu.vue (added)
- src/theme/files/dark.css (modified)
- src/theme/files/light.css (modified)
- src/theme/variables.css (modified)
- src/views/budget/BudgetView.vue (modified)
- src/views/budget/InicioViewComponent.vue (modified)
- src/views/budget/components/SummaryCards.vue (modified)

---

## [v0.14.0] - 2026-01-01

### Added

- Add dark mode theme system with complete dark color scheme variables (`src/theme/files/dark.css`)
- Add personalization page (`src/views/admin/PersonalizationPage.vue`) with theme selection (light/dark/auto)
- Add theme persistence using new config storage methods (`getConfig`, `setConfig`) in dixie.ts
- Add ThemeMode type and theme management in useSystemConfig store
- Add system theme listener to auto-apply theme changes when system preference changes

### Changed

- BudgetView now respects day closed state by disabling navigation and date controls
- ProvidersComponent UI cleanup by removing redundant summary section
- App.vue theme initialization now applies saved theme preference on mount

### Files changed (staged)

- src/App.vue (modified)
- src/controllers/dixie.ts (modified)
- src/controllers/systemConfigController.ts (modified)
- src/router/index.ts (modified)
- src/stores/useSystemConfig.ts (modified)
- src/theme/files/dark.css (added)
- src/theme/variables.css (modified)
- src/views/admin/PersonalizationPage.vue (added)
- src/views/budget/BudgetView.vue (modified)
- src/views/budget/ProvidersComponent.vue (modified)

---

## [v0.13.0] - 2026-01-01

### Added

- Add new Pinia store for budget state management (`src/stores/budgetStore.ts`) with centralized handling of entries, providers, day state, computed totals, and auto-save functionality
- Add debounced auto-save with watchers for entries, providers, and day closed state
- Add comprehensive computed properties for financial calculations: totalIngresos, totalEgresos, netTotal, totalEfectivo, totalTarjeta, totalCredito, totalEstimacion, faltante, ingresosEfectivo, ingresosTarjeta
- Add provider group operations with tracking via `_fromProviderGroupId` and `_providerName`

### Changed

- Refactor BudgetView to use centralized budgetStore instead of local reactive state
- Simplify BudgetView by removing complex popover and modal handling logic
- Update InicioViewComponent to integrate with budgetStore for entries and providers data
- Update ProvidersComponent to use budgetStore for provider management operations
- Remove inline type definitions from BudgetView, leveraging store types instead

### Files changed (staged)

- src/stores/budgetStore.ts (added)
- src/views/budget/BudgetView.vue (modified)
- src/views/budget/InicioViewComponent.vue (modified)
- src/views/budget/ProvidersComponent.vue (modified)

---

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
