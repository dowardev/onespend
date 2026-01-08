## [v0.25.4] - 2026-01-08

### Fix

- Fix 'this is undefined' error in SuppliersPage.vue
- Apply same fix as AccountsPage.vue - use controller methods directly
- Extract methods without binding causes 'this' to be undefined when called
- Changed from `const loadAll = suppliersController.listSuppliers` to `suppliersController.listSuppliers()`

---

## [v0.25.3] - 2026-01-08

### Fix

- Fix 'this is undefined' error in accountsController
- AccountsPage.vue now uses accountsController methods directly instead of extracting them
- Extract methods without binding causes 'this' to be undefined when called
- Changed from `const loadAll = accountsController.loadAll` to `accountsController.loadAll()`

---

## [v0.25.2] - 2026-01-08

### Refactor

- Refactor accountsController to manage store state directly instead of local state
- Simplify accountsStore to pure reactive state container without business logic
- Convert accountsStore to setup store syntax with only accounts array export
- Remove Account type definition from controller, move to store

### Architecture

- Implement View → Controller → Store pattern for accounts feature
- Controller now directly updates store state after IndexedDB operations
- Store becomes passive reactive state container managed by controller
- Consistent pattern with suppliers, budget, and templates refactoring

### Changed

- accountsController imports useAccountsStore and calls store methods for state updates
- getAccounts() returns store.accounts directly instead of local ref
- All CRUD operations (loadAll, addAccount, updateAccount, deleteAccount) update store immediately
- accountsController provides getAccountsStore() getter for store access

### Files Changed

- front/src/controllers/accountsController.ts (modified)
- front/src/stores/accountsStore.ts (modified)

---

## [v0.25.0] - 2026-01-08

### Refactor

- Convert suppliersStore from Options API to Composition API style with ref
- Refactor suppliersController to manage store state directly with loading/error handling
- Update budgetController to use lazy store initialization pattern
- Remove useSuppliers composable, consolidate to controller-based data access

### Changed

- suppliersController now imports useSuppliersStore directly instead of lazy imports
- suppliersController provides getSuppliers(), getLoading(), getError() getter functions
- All CRUD operations in suppliersController update store state immediately
- SuppliersPage.vue uses suppliersController exports instead of useSuppliers composable
- AccountsPage.vue uses accountsController for account operations

### Architecture

- Implement View → Controller → Store pattern for suppliers feature
- Store becomes pure reactive state container without business logic
- Controller manages persistence calls and state updates
- Consistent pattern with budget and templates refactoring

### Files Changed

- front/src/controllers/budgetController.ts (modified)
- front/src/controllers/suppliersController.ts (modified)
- front/src/stores/suppliersStore.ts (modified)
- front/src/stores/useSuppliers.ts (deleted)
- front/src/views/suppliers/SuppliersPage.vue (modified)
- front/src/views/suppliers/accounts/AccountsPage.vue (modified)

---

## [v0.24.1] - 2026-01-08

### Refactor

- Refactor budgetController to handle data persistence directly instead of delegating to store
- Simplify budgetStore to be only reactive state without persistence logic
- Convert budgetStore to use setup store syntax with setter functions only
- Refactor accountsController to provide reactive state for accounts data
- Convert accountsStore to use setup store syntax for consistency
- Remove direct store imports from Vue components, routing through controllers instead

### Architecture

- Implement strict View → Controller → Store data flow pattern
- Controller acts as single source of truth for data operations
- Store becomes pure reactive state container without business logic
- Components access data exclusively through controller exports

### Changed

- budgetController now manages dixieController persistence calls
- budgetStore provides setState functions for controller to update state
- accountsController manages reactive accountsState with ref
- Components (InicioViewComponent, ProvidersComponent, AccountCards) use controller exports only
- Removed watch-based auto-save, controller explicitly calls saveData()

### Files Changed

- front/src/controllers/budgetController.ts (modified)
- front/src/controllers/accountsController.ts (modified)
- front/src/stores/budgetStore.ts (modified)
- front/src/stores/accountsStore.ts (modified)
- front/src/views/budget/InicioViewComponent.vue (modified)
- front/src/views/budget/ProvidersComponent.vue (modified)
- front/src/views/budget/components/AccountCards.vue (modified)

---

## [v0.24.0] - 2026-01-08

### Refactor

- Refactor templates store to use Pinia setup store syntax
- Refactor templates controller to act as intermediary between views and store
- Update TemplatesView to access data through controller instead of local state
- Implement View → Controller → Store data flow pattern for templates feature

### Changed

- `templatesStore.ts` converted to setup store syntax with `ref` and returning functions
- `TempalteController.ts` now exposes `templates` getter and manages store updates
- `TemplatesView.vue` removed local `templates` ref, using `TemplateController.templates` instead
- Controller now directly updates store state after DB operations

### Files Changed

- front/src/stores/templatesStore.ts (modified)
- front/src/controllers/TempalteController.ts (modified)
- front/src/views/templates/TemplatesView.vue (modified)

---

## [v0.23.1] - 2026-01-08

### Changed

- Refactor budget views to use controller pattern for data access
- Create budgetController.ts as intermediary between views and budgetStore
- Update BudgetView to access data through budgetController instead of direct store access
- Update InicioViewComponent to use budgetController for entries and providers data
- Update ProvidersComponent to use budgetController for provider management
- Update AccountCards to use budgetController for entry operations

### Refactor

- Implement View → Controller → Store data flow pattern
- Views no longer have direct access to budgetStore, only through controller exports
- All data mutations go through controller functions that update the store

### Files Changed

- front/src/controllers/budgetController.ts (added)
- front/src/views/budget/BudgetView.vue (modified)
- front/src/views/budget/InicioViewComponent.vue (modified)
- front/src/views/budget/ProvidersComponent.vue (modified)
- front/src/views/budget/components/AccountCards.vue (modified)

---

## [v0.23.0] - 2026-01-07

### Changed

- Refactor InicioViewComponent to use accounts store instead of suppliers store
- Rename AddProveedorComponent to AddAccountComponent for consistency with accounts terminology
- Update all component props, emits, and references from "proveedor" to "account"

### Files Changed

- front/src/views/budget/InicioViewComponent.vue (modified)
- front/src/views/suppliers/accounts/modals/AddAccountComponent.vue (modified)

---

## [v0.22.0] - 2026-01-06

### Added

- Add support for multiple items per entry with groups array in Income interface
- Add entry items management UI with add/remove functionality for splitting amounts across accounts
- Add `getEntryAccountInfo` helper function to handle single and grouped account entries
- Add `availableAccountsForItem` computed property to prevent duplicate account selection within same entry
- Add hr separators and transparent item styling for improved visual hierarchy

### Changed

- Refactor InicioViewComponent entry modal to use item groups instead of single amount/account
- Refactor budgetStore `addIngreso` and `addEgreso` to accept optional groups parameter
- Refactor `updateIngreso` to use object spread for merging changes instead of individual property updates
- Improve account balance calculation to include entries with groups
- Improve account remaining calculation to track group-based account usage
- Update AccountCards to show accounts with transactions first, sorted by balance

### Files Changed

- front/src/stores/budgetStore.ts (modified)
- front/src/views/budget/InicioViewComponent.vue (modified)
- front/src/theme/variables.css (modified)

---

## [v0.21.0] - 2026-01-05

### Added

- Add Catppuccin Latte Maroon theme with complete color scheme for light mode
- Add Catppuccin Macchiato Maroon theme with complete color scheme for dark mode
- Add auto light theme selection in PersonalizationPage for customizable automatic light theme
- Add auto dark theme selection in PersonalizationPage for customizable automatic dark theme

### Changed

- Extend ThemeMode type to include catppuccin-latte-maroon and catppuccin-macchiato-maroon
- Refactor theme application logic in App.vue to support new Catppuccin themes
- Refactor setupThemeListener in App.vue to use cleaner approach for theme switching
- Update systemConfigController to expose auto light/dark theme getters and setters
- Update useSystemConfig store with autoLightTheme and autoDarkTheme state management
- Update PersonalizationPage UI with new theme selectors for auto mode customization

### Files Changed

- front/src/theme/files/catppuccin-latte-maroon.css (added)
- front/src/theme/files/catppuccin-macchiato-maroon.css (added)
- front/src/theme/variables.css (modified)
- front/src/controllers/systemConfigController.ts (modified)
- front/src/stores/useSystemConfig.ts (modified)
- front/src/App.vue (modified)
- front/src/views/admin/PersonalizationPage.vue (modified)
- front/package.json (version updated to 0.21.0)

---

## [v0.20.0] - 2026-01-05

### Changed

- Rebrand project from "AbOgaz" to "OneSpend" across all configurations
- Update app name in environment variables, desktop entry, and Ionic configuration
- Update version from 0.18.0 to 0.20.0

### Added

- Add Electron desktop support with electron-builder for cross-platform builds
- Add chart.js and vue-chartjs for data visualization capabilities
- Add PDF generation support with html2canvas and jspdf
- Add comprehensive development tools (prettier, eslint, typescript-eslint)

### Removed

- Remove duplicate CHANGELOG from frontend directory

### Files Changed

- front/.env (app name updated)
- front/ionic.config.json (name updated to OneSpend)
- front/build/abogaz.desktop (desktop entry renamed to OneSpend)
- front/package.json (version updated to 0.20.0, name changed to OneSpend)
- front/CHANGELOG.md (removed, consolidated to project root)
- README.md (updated)

---

## [v0.19.0] - 2026-01-05

### Changed

- Update version to 0.19.0 after Laravel backend implementation

---

## [v0.18.0] - 2026-01-05

### Added

- Add Laravel backend API with complete Laravel project structure
- Add database migrations for users table, cache, and jobs
- Add User model with fillable attributes for database relationships
- Add Composer configuration with required PHP dependencies
- Add RESTful API routing structure via web.php and console.php
- Add Vite configuration for asset compilation in backend
- Add environment configuration examples (.env.example)
- Add database seeders and factory patterns for user data generation

### Features

- Complete Laravel installation with MVC architecture
- Database connection setup for SQLite (default) with MySQL/PostgreSQL support
- Authentication scaffolding ready for future implementation
- Logging and caching configurations included
- Mail service configuration prepared for email notifications

### Files Changed

- back/.editorconfig (added)
- back/.env.example (added)
- back/.gitattributes (added)
- back/.gitignore (added)
- back/README.md (added)
- back/app/Http/Controllers/Controller.php (added)
- back/app/Models/User.php (added)
- back/app/Providers/AppServiceProvider.php (added)
- back/artisan (added)
- back/bootstrap/app.php (added)
- back/composer.json (added)
- back/composer.lock (added)
- back/config/*.php (multiple added)
- back/database/*.php (multiple added)
- back/package.json (added)
- back/phpunit.xml (added)
- back/public/* (added)
- back/resources/* (added)
- back/routes/* (added)
- back/storage/* (added)
- back/tests/* (added)
- back/vite.config.js (added)

---

## [v0.17.0] - 2026-01-04

### Added

- Add accounts management system with new controller (`accountsController.ts`) and Pinia store (`accountsStore.ts`) for CRUD operations
- Add `accountId` field to `addIngreso` and `addEgreso` functions in budgetStore for linking entries to accounts
- Add migration from suppliers to accounts for seamless data continuity
- Add "Sin cuenta" (No account) category in account cards for entries without account assignment
- Add cascade delete handling in AccountCards to clear account references when deleting accounts

### Changed

- Refactor InicioViewComponent to replace `useSuppliersStore` with `useAccountsStore`
- Update AccountCards.vue to use accounts store instead of suppliers store
- Fix account ID comparison to use string conversion for consistent matching

### Files changed (staged)

- src/controllers/accountsController.ts (added)
- src/stores/accountsStore.ts (added)
- src/stores/budgetStore.ts (modified)
- src/views/budget/InicioViewComponent.vue (modified)
- src/views/budget/components/AccountCards.vue (modified)

---

## [v0.16.0] - 2026-01-04

### Added

- Add "Cuentas" menu item in MainMenu for suppliers accounts navigation
- Add new route `/suppliers/accounts` for AccountsPage component
- Add `accountId` optional field to Income interface in budgetStore for linking entries to accounts
- Add AccountBarChart.vue component for visualizing account balances
- Add AccountCards.vue component for displaying accounts with their balances, ingresos, and egresos
- Add AccountsPage.vue as main page for supplier accounts management
- Add AddAccountComponent.vue modal for creating new supplier accounts

### Changed

- Refactor InicioViewComponent to use modals instead of popovers for adding/editing entries and providers
- Replace SummaryCards component with AccountCards to show account balances instead of payment method summaries
- Add `isSuppliersAccounts` computed property in MainMenu for active menu state

### Files changed (staged)

- src/components/MainMenu.vue (modified)
- src/router/index.ts (modified)
- src/stores/budgetStore.ts (modified)
- src/views/budget/InicioViewComponent.vue (modified)
- src/views/budget/components/AccountBarChart.vue (added)
- src/views/budget/components/AccountCards.vue (added)
- src/views/suppliers/accounts/AccountsPage.vue (added)
- src/views/suppliers/accounts/modals/AddAccountComponent.vue (added)

---

## [v0.16.0] - 2026-01-03

### Added

- Add `egresosEfectivo` and `egresosTarjeta` computed properties in budgetStore for tracking expenses by payment method

### Changed

- Refactor InicioViewComponent to display entries as flat list instead of grouped by provider, removing accordion-based UI and group delete functionality
- Refactor SummaryCards to show income vs expense differences per payment method (efectivo, tarjeta) instead of separate estimate values
- Simplify SummaryCards props by replacing `totalEstimacion*` and `providers`/`selectedDate` with direct `totalIngresosEfectivo`, `totalIngresosTarjeta`, `totalEgresosEfectivo`, `totalEgresosTarjeta` props

### Removed

- Remove credit card display section from SummaryCards component
- Remove provider group delete confirmation alert from InicioViewComponent

### Files changed (staged)

- src/stores/budgetStore.ts (modified)
- src/views/budget/InicioViewComponent.vue (modified)
- src/views/budget/components/SummaryCards.vue (modified)

---

## [v0.15.2] - 2026-01-02

### Added

- Add centralized `finishDayData` state in budgetStore with sales totals (efectivo, tarjeta, credito), margin type, and margin value

### Changed

- Refactor `finishDay` in BudgetView to use centralized store state instead of local reactive object
- Simplify `saveFinishDay` function to leverage store auto-save mechanism
- Add toast notification feedback in FinishDayForm when saving finish day data
- Restructure maintenance pages (MigrateDates, MigrateEntries, MaintenancePage) with ion-grid layout for better centering and organization

### Files changed (staged)

- src/stores/budgetStore.ts (modified)
- src/views/budget/BudgetView.vue (modified)
- src/views/budget/FinishDayForm.vue (modified)
- src/views/admin/MaintenancePage.vue (modified)
- src/views/admin/maintenance/MigrateDates.vue (modified)
- src/views/admin/maintenance/MigrateEntries.vue (modified)

---

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
