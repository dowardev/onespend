## [v0.54.0] - 2026-02-17

### Features

- **Quick Account Creation**: Add ability to create accounts directly from provider modals
  - New `quick-account` event emitted from EditProviderModal when clicking the add icon next to account selector
  - ProvidersComponent and InicioViewComponent now handle `@quick-account` event with an alert dialog
  - Alert provides inputs for account name and optional initial balance
  - New accounts are created via `accountsCtrl.addAccount()` and accounts are reloaded after creation

### Refactor

- **EditProviderModal Segment Tabs**: Restructure modal with segment navigation in full mode
  - Add `ion-segment` with "Inicio" and "Productos" tabs for better organization
  - Account amounts section now lives in "Inicio" segment
  - Products section moved to "Productos" segment
  - Add icon button next to account selector to trigger quick account creation

### Fixes

- **SuppliersPage Edit Parameter**: Fix incorrect parameter name in edit handler
  - Changed `@click="edit({ s })"` to `@click="edit({ supplier: s })"` to match expected parameter name

### Improvements

- **AddSupliersComponent Form Handling**: Multiple improvements to supplier form
  - Replace `ion-card` with `ion-item` for form input layout
  - Add `toRaw` import from Vue for proper reactive handling
  - Improve image compression with better dimension reduction (max 1024px)
  - Fix product watching with `toRaw` to prevent reactive proxy issues
  - Add comprehensive console logging for debugging product add/submit operations

### Files Changed (staged)

- `front/src/views/budget/InicioViewComponent.vue` — Add `@quick-account` event handler
- `front/src/views/budget/ProvidersComponent.vue` — Add quick account alert functionality
- `front/src/views/budget/components/EditProviderModal.vue` — Add segment tabs and quick-account event
- `front/src/views/suppliers/SuppliersPage.vue` — Fix edit parameter name
- `front/src/views/suppliers/modals/AddSupliersComponent.vue` — Improve form handling and image compression
- `front/package.json` — Bump version to 0.54.0

---

## [v0.53.6] - 2026-02-16

### Refactor (UI)

- **Budget Entry Modals UI Refactoring**: Update EditEntryModal and EditProviderModal for improved layout and modern Ionic patterns
  - Replace `ion-card` elements with `div` for better layout control and styling
  - Update form inputs from `ion-label position="stacked"` to modern `label-placement="floating"` pattern
  - Simplify EditProviderModal by removing segment control (inicio/productos) and restructuring layout
  - Improve spacing with conditional padding based on item position in lists
  - Enhanced account selector with disabled state when no accounts available

### Files Changed (staged)

- `front/src/views/budget/components/EditEntryModal.vue` — UI refactor: div-based layout, floating labels, improved spacing
- `front/src/views/budget/components/EditProviderModal.vue` — UI refactor: remove segments, div layout, floating labels
- `front/package.json` — Bump version to 0.53.6

---

## [v0.53.5] - 2026-02-15

### Refactor

- **EditProviderModal Initialization**: Extract modal initialization logic into dedicated functions
  - Added `resetModalState()` to reset modal state on open
  - Added `initializeEntryMode()` for entry mode initialization
  - Added `initReassignDate()` and `setTodayDate()` for date handling
  - Added `initializeNewProviderMode()` for new provider flow
  - Improved type definition for `items` ref with better TypeScript support
  - Reorganized watch on `isOpen` to use the new initialization functions

### Files Changed (staged)

- `front/src/views/budget/components/EditProviderModal.vue` — Extract initialization logic into separate functions
- `front/package.json` — Bump version to 0.53.5

---

## [v0.53.4] - 2026-02-15

### Fixes

- **Provider Data Source**: Fix provider list to use `budgetController.getProviders()` instead of `suppliersController.getSuppliers()`
  - The `allSuppliers` computed property in InicioViewComponent was referencing wrong data source
  - Providers now correctly loaded from budget data instead of standalone suppliers

### Improvements

- **Provider Selection UX**: Enhanced provider selection flow in EditProviderModal
  - Added `isSelectingProvider` state for clearer selection flow
  - Display estimated price in provider list items
  - Better state reset when opening modal for new providers

### Refactor

- **Provider Data Loading**: Improved provider mode initialization and data handling
  - Added `handleProviderClick` function for provider change flow
  - Enhanced `selectProvider` with defensive checks and fallback logic
  - Better loading of provider products and items with estimated amounts support

### Files Changed (staged)

- `front/src/views/budget/InicioViewComponent.vue` — Fix allSuppliers to use budgetController.getProviders()
- `front/src/views/budget/components/EditProviderModal.vue` — Improve provider selection flow and data loading
- `front/package.json` — Bump version to 0.53.4

---

## [v0.53.3] - 2026-02-15

### Refactor

- **EditProviderModal Rework**: Heavy refactor and UI adjustment to provider edit modal
  - Move date reassignment UI into the modal form for entry mode (removed header ellipsis trigger)
  - Reorganize script sections (imports → controllers → components → interfaces → main → vars → watch → computed → functions)
  - Improve types and interfaces (ProviderItem, Account, Supplier, Product, PendingProduct, ProviderData)
  - Add robust date parsing/normalization helpers and sync between ISO/short date values
  - Replace fragile v-model/picker handling with remount strategy and computed `canApplyReassign` for reliable Apply enablement
  - Remove debug console/log statements and other noisy code paths
  - Small API emission cleanup: emit('reassign-date', date) used consistently for parent handling
  - Net changes in modal: ~412 insertions, ~499 deletions (restructure + bug fixes)

### Files Changed (staged)

- `front/src/views/budget/components/EditProviderModal.vue` — Rework modal: inline date selector for entry mode, types, helpers and cleanup
- `front/package.json` — Bump version to 0.53.3

---

## [v0.53.2] - 2026-02-15

### Refactor

- **EditEntryModal Code Organization**: Major refactoring of EditEntryModal.vue for improved maintainability
  - Added structured section comments (header, content, popovers, alerts, imports, vars, watch, computed, functions)
  - Removed unused imports (IonAlert, calendarOutline, ellipsis icons) and added necessary ones (IonListHeader, IonCard)
  - Introduced helper functions for better date handling: parseEntryDate, toISODateTime, resolveEntryDate, initEntryItems
  - Reorganized script sections following codebase conventions (imports → controllers → components → interfaces → main → vars → watch → computed → onMounted → functions)
  - Removed debug console.log statements for cleaner production code
  - Added 'reassigned' emit event for better parent component communication
  - Net code reduction: 139 lines (293 insertions, 432 deletions)

### Files Changed (staged)

- `front/src/views/budget/components/EditEntryModal.vue` — Major code organization refactor with section markers and helper functions
- `front/package.json` — Bump version to 0.53.2

---

## [v0.53.1] - 2026-02-15

### Fixes

- **Entry Date Editing**: Enable date change when editing existing entries
  - Removed redundant ellipsis button that opened a separate reassignment popover
  - Added date picker directly in the edit form for better UX
  - Entries now support changing dates during edit operations via `reassignEntry()`
  - Date changes trigger automatic reassignment to the new date bucket
  - Fixed payload to include date for both new entries and updates

### Files Changed (staged)

- `front/src/views/budget/InicioViewComponent.vue` — Handle date changes during entry saves with reassignment logic
- `front/src/views/budget/components/EditEntryModal.vue` — Add date picker to edit form, remove ellipsis button, improve date handling

---

## [v0.53.0] - 2026-02-15

### Features

- **Entry Date Selection**: Add date picker for new income/expense entries
  - Users can now select a custom date when creating new entries via EditEntryModal
  - Date picker popover with "Today" shortcut and apply/cancel actions
  - Entries are saved to the selected date bucket, not just the currently selected date
  - Date displayed in format DD/MM/YY in the entry form

### Improvements

- **Multi-Date Entry Support**: Save entries to any date from the entry creation modal
  - `addIngreso()` and `addEgreso()` methods in budgetController now accept optional `date` parameter
  - New `saveEntryToDate()` private method handles saving entries to non-current date buckets
  - Automatically serializes entries to plain objects to avoid Proxy serialization issues
  - Console logging for debugging date assignments and bucket saves

### Refactor

- **Template Organization**: Clean up section comments in TemplateView.vue
  - Consolidated and standardized section comment structure
  - Fixed typo: "ansd" → "and" in comments

### Files Changed (staged)

- `front/src/controllers/budgetController.ts` — Add date parameter support and cross-date entry saving
- `front/src/views/TemplateView.vue` — Refactor section comments
- `front/src/views/budget/InicioViewComponent.vue` — Pass date through entry save flow
- `front/src/views/budget/components/EditEntryModal.vue` — Add date picker UI and entry date state management
- `front/package.json` — Bump version to 0.53.0

---

## [v0.52.0] - 2026-02-12

### Features

- Move Day Summary to modal and improve day overview UX
  - Day summary is now available in a dedicated modal with improved layout and accessibility

### Improvements

- Provider reassignment reliability and edit flow
  - Improve fallback logic when moving provider entries between dates to prefer move.Verify and perform remove+create only when needed
  - Add defensive date handling and clearer debug logging in `InicioViewComponent`

- UI and template refactors in Budget views
  - Restructure `BudgetView.vue` template to simplify segments and centralize date navigation buttons
  - Consistent spacing, import formatting, and template class usage across components
  - Adjust grid column sizes for `InicioViewComponent` and `ProvidersComponent` for better responsiveness

- Day summary component polish
  - `DaySummaryModal.vue` revamped: clearer list sections (Totals, Top Providers, Top Accounts, Details) and improved formatting
  - Computed and helper utilities cleaned up for stable formatting and edge-case handling

### Fixes

- Minor bug and defensive fixes across budget components
  - Normalize timestamp and date parsing in reassignment flows and datetime pickers
  - Prevent unsafe array operations and coercions; improve string/number comparisons

### Files Changed (staged)

- `front/src/views/budget/BudgetView.vue`
- `front/src/views/budget/InicioViewComponent.vue`
- `front/src/views/budget/ProvidersComponent.vue`
- `front/src/views/budget/components/DaySummaryModal.vue`
- `front/src/views/budget/components/EditEntryModal.vue`
- `front/package.json` — bump version to 0.52.0

---

## [v0.50.0] - 2026-02-10

### Features

- **Chart Modals for Performance**: Add dedicated pie chart modals for visualizing income and expense breakdowns
  - `ExpensesChartModal.vue` - Displays interactive pie chart showing expenses grouped by category with detailed breakdown list and total
  - `IncomesChartModal.vue` - Displays interactive pie chart showing incomes grouped by source with detailed breakdown list and total
  - Both modals include formatted currency display, color-coded pie charts, and responsive design

- **Balance Color Coding**: Add visual feedback for balance status in PerformanceComponent
  - Positive balances displayed in success color (green)
  - Negative balances displayed in danger color (red)

### Refactor

- **EntriesChart.vue**: Minor code cleanup and template formatting improvements
  - Reorder v-if/v-else directives for consistency
  - Improve ChartJS.register call formatting
  - Clean up CSS styles

- **EntriesList.vue**: Template refactoring for better component organization
  - Move EntriesChart inside list content div
  - Improve import formatting

- **PerformanceComponent.vue**: Color array refactoring for improved maintainability
  - Split color arrays for incomes and expenses into multi-line format

### Files Changed

- `front/src/views/statistics/performance/components/ExpensesChartModal.vue` — New pie chart modal for expenses breakdown
- `front/src/views/statistics/performance/components/IncomesChartModal.vue` — New pie chart modal for incomes breakdown
- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — Add balance color coding and wire chart modals
- `front/src/views/statistics/performance/components/EntriesChart.vue` — Template and code cleanup
- `front/src/views/statistics/performance/components/EntriesList.vue` — Template refactoring
- `front/package.json` — Bump version to 0.50.0

---

## [v0.49.0] - 2026-02-09

### Features

- **usePeriodRange composable**: Extract date/period logic into a reusable composable (`front/src/composables/usePeriodRange.ts`)
  - Provides `referenceDate`, `dateLabel`, `getBudgetDateRange`, `getPreviousPeriodDateRange`, `prevPeriod`, `nextPeriod`, `resetToToday`
  - Supports configurable week start day
  - Exports `PeriodType`, `DateRange`, `UsePeriodRangeReturn` types

- **EntriesList component**: Create reusable list component for income/expense entries (`front/src/views/statistics/performance/components/EntriesList.vue`)
  - Props: `title`, `items`, `total`, `footerLabel`
  - Emits: `edit`, `openChart`
  - Includes empty state message when no entries
  - Uses stable keys (`:key="item.id"`) instead of index

### Refactor

- **PerformanceComponent.vue**: Major refactor reducing ~35% code (903 → 590 lines)
  - Replace duplicated income/expense lists with `EntriesList` component
  - Replace inline date logic with `usePeriodRange` composable
  - Remove debug `console.log` statements
  - Move inline styles to CSS classes (`.total-amount`)
  - Improve type safety for `accountsList` and `EntryGroup`

- **statisticsController.ts**: Export `Snapshots` type alias for external use

### Files Changed

- `front/src/composables/usePeriodRange.ts` — new composable for period/date logic
- `front/src/views/statistics/performance/components/EntriesList.vue` — new reusable list component
- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — refactored to use new composable and component
- `front/src/controllers/statisticsController.ts` — export Snapshots type
- `front/package.json` — bump version to 0.49.0

---

## [v0.48.0] - 2026-02-08

## [v0.48.2] - 2026-02-09

### Features

- Restore chart buttons to Performance lists: Reintroduce compact chart action buttons in the "Ingresos" and "Gastos" list headers so users can open visualizations for those lists.
- Wire existing chart modals: Hook `IncomesChartModal` and `ExpensesChartModal` into `PerformanceComponent.vue` using `IonModal` and reactive flags (`showIncomesModal`, `showExpensesModal`).

### Files Changed

- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — add chart header buttons and wire Incomes/Expenses chart modals
- `front/package.json` — bump frontend package version to 0.48.2



## [v0.48.1] - 2026-02-09

### Fixes

- **Remove "Más detalles" modal**: Completely remove the user-invoked "Más detalles" modal flow and all related plumbing between `PerformanceComponent.vue` and `PeriodLayout.vue`.
  - Remove header button that opened the modal from `PerformanceComponent.vue` and delete the `#modal-content` slot usage.
  - Remove modal template and modal-related props/watchers/functions from `PeriodLayout.vue` and clean unused modal imports/icons.
  - Remove modal state (`modalOpen`) and sync handler (`setModalFromLayout`) from `PerformanceComponent.vue`.

### Cleanup

- **Remove backup files referencing modal state**: Deleted legacy `.bak` component backups that referenced modal behavior (day/week/month/year components and PerformancePage backups).

### Files Changed

- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — Remove modal invocation, header button and related state
- `front/src/views/statistics/performance/components/PeriodLayout.vue` — Remove modal template and modal-related script (props/watchers/functions)
- `front/package.json` — Bump frontend package version to 0.48.1
- Deleted: `.bak` backup files under `front/src/views/statistics/performance`


### Features

- **Reassign Entry Composable**: Add a reusable composable to centralize logic for moving budget entries between date buckets.
  - `front/src/composables/useReassignEntry.ts` provides `reassignEntry({ entryId, newDate, originalDate?, restoreSelectedDate?, verbose? })` which loads source bucket, updates entry date, persists changes, verifies move and falls back to remove+create if necessary.
- **Wire EditEntryModal to parents**: Parent components now handle `reassign-date` via the composable.
  - `PerformanceComponent.vue` and `InicioViewComponent.vue` call the composable instead of duplicating move logic.

### Fixes & Improvements

- Improve ion-datetime reliability in `EditEntryModal.vue` by forcing remount and normalizing ISO/short date values; read picker raw value on quick clicks to avoid race conditions.
- Coerce ID comparisons (`String(id)`) and accept multiple date formats (ISO, timestamp, Date) for robustness.

### Files Changed

- `front/src/composables/useReassignEntry.ts` — New composable implementing move/update/verify/fallback logic
- `front/src/views/budget/components/EditEntryModal.vue` — Picker reliability, emit behavior and local fallback preserved
- `front/src/views/budget/InicioViewComponent.vue` — Wire `@reassign-date` to composable and ensure modal `date` is initialized
- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — Replace inline move logic with composable call
- `front/package.json` — Bump frontend package version to 0.48.0

---

## [v0.47.1] - 2026-02-08

### Features

- **Entry Editing in Performance Component**: Added complete edit functionality for income and expense entries
  - New EditEntryModal integration for modifying entry details (name, amount, account, groups)
  - Add button and click handlers to income and expense list items
  - Entry data preservation with proper spreading of entry properties
  - Delete confirmation with IonAlert dialog before removal
  - Support for entries with multiple account groups
  - Real-time data refresh after save and delete operations

### Improvements

- **Account Data Loading**: Ensure accounts are loaded early in the application lifecycle
  - Added accountsController.loadAll() call in App.vue onMounted
  - Added accountsController.loadAll() call in BudgetView.vue onMounted
  - Prevents potential data race conditions when accessing account information

### Files Changed

- `front/src/App.vue` — Add accountsController import and loadAll() call on mount
- `front/src/views/budget/BudgetView.vue` — Add accountsController.loadAll() call on mount
- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — Add EditEntryModal integration, edit/delete functionality, and accountsController dependency
- `front/package.json` — Bump version to 0.47.1

---

## [v0.47.0] - 2026-02-08

### Features

- **Configurable Week Start Day**: Added new system configuration for customizing which day the week starts on
  - New `weekStartDay` preference stored in system config (options: Sunday=0, Monday=1, Saturday=6)
  - Added `getWeekStartDay()` and `setWeekStartDay()` methods to systemConfigController
  - Integrated week start configuration into useSystemConfig Pinia store
  - Updated PersonalFinanceConfigModal to provide week start day selection UI

### Refactor

- **PerformanceComponent Simplification**: Major refactoring to streamline the performance dashboard
  - Removed budget chart modal components (IncomesChartModal, ExpensesChartModal, BudgetIncomesChartModal, BudgetExpensesChartModal)
  - Simplified balance display by removing projected balance section
  - Replaced hardcoded financial values with dynamic data from budget entries
  - Added configurable week boundary functions: `startOfWeekWithConfig()` and `endOfWeekWithConfig()`
  - Cleaned up imports and removed unused dependencies (DixieController, downloadOutline, informationCircleOutline)

- **PersonalFinanceConfigModal Simplification**: Reduced from complex budget configuration to focused settings
  - Eliminated fixed incomes management section
  - Removed budget categories configuration
  - Removed Vuelidate form validation dependencies
  - Streamlined to single purpose: week start day configuration
  - Removed period selection for categories/incomes

### Improvements

- **Date Navigation**: Week period boundaries now respect the configured week start day
  - `getBudgetDateRange()` and `getPreviousPeriodDateRange()` use configurable week boundaries
  - Better alignment between user preferences and financial reporting periods
- **Data Flow**: Simplified income/expense totals by computing directly from period entries
  - `expensesTotal` computed from non-income entries in period
  - `incomesTotal` computed from income-type entries in period
  - Removed complex category-to-expense mapping logic

### Files Changed

- `front/src/controllers/systemConfigController.ts` — Add getWeekStartDay/setWeekStartDay methods
- `front/src/stores/useSystemConfig.ts` — Add weekStartDay state and persistence
- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — Major refactor, add configurable week boundaries, simplify data flow
- `front/src/views/statistics/performance/components/PersonalFinanceConfigModal.vue` — Simplify to week start day configuration only
- `front/package.json` — Bump version to 0.47.0

---

## [v0.46.3] - 2026-02-05

### Features

- **Budget Chart Modals**: Added new modal components for visualizing budget data with interactive pie charts
  - `BudgetDetailModal.vue` - Displays detailed breakdown of budget items with sorted transaction list
  - `BudgetExpensesChartModal.vue` - Pie chart visualization showing budget expenses breakdown
  - `BudgetIncomesChartModal.vue` - Pie chart visualization showing budget incomes breakdown
  - Both chart modals include detailed item lists with totals and formatted currency display

- **Fixed Incomes Configuration**: Extended PersonalFinanceConfigModal with comprehensive fixed income management
  - New `FixedIncome` interface supporting multiple income types (salary, investments, bonuses, commissions, rental income, dividends, freelance, other)
  - Dedicated UI section for managing fixed incomes with add/remove functionality
  - Popover selector for choosing predefined income types or creating custom entries
  - Configurable interval and period settings for each income source

- **Advanced Balance Calculations**: Introduced new financial metrics for better budget tracking
  - `realBalance` - Calculated as budget incomes minus budget expenses for the current period
  - `projectedBalance` - Projects future balance by adding fixed incomes and subtracting fixed expenses
  - `budgetIncomesTotal` and `budgetExpensesTotal` - Aggregated totals for budget-based transactions

- **Enhanced Date Navigation**: Refactored date handling system for more intuitive period navigation
  - Replaced `selectedDate` + `periodOffset` pattern with single `referenceDate` state
  - Added watch on `period` prop to automatically reload data when period changes
  - Improved date range computation for day/week/month/year periods
  - Better period boundary handling for navigation buttons (prev/next)

### Improvements

- **Period-Based Data Loading**: Enhanced data loading to iterate through complete date ranges
  - `loadData()` function now processes each day within the selected period range
  - Aggregates entries from multiple days for accurate period-based reporting
  - Previous period comparisons now properly calculated using full date ranges

- **Budget Summary UI**: New dedicated sections for Budget Incomes and Budget Expenses
  - Added stats chart buttons to open income/expense breakdown modals
  - New `realBalance` and `projectedBalance` display cards with color-coded formatting
  - Improved period label formatting showing full date ranges (e.g., "01 - 28 feb 2026")

- **Configuration Loading**: Added `categoriesLoaded` flag to control when custom categories are applied
  - Prevents empty category defaults from affecting the UI until data is fully loaded
  - Better handling of configuration persistence across sessions

### Bug Fixes

- **Date Navigation**: Fixed period navigation to respect period boundaries (weeks start on Monday, months show full range)
- **Income Calculation**: Fixed income totals to properly use fixed incomes configuration when available
- **Expense Display**: Removed redundant period labels from expense list items for cleaner UI

### Files Changed

- `front/src/views/statistics/performance/components/BudgetDetailModal.vue` — New modal component for budget item details
- `front/src/views/statistics/performance/components/BudgetExpensesChartModal.vue` — New pie chart modal for expenses
- `front/src/views/statistics/performance/components/BudgetIncomesChartModal.vue` — New pie chart modal for incomes
- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — Add chart modals, balance calculations, refactor date handling
- `front/src/views/statistics/performance/components/PersonalFinanceConfigModal.vue` — Add fixed incomes configuration section
- `front/package.json` — Bump version to 0.46.3

---

## [v0.46.2] - 2026-02-02

### Features

- **Period-Based Expense Calculation**: Added support for flexible expense period tracking
  - Categories now support `interval` (frequency count) and `period` (daily/weekly/biweekly/monthly/yearly) fields
  - New `getPeriodDivider()` and `getPeriodLabel()` utilities convert various periods to monthly equivalents
  - `expensesList` computed property now calculates adjusted monthly amounts based on category frequency
  - Users can specify expenses that occur every N days, weeks, quincenas, months, or years
  - Automatic normalization to monthly values for consistent financial reporting

### Improvements

- **Config Modal UI**: Enhanced PersonalFinanceConfigModal with period selection controls
  - Added `ion-select` dropdown for period selection (días/semanas/quincenas/meses/años)
  - Added numeric input for interval (default: 1)
  - Improved category display with CSS styling for name, amount, interval, and period columns
  - All existing categories initialized with monthly period and interval of 1

### Files Changed

- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — Add period calculation utilities, update expensesList
- `front/src/views/statistics/performance/components/PersonalFinanceConfigModal.vue` — Add interval/period fields, period selector UI
- `front/src/views/statistics/performance/PerformancePage.vue` — Add save handler to refresh config after changes
- `front/package.json` — Bump version to 0.46.2

---

## [v0.46.1] - 2026-02-02

### Refactor

- **Config Handling**: Simplified personal finance config loading by removing complex category-to-expense mapping
  - Direct category array storage replacing the multi-step category mapping logic
  - Cleaner config structure with `categories` array stored directly from backup data
- **Data Loading**: Migrated from direct Dixie backup reading to budgetController API
  - Replaced dixieController.listBackups() with budgetController.setDate() and loadDataForCurrentDate()
  - Simplified data extraction using budgetController.getEntries() and getProviders()
  - More consistent use of the centralized budgetController throughout the component

### Features

- **Dynamic Expense List**: Added dynamic expensesList computed property
  - When config.categories exists, calculates expenses from category data
  - Falls back to static expense categories when no custom categories configured
- **Category Total Calculation**: New categoriesTotal computed property for summing category amounts

### Files Changed

- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — Refactor config handling, integrate budgetController, add dynamic expense calculations

---



### Breaking Changes

- **Config Data Structure**: Replace `monthlySavingsGoal` (absolute amount) with `savingsPercent` (percentage threshold)
- **Removed Goals Feature**: Eliminate monthly savings goal tracking with progress visualization
- **Database Schema Change**: Config entries now store `savingsPercent` instead of `monthlySavingsGoal` and `minSavingsPercent`

### Refactor

- **Configuration Simplification**: Consolidate two config fields (`monthlySavingsGoal`, `minSavingsPercent`) into single `savingsPercent` field
- **UI Cleanup**: Remove "Metas" section and GoalsChartModal from PerformanceComponent
- **Validation Updates**: Add maxValue(100) validation for savings percentage

### Files Changed

- `front/src/controllers/statisticsController.ts` — Update Excel export to use configData
- `front/src/views/statistics/performance/PerformancePage.vue` — Update export call
- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — Remove goals section, update config handling
- `front/src/views/statistics/performance/components/PersonalFinanceConfigModal.vue` — Simplify form to single savingsPercent field
- `front/package.json` — Bump version to 0.46.0

---

## [v0.45.3] - 2026-02-02

### Refactor

- **Code Structure**: Reorganize Vue components with consistent section comments following codebase conventions
  - Add section markers for imports, components, vars, functions, lifecycle, computed, and watch sections
  - Improve code readability and maintainability with standardized organization
- **TemplateView.vue**: Refactor section comment structure for better organization
- **PersonalFinanceConfigModal.vue**: Reorganize imports and code structure with section comments

### Files Changed

- `front/src/views/TemplateView.vue` — Refactor section comments organization
- `front/src/views/statistics/performance/components/PersonalFinanceConfigModal.vue` — Reorganize imports and code with section comments
- `front/package.json` — Bump version to 0.45.3

---

## [v0.45.2] - 2026-02-02

### Features

- **Form Validation**: Add comprehensive form validation to PersonalFinanceConfigModal using Vuelidate
  - Required field validation for monthly savings goal and minimum savings percentage
  - Min value validation (values must be greater than 0)
  - Category amount validation ensuring all budget categories have valid amounts
  - Disabled save button when form is invalid with visual error feedback

### Improvements

- **Config Persistence**: Load personal finance configuration on PerformanceComponent mount
  - Automatically restore saved goals, category budgets, and savings percentage settings
  - Centralize config storage in 'config' IndexedDB store for consistency

### Refactor

- **Form Structure**: Refactor PersonalFinanceConfigModal from direct config binding to form reactive pattern
  - Improved separation between form state and business logic
  - Better integration with Vuelidate validation framework
- **Storage Method**: Change from `addBackup` to `addEntry` method for saving configuration entries
  - Cleaner API usage aligned with DixieController's intended interface

### Files Changed

- `front/src/views/statistics/performance/components/PersonalFinanceConfigModal.vue` — Add Vuelidate validation, refactor form structure
- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — Add config loading on mount
- `front/src/controllers/dixie.ts` — Add personalFinanceConfig store to IndexedDB schema
- `front/src/views/TemplateView.vue` — New template scaffold (new file)
- `front/package.json` — Bump version to 0.45.2

---

## [v0.45.1] - 2026-02-01

### Features

- **Chart Modal Integration**: Integrate chart modals (IncomesChartModal, ExpensesChartModal, GoalsChartModal) into the unified PerformanceComponent

---

## [v0.45.0] - 2026-02-01

### Features

- **Excel Export**: Add spreadsheet export capability for financial reports using xlsx library
  - New download button in PerformancePage for exporting to Excel
  - Generates detailed reports with income, expenses, summary, and goals sections
  - Supports day, week, month, and year periods

### Refactor

- **Unified Performance Component**: Consolidate day/week/month/year performance components
  - Replace individual DayPerformanceComponent, WeekPerformanceComponent, MonthPerformanceComponent, YearPerformanceComponent with single PerformanceComponent
  - Component accepts `period` prop to determine time range
  - Reduced code duplication and improved maintainability
- **PeriodLayout Relocation**: Move PeriodLayout to components folder for better organization

### Breaking Changes

- Removed separate day/week/month/year component files (now unified in PerformanceComponent)
- Old component files renamed to .bak for reference

### Files Changed (selected)

- `front/src/views/statistics/performance/PerformancePage.vue` — Use unified PerformanceComponent, add export button
- `front/src/controllers/statisticsController.ts` — Add downloadExcel method
- `front/src/views/statistics/performance/components/PerformanceComponent.vue` — New unified component
- `front/src/views/statistics/performance/components/PeriodLayout.vue` — Moved from day/ folder
- `front/package.json` — Add xlsx dependency, bump version to 0.45.0

---

## [v0.44.5] - 2026-02-01

### Features

- **Personal Finance Tracking**: Complete redesign of Performance page from business-focused metrics to personal finance dashboard
  - New income tracking categories: salary, investments, other income sources
  - New expense categories: housing, food, transport, entertainment, health, other
  - Daily balance tracking replacing net profit metric
  - Savings tracking with daily savings amount and percentage
  - Monthly savings goals with progress visualization
- **New Chart Modals**: Interactive pie charts for expenses and incomes breakdown
- **Goals Visualization**: Doughnut and bar charts showing savings goal progress
- **Configuration Modal**: PersonalFinanceConfigModal for managing savings goals, category budgets, and alert thresholds

### Refactor

- Renamed "Rendimiento" to "Mis Finanzas" with updated UI branding
- Changed layout from single-column to responsive side-by-side columns (6-column grid)
- Added download button for report generation
- Added responsive styles for desktop (modal 90% height, 50% width)
- Removed chart and snapshots sections from PeriodLayout
- Replaced StatisticsConfigPage with PersonalFinanceConfigModal

### Breaking Changes

- Income data structure: sales-based (salesCash, salesCard, creditSales) → personal (salary, investments, other)
- Expense categories: business-focused → personal finance categories
- Removed business metrics: dailyBreakEvenPoint, salesOverBreakEven, netMarginDay, grossProfit

### Files Changed (selected)

- `front/src/views/statistics/performance/PerformancePage.vue` — UI redesign, layout changes, new components
- `front/src/views/statistics/performance/day/DayPerformanceComponent.vue` — Complete financial summary refactor
- `front/src/views/statistics/performance/components/PeriodLayout.vue` — Removed chart and snapshots sections
- `front/src/views/statistics/performance/components/ExpensesChartModal.vue` — New modal for expenses visualization
- `front/src/views/statistics/performance/components/IncomesChartModal.vue` — New modal for income visualization
- `front/src/views/statistics/performance/components/GoalsChartModal.vue` — New modal for goals progress
- `front/src/views/statistics/performance/components/PersonalFinanceConfigModal.vue` — New config modal
- `front/package.json` — bump version to `0.44.5`

---

## [v0.44.4] - 2026-02-01

### Refactor
- Replace structuredClone with custom safeCloneChartData function for chart data cloning in PeriodChartWrapper
- Convert chart creation from synchronous to asynchronous in DayPerformanceChart to properly await chart dependencies

### Fix
- Fix backup matching logic in DayPerformanceComponent to handle different backup structures (BudgetView and direct budget format with id="budget:YYYY-MM-DD")
- Improve error handling in chart instance destruction

### Improvement
- Add comprehensive debug logging for day performance data loading to aid troubleshooting
- Add new watch on isLoaded.value to ensure chart renders after dependencies fully load
- Add explicit Chart type import for better TypeScript support

### Files Changed (selected)
- `front/src/views/statistics/performance/components/PeriodChartWrapper.vue` — replace structuredClone with safeCloneChartData
- `front/src/views/statistics/performance/day/DayPerformanceChart.vue` — convert createChart to async, add isLoaded watch
- `front/src/views/statistics/performance/day/DayPerformanceComponent.vue` — improve backup matching logic, add debug logging
- `front/package.json` — bump version to `0.44.4`

---

## [v0.44.3] - 2026-01-31

### Refactor
- Restructure statistics routes from nested children to flat routes (`/statistics/cash-flow`, `/statistics/performance`)
- Move StatisticsConfigPage from `/statistics/config/` to `/statistics/performance/config/`
- Remove StatisticsPage parent container (no longer needed as separate component)
- Update router import paths for StatisticsConfigPage

### Features
- **Cash Flow**: Wrap page in ion-page with header for proper Ionic structure
- **Performance**: Wrap page in ion-page with header and settings button
- **Config Modal**: Add StatisticsConfigPage as modal in Performance page for improved UX
- New StatisticsConfigPage component designed for modal presentation

### Files Changed (selected)
- `front/src/router/index.ts` — Convert nested statistics routes to flat routes
- `front/src/views/statistics/StatisticsPage.vue` — Removed (no longer needed)
- `front/src/views/statistics/cashFlow/CashFlow.vue` — Add ion-page wrapper with header
- `front/src/views/statistics/performance/PerformancePage.vue` — Add ion-page wrapper, header, and config modal
- `front/src/views/statistics/config/StatisticsConfigPage.vue` — Removed
- `front/src/views/statistics/performance/config/StatisticsConfigPage.vue` — New modal-based config page
- `front/package.json` — bump version to `0.44.3`

---

## [v0.44.2] - 2026-01-30

### Refactor
- Convert route component imports in `front/src/router/index.ts` from dynamic (lazy) imports to static imports to simplify router initialization and avoid duplicated dynamic import registrations.

### Improvements
- Clean up import formatting and router guard formatting in `front/src/router/index.ts` for clearer structure and maintainability.

### Files Changed (selected)
- `front/src/router/index.ts` — replace dynamic route imports with static imports and adjust formatting
- `front/package.json` — bump version to `0.44.2`

---

## [v0.44.1] - 2026-01-30

### Features
- **Statistics — Cash Flow:** Add robust backup parsing and dedicated aggregators to better handle heterogeneous backup shapes and improve accuracy of ingresos/egresos aggregation across Day/Week/Month/Year period loaders.

### 🔧 Improvements
- Add `sumIngresosFromData` and `sumEgresosFromData` helpers in `front/src/views/statistics/cashFlow/CashFlow.vue` to support multiple backup shapes (`ingresos`, `incomes`, `entries` with `entryType`, `proveedores`, `providers`, `gastos`, `expenses`, and fallback numeric extraction).
- Replace ad-hoc per-period summation logic with the new helpers in weekly, monthly and yearly loaders; split yearly datasets into `Ingresos` and `Egresos` for clearer charting and correct profit calculation.
- Expose lightweight debug snapshots on `window` (`__debug_week`, `__debug_week_allMatches`, `__debug_week_backups`, `__debug_year_totals`) to help local troubleshooting when backup shapes vary.

### 🐛 Fixes
- Reduce runtime errors from malformed or unexpected backup shapes by adding defensive try/catch blocks around parsing and aggregation steps.

### Files Changed (selected)
- `front/src/views/statistics/cashFlow/CashFlow.vue` — add robust aggregators, debug helpers, and stabilize weekly/monthly/yearly loaders
- `front/package.json` — bump version to `0.44.1`

---

## [v0.44.0] - 2026-01-30

## [v0.43.7] - 2026-01-29

### 🔧 Improvements
- **Chart Loading & Stability**: Centralize Chart.js dependency handling in `useChart` with explicit imports and component registration; chart components now wait for dependencies to load before rendering to avoid runtime errors and duplicate registrations.

### 🐛 Bug Fixes
- **Data Persistence**: Serialize reactive Pinia/Vue proxies to plain JSON before saving; this fixes unstable persistence/serialization when saving `entries`, `providers`, and `finishDayData`.
- **Save on Create**: Ensure budget data is persisted after creating entries/providers by calling `saveData()` from `budgetController` after sync operations.
- **Suppliers Reactivity**: Remove legacy `subscribeToChanges` and adopt `watchEffect` in `ProvidersComponent` to reactively sync suppliers with the store.
- **Defensive Store Setters**: Guard `setEntries` and `setProviders` in `budgetStore` to accept only arrays and avoid runtime exceptions from unexpected shapes.

### 🧭 UI / UX
- **Stable Mounting**: Defer rendering of `InicioViewComponent` until budget data loads to avoid lifecycle/data race conditions.
- **Providers List Rendering**: Replace virtual-scroll with a standard `v-for` provider list to simplify rendering and avoid virtualization edge cases.

### Files Changed (selected)
- `front/src/composables/useChart.ts` — explicit Chart.js import, registration, loading guards
- `front/src/views/*/*ChartComponent.vue` & `AccountBarChart.vue` — render guards, `canRenderChart` computed, scale types added
- `front/src/controllers/budgetController.ts` — serialize store state before save; call `saveData()` after creates
- `front/src/controllers/suppliersController.ts` — remove `subscribeToChanges` method
- `front/src/stores/budgetStore.ts` — defensive array handling in setters
- `front/src/views/budget/ProvidersComponent.vue` — replace virtual-scroll with `v-for`, use `watchEffect`
- `front/src/views/budget/BudgetView.vue` & `InicioViewComponent.vue` — coordinate data loading and child mounting
- `front/package.json` — bump version to `0.43.7`

---

## [v0.43.6] - 2026-01-29

### 🐛 Bug Fixes
- **SuppliersController**: Enhanced object cloning safety with robust error handling for non-cloneable objects
- **Data Safety**: Added safeClone function to handle circular references and non-serializable values (functions, Error objects)
- **Reliability**: Improved addProvider and updateProvider methods with fallback cloning mechanisms

## [v0.43.5] - 2026-01-29

### 🐛 Bug Fixes
- **Authentication**: Added token validation before sync operations to prevent unauthorized access
- **SuppliersController**: Enhanced authentication checking in listSuppliers endpoint
- **SyncService**: Improved error handling for missing authentication tokens in full sync operations

## [v0.43.4] - 2026-01-28

### 🐛 Bug Fixes
- **BudgetView**: Remove FinishDayForm component from template to fix component reference errors
- **IonModal**: Add missing IonModal import to BudgetView component

### 🔧 Improvements
- **Code Quality**: Refactor InicioViewComponent onMounted lifecycle to use async/await pattern instead of immediately invoked async function expression for better readability and maintainability

---

### 🐛 Bug Fixes
- **Pinia Store**: Remove non-existent `store.notifyChange()` calls from suppliersController
- **Error Handling**: Improve sync error handling to prevent blocking user operations when server fails
- **Offline Functionality**: Allow supplier operations to continue locally when sync server is unavailable

### 🔧 Improvements
- **Sync Reliability**: Items remain in sync queue for later retry when server is temporarily unavailable
- **User Experience**: Users can add/edit/delete suppliers even during server outages
- **Graceful Degradation**: App continues to function locally with automatic sync when server is back

---

## [v0.43.2] - 2026-01-27

### 🐛 Bug Fixes
- **Sync Service**: Fix critical TypeError where `syncService.fullSyncAndSave` was not a function
- **API Endpoint**: Update `pullChanges` to use correct `/api/sync/changes` endpoint instead of non-existent `/api/sync/pull`
- **Error Handling**: Add fallback to `/api/sync/full` when incremental sync fails, improving reliability
- **IndexedDB Integration**: Add missing `saveChangesToLocalDb` method to persist server changes to local storage

### 🔧 Improvements
- **Sync Reliability**: Implement robust sync flow with proper error handling and endpoint fallbacks
- **Data Persistence**: Ensure server changes are properly saved to IndexedDB for offline access
- **Logging**: Add comprehensive debug logging throughout sync operations for better troubleshooting

---

## [v0.43.1] - 2026-01-27

### 🐛 Bug Fixes
- **Authentication Routes**: Simplify register route path from `/auth/register` to `/register` for better user experience and easier navigation access
- **Router Navigation**: Fix RegisterView to use proper Vue Router `<router-link>` component instead of plain HTML anchor tag for consistent SPA navigation

### 🔧 Improvements
- **User Experience**: Streamlined registration flow with more intuitive route structure
- **Navigation Consistency**: Ensure all authentication pages follow Vue Router best practices for single-page application behavior

---

## [v0.43.0] - 2026-01-27

### 🚀 Performance
- **Bulk Operations**: Implemented comprehensive bulk operations for supplier synchronization
  - Added `bulkCreateSuppliers()` method for efficient batch supplier creation
  - Added `bulkUpdateSuppliers()` method for optimized batch supplier updates  
  - Added `bulkDeleteSuppliers()` method for streamlined batch supplier deletion
  - Added `bulkCreateItems()` method for generic entity bulk creation with special handling
- **Sync Performance**: Significantly improved sync operation performance by reducing database queries
  - Separated create, update, and delete operations for batch processing
  - Optimized conflict detection with timestamp-based comparison
  - Reduced individual database round trips through bulk insert operations

### 🧪 Testing
- **Performance Testing**: Added comprehensive bulk operations testing script
  - Performance comparison between individual and bulk operations
  - Query count analysis and timing measurements
  - Memory usage monitoring for large dataset operations
  - Automated performance validation with detailed metrics reporting

### 🔧 Improvements
- **SyncController**: Enhanced merge functionality with intelligent operation batching
  - Automatic separation of creates, updates, and deletes for optimal processing
  - Improved conflict resolution with server-side timestamp comparison
  - Better error handling and logging throughout bulk operations
- **Database Optimization**: Optimized database queries with bulk insert patterns
  - Single bulk insert operation replacing multiple individual inserts
  - Efficient sync metadata updates for batch operations
  - Proper timestamp handling for millisecond/second conversion

### 📊 Metrics
- **Query Reduction**: Significant decrease in database queries for supplier sync operations
- **Performance Improvement**: Measurable speed improvements for bulk vs individual operations
- **Memory Efficiency**: Optimized memory usage for large dataset synchronization

## [v0.42.0] - 2026-01-27

### 🚀 Performance
- **Backend Sync Optimizations**: Major performance improvements for sync operations
  - Fixed N+1 query problems with eager loading relationships
  - Implemented caching for full sync operations (30-minute cache)
  - Added supplier products caching to prevent redundant queries
  - Optimized field selection for reduced data transfer
- **Database Indexes**: Added comprehensive optimization indexes
  - Composite indexes for sync operations (user_id, status, updated_at)
  - Individual indexes for frequently queried fields
  - Performance indexes for entries, accounts, supplier products, and budget tables
- **MySQL Configuration**: Optimized for shared hosting environments
  - Enabled persistent connections for better connection reuse
  - Disabled strict mode for better compatibility
  - Configured sticky connections for write operations
  - Optimized query buffering for large datasets

### 🗄️ Database
- **Migration**: Added optimization indexes migration file
- **Cache Configuration**: Switched from database to file cache for better performance

### 🧪 Testing
- **Performance Testing**: Added comprehensive optimization testing script
  - Query count analysis before and after optimizations
  - Cache performance validation
  - Database index effectiveness testing
  - Memory usage monitoring
  - Concurrent request simulation

### 🔧 Configuration
- **Cache Store**: Changed default cache store from database to file
- **Database Settings**: Enhanced MySQL configuration for production environments

### 📊 Metrics
- **Query Reduction**: Significant decrease in database queries for sync operations
- **Response Time**: Improved API response times through caching and indexing
- **Memory Efficiency**: Optimized memory usage for large dataset operations

## [v0.41.0] - 2026-01-27

### 🚀 Features
- **Performance & Memory Management**: Implemented comprehensive DOM cleanup system to prevent memory leaks and improve application performance
- **Dynamic Router**: Added dynamic statistics router configuration for better route management and memory handling

### 🔧 Improvements
- **App.vue**: Enhanced theme switching safety with proper cleanup methods to prevent DOM element leaks
- **Theme Management**: Improved theme switching with proper node cleanup and null checks to prevent memory leaks
- **Chart Performance**: Optimized chart colors management with proper cleanup and null checks for better memory usage
- **Type Safety**: Enhanced type safety across components with optional chaining and null validation
- **Performance Tests**: Updated performance test utilities with browser performance APIs integration

### 🐛 Bug Fixes
- **Memory Leaks**: Fixed multiple memory leak issues in component lifecycle management
- **DOM Cleanup**: Resolved DOM element accumulation in charts and theme switching
- **Component Cleanup**: Fixed component unmounting and cleanup processes to prevent memory buildup

### 📝 Technical Details
- **New Files**: `DOMCleanupComponent.vue`, `domCleanup.ts` utility for comprehensive DOM management
- **Router Updates**: Enhanced router structure for statistics with dynamic configuration
- **Chart System**: Improved chart color management with proper cleanup and resource management
- **Testing**: Enhanced performance testing capabilities with browser API integration

## [v0.40.6] - 2026-01-26

### Fixed
- Add missing router configuration for StatisticsCashFlow and StatisticsPerformance routes
- Resolve DataCloneError in cash flow chart components by replacing structuredClone with JSON.parse(JSON.stringify())
- Fix chart component initialization and data cloning issues across all time period views

### Added
- New routes: `/statistics/cash-flow` and `/statistics/performance` for proper navigation access
- Router imports for CashFlowPage and PerformancePage components

### Changed
- `front/src/router/index.ts` - Add missing route definitions for statistics pages
- `front/src/views/statistics/cashFlow/*/ChartComponent.vue` - Replace structuredClone with safe JSON cloning method in Day, Week, Month, and Year chart components
- `front/package.json` - Update version to 0.40.6

### Notes
- Non-breaking changes that resolve navigation errors and browser compatibility issues
- Chart components now use universally supported JSON cloning instead of structuredClone
- Improved error handling and data cloning reliability in statistics components

---

## [v0.40.5] - 2026-01-26

### Fixed
- Update MainMenu navigation from path-based to name-based routing for better maintainability
- Convert hardcoded path navigation to use named routes following Vue Router best practices
- Improve router code formatting with better line breaks and consolidated imports

### Changed
- `front/src/components/MainMenu.vue` — Replace path-based navigation with named routes for BudgetView, TemplatesView, SuppliersPage, AccountsPage, StatisticsCashFlow, and StatisticsPerformance
- `front/src/router/index.ts` — Code formatting improvements with cleaner import structure and line breaks
- `front/package.json` — Update version to 0.40.5

### Notes
- Non-breaking changes that improve code maintainability and follow Vue Router best practices
- Enhanced navigation reliability by using named routes instead of hardcoded paths

---

## [v0.40.4] - 2026-01-26

### Performance
- Add route prefetching for critical routes in production to improve navigation performance
- Implement request caching utility with TTL support and automatic cleanup for API optimization
- Add intelligent cache management with periodic cleanup of expired entries

### Dependency Management
- Move @faker-js/faker from dependencies to devDependencies for proper build separation
- Move @types/html2canvas and @types/jspdf from dependencies to devDependencies
- Fix faker-js/faker import path in devDependencies configuration
- Update terser from 5.4.0 to 5.4.1 for latest build optimizations

### Code Quality
- Improve router code formatting with better line breaks for enhanced readability
- Add comprehensive request caching utilities with configurable TTL and cleanup strategies

### Added
- `front/src/utils/requestCache.ts` — Request caching utilities with TTL support and automatic cleanup

### Changed
- `front/src/router/index.ts` — Add production route prefetching for critical routes
- `front/package.json` — Update dependencies and version to 0.40.4

---

## [v0.40.3] - 2026-01-26

### Performance
- Optimize daySummary calculations in BudgetView with single-pass algorithm replacing multiple filter/reduce operations
- Improve memory management by adding proper event listener cleanup in main.ts
- Add resize listener cleanup support to prevent memory leaks on app unmount

### Features  
- Add Progressive Web App (PWA) support with service worker and offline capabilities
- Configure PWA manifest with app metadata, icons, and theme colors
- Implement runtime caching strategies for images and static resources
- Add build optimization with terser minification and console removal in production

### Refactoring
- Replace multiple array iterations with single-loop processing in daySummary computed property
- Add proper cleanup methods for event listeners to improve memory management
- Restructure Vite configuration to include PWA plugin and optimization settings

### Files Changed
- `front/src/main.ts` — Add resize listener cleanup and memory management improvements
- `front/src/views/budget/BudgetView.vue` — Optimize daySummary with single-pass calculations
- `front/vite.config.ts` — Add PWA configuration and build optimizations
- `front/package.json` — Bump version to 0.40.3

---

## [v0.40.2] - 2026-01-26

### Features
- Add comprehensive performance testing framework for validating Phase 1 optimizations
- Implement interactive performance test dashboard at `/test/performance`
- Add performance monitoring utilities with memory tracking, timing measurements, and cloning comparisons
- Create detailed performance test report template for documentation

### Performance
- Add performance monitoring utilities for memory usage tracking and timing measurements
- Implement JSON cloning performance comparison between JSON.parse(JSON.stringify()) and structuredClone
- Add image compression testing functionality to validate optimization effectiveness
- Include DOM memory impact testing for keep-contents-mounted removal validation

### Added
- **PerformanceTestPage.vue** - Interactive test interface with real-time monitoring
- **performanceMonitor.ts** - Performance monitoring utilities with comprehensive test suite
- **PERFORMANCE_TEST_REPORT.md** - Documentation template for test results and expected improvements

### Changed
- Add performance test navigation item to MainMenu with speedometer icon
- Remove virtual scrolling from AccountCards and ProvidersSummary components (reverting to standard v-for)
- Update router configuration to include performance test route
- Register route moved from `/register` to `/auth/register` for better organization

### Test Coverage
- Memory usage testing with before/after operation comparisons
- JSON cloning performance testing with configurable iterations
- Image compression validation with size reduction analysis
- Real-time memory status display with MB formatting

---

## [v0.40.1] - 2026-01-26

### Performance
- Replace JSON.parse(JSON.stringify()) with structuredClone for better performance and browser compatibility
- Add structuredClone fallback implementation for older browsers
- Optimize object cloning across multiple components

### Features
- Implement virtual scrolling for large lists in ProvidersComponent
- Add virtual scrolling to AccountCards component for better performance
- Implement virtual scrolling in ProvidersSummary component
- Add image compression functionality to AddSupliersComponent

### Fixes
- Remove deprecated keep-contents-mounted props from ion-popover components
- Fix popover behavior in DayChartComponent, WeekChartComponent, MonthChartComponent, YearChartComponent
- Fix popover behavior in DayPerformanceComponent, WeekPerformanceComponent, MonthPerformanceComponent, YearPerformanceComponent
- Fix popover behavior in PeriodChartWrapper component

### Refactoring
- Clean up cloning methods in suppliersController
- Optimize performance across statistics views
- Improve code quality and maintainability

## [v0.40.0] - 2026-01-26

### Features

- **Chart Management**: Add `useChart` composable for dynamic Chart.js dependency loading with lazy loading, caching, and proper error handling.
- **Code Splitting**: Implement lazy-loaded components throughout router for better initial load performance and reduced bundle size.
- **Build Optimization**: Enhanced Vite configuration with improved chunk separation strategy (vendor, charts, pdf, utils) for better caching and loading performance.

### Performance

- **Bundle Size**: Reduce initial JavaScript payload by implementing lazy loading for all route components and Chart.js dependencies.
- **Chart Loading**: Replace static Chart.js imports with dynamic loading across 12+ chart components, eliminating redundant registration code.
- **Chunk Strategy**: Optimize build chunks with intelligent separation (vendor/charts/pdf/utils) for improved browser caching.

### Refactored

- **Chart Components**: Unified Chart.js initialization in `AccountBarChart.vue`, `DayChartComponent.vue`, `MonthChartComponent.vue`, `WeekChartComponent.vue`, `YearChartComponent.vue`, `DayPerformanceChart.vue`, `DayPerformanceComponent.vue`, `MonthPerformanceComponent.vue`, `WeekPerformanceComponent.vue`, and `YearPerformanceComponent.vue`.
- **Router Configuration**: Convert all route imports to lazy loading pattern for better code splitting.
- **Dependency Management**: Centralize Chart.js registration in `useChart` composable, removing duplicate code across chart components.

### Files Changed

- `front/src/composables/useChart.ts` — (new) Dynamic Chart.js loading with caching and error handling
- `front/src/router/index.ts` — Convert all route components to lazy loading
- `front/vite.config.ts` — Optimized chunk splitting strategy with vendor/charts/pdf/utils separation
- `front/src/views/budget/components/AccountBarChart.vue` — Use useChart composable
- `front/src/views/statistics/cashFlow/day/DayChartComponent.vue` — Use useChart composable, simplify data handling
- `front/src/views/statistics/cashFlow/month/MonthChartComponent.vue` — Use useChart composable
- `front/src/views/statistics/cashFlow/week/WeekChartComponent.vue` — Use useChart composable
- `front/src/views/statistics/cashFlow/year/YearChartComponent.vue` — Use useChart composable
- `front/src/views/statistics/performance/day/DayPerformanceChart.vue` — Use useChart composable
- `front/src/views/statistics/performance/day/DayPerformanceComponent.vue` — Use useChart composable
- `front/src/views/statistics/performance/month/MonthPerformanceComponent.vue` — Use useChart composable
- `front/src/views/statistics/performance/week/WeekPerformanceComponent.vue` — Use useChart composable
- `front/src/views/statistics/performance/year/YearPerformanceComponent.vue` — Use useChart composable

### Notes

- Major architectural improvement for chart loading and bundle optimization.
- No breaking changes - all existing functionality preserved with performance enhancements.
- Improved developer experience with centralized chart dependency management.

---

### Performance

- **BudgetStore**: Optimize financial calculations with single-pass algorithm replacing multiple computed properties, significantly reducing computation overhead for income/expense aggregations.
- **BudgetController**: Add timeout management and cleanup to prevent memory leaks from untracked setTimeout calls.
- **TemplatesStore**: Replace JSON.parse(JSON.stringify()) with structuredClone for faster deep cloning when duplicating template objects.

### Refactored

- **AccountsStore**: Migrate from reactive array to ref-based reactive state for improved Vue 3 reactivity patterns and performance.
- **SuppliersStore**: Remove manual subscription pattern (subscribeToChanges/notifyChange) in favor of Vue's built-in watchEffect for cleaner reactive programming.

### Files Changed

- `front/src/controllers/budgetController.ts` — Add pendingTimeouts Set for tracking setTimeout IDs, implement cleanup() method, update addProvider with timeout management.
- `front/src/stores/accountsStore.ts` — Convert accounts from reactive([]) to ref<Account[]>([]), update all array operations to use .value.
- `front/src/stores/budgetStore.ts` — Add financialSummary computed property with single-pass calculation, refactor totalIngresos/totalEgresos/netTotal to use optimized summary.
- `front/src/stores/suppliersStore.ts` — Remove onChangeCallbacks array, subscribeToChanges, and notifyChange methods.
- `front/src/stores/templatesStore.ts` — Replace JSON cloning with structuredClone for better performance and browser compatibility.

### Notes

- Patch-level performance optimizations and code quality improvements. No breaking changes expected. Bump frontend package to 0.39.9.

---

## [v0.39.8] - 2026-01-24

### Changed

- Improve chart coloring by moving color resolution to a shared utility and using Ionic theme CSS variables; maps positive values to `--ion-color-success` and negative/egreso values to `--ion-color-danger` for consistent theming across the app.

### Files Changed

- `front/src/utils/chartColors.ts` — refactor `applyNeonStyles` to resolve theme colors from CSS variables (supports rgb and hex forms), add sign-aware/dataset-label-aware color selection, and add runtime debug logs.
- `front/src/views/statistics/cashFlow/day/DayChartComponent.vue` — use shared `applyNeonStyles` instead of an inline pastel palette; remove duplicated color logic and add debug logging of final chart data.

### Notes

- Non-breaking visual/UX enhancement to chart coloring; no API changes expected. Bump frontend package to `0.39.8`.

---

## [v0.39.7] - 2026-01-24

### Fixed

- `front/src/views/statistics/cashFlow/day/DayComponent.vue` — Improve backup selection and daily totals: robustly match backups for budget components (allow component or id/key matches), separate ingresos (income) and egresos (expenses) sums, compute previous-day comparison, and update chart labels/datasets to show previous and current day side-by-side.
- `front/src/views/budget/InicioViewComponent.vue` — Minor cleanup: remove development helpers/flags and unused comments, fix list header indentation and stray imports/comments to reduce duplicate behavior and improve maintainability.

### Files Changed

- `front/src/views/statistics/cashFlow/day/DayComponent.vue` — backup matching, entry aggregation and chart data improvements.
- `front/src/views/budget/InicioViewComponent.vue` — small code cleanup and comment removal.

### Notes

- Patch-level frontend fixes and refactors; no breaking changes expected. Bump frontend package to `0.39.7`.

---

## [v0.39.6] - 2026-01-24

### Fixed

- `front/src/views/budget/BudgetView.vue` — fix missing closing brace in the script section and ensure `onDateSelected` performs a defensive `value` check before parsing the date and updating the controller. This prevents a runtime parse/templating error and restores proper component script parsing.

### Files Changed

- `front/src/views/budget/BudgetView.vue` — close `onDateSelected` function and restore script block integrity.

### Notes

- Patch release containing a small frontend fix; no breaking changes expected.

---

## [v0.39.5] - 2026-01-24

### Fixed

- StatisticsController: expose `getPopovers()` and return the `modalOpen` ref from `getModalOpen()` so callers can read/write `.value`; this prevents incorrect usage and potential runtime errors.
- Performance views (Day/Year): update callers to match the controller API (use `getPopovers()`, call `providerValue(p)`, `formatCurrency(val)`, `formatPercent(val)`, and `setSnapshots(val)` with simplified argument shapes) to avoid mismatched parameter shapes.

### Changed

- Simplify StatisticsController helper signatures to accept positional values where appropriate and return refs when components need to mutate reactive state directly.

### Files Changed

- `front/src/controllers/statisticsController.ts` — add `getPopovers()`; change `getModalOpen()` to return the ref instead of the `.value`.
- `front/src/views/statistics/performance/day/DayPerformanceComponent.vue` — update call sites to the new controller getters and simplified parameter shapes.
- `front/src/views/statistics/performance/year/YearPerformanceComponent.vue` — update call sites to the new controller getters and simplified parameter shapes.
- `front/package.json` — bump frontend package version to `0.39.5`.

### Notes

- No breaking changes expected; updated components now match the controller's API.

---

## [v0.39.2] - 2026-01-24

### Added

- Trigger background sync after successful login and registration when there are pending sync operations; this runs in background and does not block the auth flow. Errors are caught and logged for diagnostics.

### Fixed

- Avoid blocking auth flow when triggering sync; wrap sync invocation in try/catch and log failures.

### Files Changed

- `front/src/controllers/authController.ts` — start non-blocking `syncService.processQueue()` after `saveToken` in login/register flows; add defensive checks and logging.

---

## [v0.39.0] - 2026-01-23

### Added

- Add Android native project under `front/android/` to enable Android builds via Capacitor: Gradle top-level and module build files, Gradle wrapper, app module, resources (icons, splash), `MainActivity`, `AndroidManifest.xml`, ProGuard rules and example tests.
- Add Capacitor configuration files: `front/capacitor.config.json` and `front/capacitor.config.ts` and enable `capacitor` integration in `front/ionic.config.json`.

### Changed

- Bump frontend package version to `0.39.0` (`front/package.json`) and update lockfiles (`front/package-lock.json`, `front/pnpm-lock.yaml`).
- Small build/config updates: `front/tsconfig.json`, `front/vite.config.ts` and related frontend tooling metadata to align with Capacitor/Android additions.

### Files Changed

- Android native project (new): `front/android/**` (build.gradle, app module, gradle wrapper, settings, variables, resources, icons, splash images, MainActivity, manifests, tests, proguard rules)
- Capacitor config: `front/capacitor.config.json`, `front/capacitor.config.ts`
- Frontend config and lockfiles: `front/ionic.config.json`, `front/package.json` (version bump), `front/package-lock.json`, `front/pnpm-lock.yaml`, `front/tsconfig.json`, `front/vite.config.ts`

---

## [v0.39.1] - 2026-01-23

### Added

- Add robust supplier-product sync flow: supplier products are now synced before the supplier record to ensure product sync_ids exist and are referenced correctly by provider/budget payloads.
- Generate temporary `sync_id` values for new supplier products and suppliers to allow immediate queuing of sync operations while preserving stable identifiers.
- Extensive debug logging across suppliers sync flow and UI components to aid troubleshooting during offline/online sync operations.

### Fixed

- Prevent missing/undefined payloads when calling sync functions by accepting object-shaped parameters and validating inputs.
- Fix cases where IndexedDB had no suppliers by falling back to a full server sync and saving results to local DB.

### Changed

- Use object-shaped parameters for `syncProvider`, `syncSupplierProduct` and related calls to match `useSync` composable expectations.
- Improve local UI behavior and form handling in suppliers modal: read native input values when adding products, clear inputs reliably, and ensure modal emits `saved` and `dismiss` events consistently.

### Files Changed

- `front/src/composables/useSync.ts` — add product sync id generation, strengthen payload shapes and add defensive logging
- `front/src/controllers/suppliersController.ts` — sync supplier products first, generate temporary sync_ids, call `syncService.processQueue()` after save, add extensive debug logs and full-sync fallback
- `front/src/views/suppliers/SuppliersPage.vue` — UI refinements, safer edit/open modal flow and enhanced console logging
- `front/src/views/suppliers/modals/AddSupliersComponent.vue` — improved product add/edit logic, file-to-base64 handling and input value reading

---


## [v0.38.0] - 2026-01-23

### Refactored

- Replace the previous "finish day" (day-close) workflow with an on-demand Day Summary modal and simplify day editing UX: views no longer rely on an "isDayClosed" state and editing is available directly.

### Added

- `front/src/views/budget/components/DaySummaryModal.vue` — New modal showing totals, top providers/accounts, raw entries and useful debug data for the selected date.
- Developer helpers: `DEV_MANUAL_ENTRIES` map in `budgetController` for optional hardcoded test entries and exposing `budgetController` on `window` in development for debugging.

### Removed

- `front/src/views/budget/FinishDayForm.vue` — finish-day form and associated day-closed UI flow removed.

### Changed

- Preload budget data before app mount in `front/src/main.ts` to ensure persisted entries render immediately.
- Simplify BudgetView, InicioViewComponent, ProvidersComponent, and AccountCards to remove day-closed conditionals and adapt navigation to the new summary/modal flow.
- Add defensive console debug logs and small UI improvements (autofocus on EditEntryModal input, default account assignment on modal mount).
- Bump frontend package version to `0.38.0`.

### Files Changed

**Frontend:**
- `front/src/controllers/budgetController.ts` — remove day-close APIs, add DEV_MANUAL_ENTRIES and debug logging
- `front/src/main.ts` — preload budget data and expose controller in dev
- `front/src/views/budget/BudgetView.vue` — UI changes: remove finish-day toggles and integrate DaySummary modal
- `front/src/views/budget/FinishDayForm.vue` — (removed)
- `front/src/views/budget/InicioViewComponent.vue` — remove day-closed logic and ensure budget data load
- `front/src/views/budget/ProvidersComponent.vue` — remove day-closed guards and simplify providers computed logic
- `front/src/views/budget/components/AccountCards.vue` — enable account actions regardless of day-closed state
- `front/src/views/budget/components/DaySummaryModal.vue` — (new)
- `front/src/views/budget/components/EditEntryModal.vue` — autofocus and default-account-assignment improvements
- `front/package.json` — bump version to `0.38.0`

---

## [v0.37.4] - 2026-01-23

### Fixed

- Prevent crash when reading system config from IndexedDB: normalize `getConfig` params and avoid calling `IDBObjectStore.get` with `undefined`.
- Update callers in `useSystemConfig` to pass `{ key: '...' }` objects to `configController.getConfig`.

### Files Changed

**Frontend:**
- `front/src/controllers/dixie.ts` - normalize `getConfig` parameter (accept string or `{key}`) and guard against missing key to avoid IDB DataError
- `front/src/stores/useSystemConfig.ts` - pass `{ key: 'theme'|'autoLightTheme'|'autoDarkTheme' }` to `configController.getConfig`
- `front/package.json` - bump version to `0.37.4`

---

## [v0.37.5] - 2026-01-23

### Fixed

- Prevent Uncaught TypeError when syncing entries: update `budgetController` to call `useSync` functions with object-shaped parameters (e.g. `syncEntry({ entry, operation })`) so `entry` is not undefined and accessing `sync_id` is safe.
- Align `syncBudgetProvider` and `syncBudget` calls in `budgetController` to the `useSync()` composable API.

### Files Changed

**Frontend:**
- `front/src/controllers/budgetController.ts` — correct `useSync` call signatures and payload shapes
- `front/package.json` — bump version to `0.37.5`

---

## [v0.37.3] - 2026-01-22

### Fixed

- Add TypeScript type assertions throughout useSync for entry and provider sync operations (string, number, boolean, string[] casts)
- Fix jsPDF initialization in usePdfReport with proper type handling
- Add html2canvas options typing in usePdfReport for better TypeScript support
- Move interfaces to module level in syncService for improved TypeScript organization

### Refactored

- Remove duplicate code blocks from MigrateDates.vue and MigrateEntries.vue
- Remove unused selectProvider function from EditEntryModal.vue
- Remove unused focusNext function from PoductsModalComponent.vue
- Remove unused onDateChange function from ApplyTemplateComponent.vue
- Remove duplicate try-catch block from dixie.ts
- Fix missing closing brace in BudgetView.vue
- Fix missing closing tag in CashFlow.vue
- Remove duplicate variable assignments in DayPerformanceComponent.vue (use shared values directly)
- Simplify composable destructuring in MonthPerformanceComponent.vue
- Remove duplicate assignments in WeekPerformanceComponent.vue
- Consolidate groupedSuppliers computed property in SuppliersPage.vue (remove duplicate filteredSuppliers logic)

### Files Changed

**Frontend:**
- `front/src/composables/usePdfReport.ts` - Fix jsPDF initialization, add type assertions
- `front/src/composables/useSync.ts` - Add type assertions throughout sync operations
- `front/src/controllers/dixie.ts` - Remove duplicate try-catch block
- `front/src/services/syncService.ts` - Move interfaces to module level
- `front/src/views/admin/maintenance/MigrateDates.vue` - Remove duplicate code blocks
- `front/src/views/admin/maintenance/MigrateEntries.vue` - Remove duplicate code blocks
- `front/src/views/budget/BudgetView.vue` - Fix missing closing brace
- `front/src/views/budget/components/EditEntryModal.vue` - Remove unused selectProvider function
- `front/src/views/budget/modals/PoductsModalComponent.vue` - Remove unused focusNext function
- `front/src/views/statistics/cashFlow/CashFlow.vue` - Fix missing closing tag
- `front/src/views/statistics/performance/day/DayPerformanceComponent.vue` - Remove duplicate variable assignments
- `front/src/views/statistics/performance/month/MonthPerformanceComponent.vue` - Simplify composable destructuring
- `front/src/views/statistics/performance/week/WeekPerformanceComponent.vue` - Remove duplicate assignments
- `front/src/views/suppliers/SuppliersPage.vue` - Consolidate groupedSuppliers logic
- `front/src/views/templates/modals/ApplyTemplateComponent.vue` - Remove unused onDateChange function

---

## [v0.37.2] - 2026-01-22

### Added

- Add complete supplier object storage in providers with immutable deep copy
- Store `_supplier` field in Provider interface to maintain full supplier data snapshot
- Use JSON.parse(JSON.stringify()) for immutable deep copies preventing mutable references

### Changed

- Update Provider interface to include optional `_supplier?: Supplier` field
- Update ProviderData interface in EditProviderModal to include `_supplier?: Supplier`
- Update budgetController.addProvider to accept and store `_supplier` parameter
- Update ProvidersComponent to pass supplier object when creating/updating providers

### Files Changed

**Frontend:**
- `front/src/stores/budgetStore.ts` - Added `_supplier?: Supplier` to Provider interface
- `front/src/views/budget/components/EditProviderModal.vue` - Added `_supplier?: Supplier` to ProviderData interface
- `front/src/views/budget/ProvidersComponent.vue` - Store supplier object with deep copy in openEditProviderModal and handleProviderSaved
- `front/src/controllers/budgetController.ts` - Added `_supplier` parameter support in addProvider function

---

## [v0.37.1] - 2026-01-22

### Refactored

- Add comprehensive TypeScript type definitions across all sync and data interfaces
- Convert function parameters from positional to object destructuring pattern for better type safety
- Replace `any` types with properly typed interfaces throughout codebase
- Add typed interfaces: SyncEntryParams, SyncProviderParams, SyncAccountParams, SyncTemplateParams, SyncSupplierProductParams, SyncBudgetParams, SyncBudgetProviderParams, SyncBudgetProviderProductParams
- Add ProviderValue, SnapshotData, Html2CanvasOptions, JsPdfOptions type exports for composables
- Update DixieController with proper type safety for IndexedDB operations
- Improve error handling with typed error objects instead of `any`

### Improved

- Enhance applyServerChanges function with proper async/await patterns
- Add proper BudgetProviderProduct interface for typed product handling
- Improve syncService with better error typing and fallback handling
- Add type exports for usePdfReport, usePerformancePeriod, usePeriodView, useSync composables
- Update router type checking in App.vue for Vue Router 4.x compatibility

### Fixed

- Router type check using 'hasRoute' in router check pattern for Vue Router 4.x

### Files Changed

**Frontend:**
- `front/src/composables/usePdfReport.ts` - Added typed exports for Html2CanvasOptions, JsPdfOptions
- `front/src/composables/usePerformancePeriod.ts` - Added ProviderValue interface, converted functions to object params
- `front/src/composables/usePeriodView.ts` - Added SnapshotData interface, typed snapshots state
- `front/src/composables/useSync.ts` - Added all Sync*Params interfaces, BudgetProviderProduct interface, improved async handling
- `front/src/controllers/TempalteController.ts` - Added TemplateRecord type, converted to object params
- `front/src/controllers/accountsController.ts` - Added Supplier type import, typed controller methods
- `front/src/controllers/backupController.ts` - Added BackupEntryData, BackupRecord interfaces
- `front/src/controllers/budgetController.ts` - Added BudgetData, Supplier type imports
- `front/src/controllers/dixie.ts` - Improved type safety for IndexedDB operations, proper error typing
- `front/src/controllers/migrationService.ts` - Added proper type definitions for migration functions
- `front/src/controllers/statisticsController.ts` - Added all type exports from composables
- `front/src/controllers/suppliersController.ts` - Added Product, Supplier type exports, typed methods
- `front/src/controllers/templateService.ts` - Added TemplateRecord type, proper typing
- `front/src/services/syncService.ts` - Improved error handling with typed responses
- `front/src/stores/accountsStore.ts` - Added serverId field to Account type
- `front/src/stores/budgetStore.ts` - Added proper typing for budget state

---

## [v0.37.0] - 2026-01-22

### Refactored

- Add consistent section comments to all Vue components for better code organization
- Add `// Imports`, `// Components`, `// Vars`, `// Functions`, `// Life cycle`, `// Computed`, `// Watch` section markers
- Convert function signatures from direct parameters to object parameter pattern for consistency
- Standardize parameter passing across all controller functions, utilities, and components

### Files Changed

**Frontend:**
- 52 Vue components updated with section comments structure
- `front/src/utils/date.ts` - Updated formatLocalDate, parseLocalDate, normalizeName to use object parameters
- `front/src/utils/chartColors.ts` - Updated applyNeonStyles to use object parameters
- `front/src/controllers/*.ts` - All controllers updated with object parameter pattern
- `front/src/stores/*.ts` - All stores updated with object parameter pattern
- `front/src/composables/*.ts` - Composables updated with object parameter pattern
- `front/src/migrations/*.ts` - Migration files updated with object parameter pattern

---

## [v0.36.1] - 2026-01-21

### Refactored

- Organize Vue component code structure with consistent section comments
- Add // Imports, // Components, // Vars, // Functions, // Life cycle, // Computed, // Watch sections
- Reorganize code in all Vue files to follow consistent order: Imports → Components → Vars → Functions → Life cycle → Computed → Watch
- Remove inline comments and consolidate code organization into section headers

### Files Changed

**Frontend:**
- `front/src/App.vue` - Reorganized script section with section comments
- `front/src/components/MainMenu.vue` - Added section comments structure
- `front/src/components/SyncStatus.vue` - Added section comments and reorganized
- `front/src/views/admin/MaintenancePage.vue` - Added section comments
- `front/src/views/admin/PersonalizationPage.vue` - Added section comments
- `front/src/views/admin/maintenance/MigrateDates.vue` - Reorganized with section comments
- `front/src/views/admin/maintenance/MigrateEntries.vue` - Reorganized with section comments
- `front/src/views/auth/LoginView.vue` - Added section comments
- `front/src/views/auth/RegisterView.vue` - Added section comments
- `front/src/views/budget/BudgetView.vue` - Reorganized with section comments
- `front/src/views/budget/FinishDayForm.vue` - Added section comments
- `front/src/views/budget/InicioViewComponent.vue` - Reorganized with section comments
- `front/src/views/budget/ProviderCardComponent.vue` - Reorganized with section comments
- `front/src/views/budget/ProvidersComponent.vue` - Reorganized with section comments
- `front/src/views/budget/components/AccountCards.vue` - Added section comments
- `front/src/views/budget/components/EditEntryModal.vue` - Added section comments
- `front/src/views/budget/components/EditProviderModal.vue` - Added section comments
- `front/src/views/budget/components/NotesModal.vue` - Added section comments
- `front/src/views/budget/components/ProvidersSummary.vue` - Added section comments
- `front/src/views/budget/components/TemplatesModal.vue` - Added section comments
- `front/src/views/statistics/StatisticsPage.vue` - Added section comments
- `front/src/views/statistics/cashFlow/CashFlow.vue` - Added section comments
- `front/src/views/statistics/performance/PerformancePage.vue` - Added section comments
- `front/src/views/suppliers/SuppliersPage.vue` - Added section comments
- `front/src/views/suppliers/accounts/AccountsPage.vue` - Added section comments
- `front/src/views/sync/SyncView.vue` - Added section comments
- `front/src/views/templates/TemplatesView.vue` - Added section comments

---

## [v0.36.0] - 2026-01-22

### Added

- Add StatisticsController class with centralized state management for statistics views
- Add SyncController class for managing sync state (online status, syncing, pending changes)
- Add PDF report generation capabilities with html2canvas and jspdf in StatisticsController
- Add hover state management for performance metrics display
- Add modal state management for snapshot comparisons

### Refactored

- Refactor MainMenu.vue to use SyncController instead of useSync composable
- Refactor SyncStatus.vue to use SyncController for reactive sync state
- Refactor DayPerformanceComponent.vue to use StatisticsController for shared state
- Refactor MonthPerformanceComponent.vue to use StatisticsController for shared state
- Refactor WeekPerformanceComponent.vue to use StatisticsController for shared state
- Refactor YearPerformanceComponent.vue to use StatisticsController for shared state
- Refactor BudgetView.vue to use AccountsController instead of direct store access
- Refactor InicioViewComponent.vue to use BudgetController for day closed state
- Refactor ProvidersComponent.vue to use controller classes (BudgetController, SuppliersController, AccountsController, SyncController)
- Refactor SuppliersPage.vue to use suppliersController instead of useSuppliersStore
- Refactor SyncView.vue to use SyncController for sync operations

### Fixed

- Fix setTimeout type in syncService.ts for proper TypeScript typing
- Add Account type export in accountsController.ts for type safety
- Add syncProvidersWithSuppliers method in budgetController.ts for provider/supplier sync
- Add subscribeToChanges method in suppliersController.ts for reactive supplier updates

### Architecture

- Implement View → Controller → Store pattern consistently across all views
- Extract shared state management from composables into controller classes
- Centralize PDF generation, hover states, and modal management in StatisticsController
- Centralize sync state management in SyncController class

---

## [v0.35.0] - 2026-01-21

### Added

- Add SyncView.vue component with complete sync status management UI
- Add pending changes counter badge in main menu with real-time updates
- Add dataClearService.ts for comprehensive user data clearing (localStorage + IndexedDB)
- Add /sync route for accessing sync management page

### Changed

- Enhance logout flow with warning dialog when pending sync changes exist
- Clear all user data (auth tokens, sync queue, IndexedDB stores) on logout
- Update MainMenu to show sync status with pending changes count
- Add useSync composable integration to MainMenu for reactive sync state

### Files Changed

**Frontend:**
- `front/src/components/MainMenu.vue` - Added sync menu item with pendingChanges badge
- `front/src/controllers/authController.ts` - Enhanced logout with pending sync warning and data clearing
- `front/src/router/index.ts` - Added /sync route for SyncView
- `front/src/services/dataClearService.ts` - New service for clearing user data on logout
- `front/src/views/sync/SyncView.vue` - New sync status and management page

---

## [v0.34.2] - 2026-01-21

### Fixed

- Enhance sync responses to return both sync_id and MySQL server ID for created/updated entities
- Update local IndexedDB records with server IDs after successful sync operations
- Fix budget_provider_product sync_id resolution to handle supplier_product references properly
- Improve supplier product sync with proper sync_id generation and mapping
- Add robust IndexedDB store creation and migration handling for new stores

### Changed

- Add id_server field to sync payloads for server-side primary key tracking
- Add serverId and synced_at fields to all syncable entities for ID mapping
- Add debug logging throughout sync flow for troubleshooting
- Update DixieController with improved getEntry method for sync_id lookups

### Files Changed

**Backend:**
- `back/app/Http/Controllers/SyncController.php` - Enhanced response format with server IDs

**Frontend:**
- `front/src/controllers/dixie.ts` - Improved IndexedDB handling and store creation
- `front/src/controllers/suppliersController.ts` - Added serverId fields and product sync improvements
- `front/src/services/syncService.ts` - Added updateLocalRecordsWithMysqlIds function
- `front/src/controllers/TempalteController.ts` - Added serverId and synced_at fields
- `front/src/controllers/accountsController.ts` - Store state management improvements
- `front/src/controllers/budgetController.ts` - Supplier sync_id handling
- `front/src/stores/accountsStore.ts` - Added serverId field to Account type
- `front/src/stores/budgetStore.ts` - Added serverId and sync_id fields
- `front/src/stores/templatesStore.ts` - Added synced_at field
- `front/src/composables/useSync.ts` - Enhanced provider sync with supplierSyncId parameter
- `front/src/views/budget/components/EditProviderModal.vue` - Updated for sync_id-based lookups
- `front/src/views/suppliers/SuppliersPage.vue` - Sync improvements
- `front/src/views/suppliers/modals/AddSupliersComponent.vue` - Sync handling

---

## [v0.34.1] - 2026-01-20

### Fixed

- Fix supplier/provider lookups to use sync_id (MySQL ID) instead of local id
- Add fallback to local id when sync_id is not found in suppliers list
- Add sync_id field to provider objects for consistent cross-device identification
- Update InicioViewComponent, ProvidersComponent, and EditProviderModal to use sync_id-based lookups

### Changed Files

- `front/src/views/budget/InicioViewComponent.vue` - Updated supplier lookup to use sync_id with id fallback
- `front/src/views/budget/ProvidersComponent.vue` - Updated provider edit to use sync_id with id fallback
- `front/src/views/budget/components/EditProviderModal.vue` - Added sync_id field, updated provider lookups

---

## [v0.34.0] - 2026-01-20

### Features

- Add supplier products management with sync support
- Add budget providers with products tracking and sync integration
- Implement new sync entity types: budget_provider, budget_provider_product, supplier_product
- Add full bidirectional sync for suppliers, products, and budget providers
- Add frontend functions: syncSupplierProduct, syncBudgetProvider, syncBudgetProviderProduct
- Add backend processing for nested product data within budget provider sync operations

### New Files (Backend)

- `back/app/Models/BudgetProvider.php` - Model for budget provider (day visit) data
- `back/app/Models/BudgetProviderProduct.php` - Model for budget provider products with quantities
- `back/app/Models/SupplierProduct.php` - Model for supplier product catalog

### New Migrations (Backend)

- `2026_01_16_000008_create_budget_providers_table.php` - Budget providers table
- `2026_01_16_000009_add_product_quantities_to_budget_providers.php` - JSON product quantities field
- `2026_01_16_000010_create_budget_provider_products_table.php` - Budget provider products table
- `2026_01_16_000011_create_supplier_products_table.php` - Supplier products table
- `2026_01_16_000012_add_supplier_product_fk_to_budget_provider_products.php` - Foreign key
- `2026_01_16_000013_change_supplier_id_to_string_in_supplier_products.php` - Use sync_id
- `2026_01_16_000014_add_sync_id_to_supplier_products.php` - Sync ID support
- `2026_01_16_000015_change_budget_provider_id_to_string_in_budget_provider_products.php` - Use sync_id

### Changed Files (Backend)

- `back/app/Http/Controllers/SyncController.php` - Added budget_provider, budget_provider_product, supplier_product entity types
- `back/app/Models/Supplier.php` - Added supplierProducts relationship
- `back/app/Models/User.php` - Added suppliers and accounts relationships

### Changed Files (Frontend)

- `front/src/composables/useSync.ts` - Added syncSupplierProduct, syncBudgetProvider, syncBudgetProviderProduct functions
- `front/src/controllers/budgetController.ts` - Added sync integration for providers with products
- `front/src/controllers/suppliersController.ts` - Added product sync and fullSyncAndSave functionality
- `front/src/services/syncService.ts` - Added new entity types, fullSyncAndSave, debounced sync processing
- `front/src/stores/budgetStore.ts` - Added Provider.products support
- `front/src/views/budget/InicioViewComponent.vue` - Updated for provider product handling
- `front/src/views/budget/ProvidersComponent.vue` - Updated for provider sync
- `front/src/views/budget/components/EditProviderModal.vue` - Updated for product management

---

## [v0.33.0] - 2026-01-18

### Features

- Added budget/day synchronization with backend
- Created Budget model and migration for storing day metadata (date, isDayClosed, finishDayData)
- Added syncBudget() function to sync budget state with server
- Added Entry model (renamed from Income) with proper table naming
- Implemented automatic sync of entries (create/update/delete) to backend
- Added 'budget' and 'entry' entity types to sync system

### Breaking Changes

- Renamed database table from `incomes` to `entries`
- Renamed model from `Income` to `Entry`
- Updated sync entity type from 'income' to 'entry'

### Bug Fixes

- Fixed EditEntryModal not displaying amount when editing entries
- Added missing `amount` and `groups` props to entryData type
- Updated openEditEntryModal to pass amount and groups data

### Changed Files

**Backend:**
- `back/app/Models/Budget.php` - New Budget model for day metadata
- `back/app/Models/Entry.php` - New Entry model (renamed from Income)
- `back/app/Http/Controllers/SyncController.php` - Added budget and entry entity types
- `back/database/migrations/2026_01_16_000006_create_budgets_table.php` - Budgets table migration
- `back/database/migrations/2026_01_16_000007_rename_incomes_to_entries_table.php` - Rename migration

**Frontend:**
- `front/src/services/syncService.ts` - Added budget and entry entity types
- `front/src/composables/useSync.ts` - Added syncBudget function, updated syncEntry to use 'entry' type
- `front/src/controllers/budgetController.ts` - Added automatic sync for entry create/update/delete
- `front/src/views/budget/InicioViewComponent.vue` - Pass amount/groups to EditEntryModal
- `front/src/views/budget/components/EditEntryModal.vue` - Added amount and groups to entryData type

---

## [v0.32.3] - 2026-01-18

### Fixed

- Fix save button not working when creating new budget entries
- Fix saveEntryChanges function to properly receive data from EditEntryModal emit event
- Fix isFormValid computed to use editEntryModalData and entryItems directly instead of entryFormState
- Fix EditEntryModal watcher to only reset entryItems when entry ID changes, preventing user input from being overwritten

### Changed Files

- `front/src/views/budget/InicioViewComponent.vue` - Fix saveEntryChanges to accept emitted data parameter, fix isFormValid computed
- `front/src/views/budget/components/EditEntryModal.vue` - Fix watcher to track props.entryData.id instead of deep watching entire object

---

## [v0.32.2] - 2026-01-16

### Fixed

- Fix template editing to properly pass sync_id between TemplatesView and AddTemplateComponent
- Add sync_id field to TemplateSummary type in AddTemplateComponent
- Add editingTemplate ref in TemplatesView to properly track the template being edited
- Add sync_id generation and persistence in TempalteController for templates without sync_id
- Fix tempalteController.saveTemplate to use existing sync_id for update operations

### Changed Files

- `front/src/views/templates/TemplatesView.vue` - Added editingTemplate ref, proper template passing to modal
- `front/src/views/templates/modals/AddTemplateComponent.vue` - Added sync_id to TemplateSummary type
- `front/src/controllers/TempalteController.ts` - Added sync_id support for templates

---

## [v0.32.1] - 2026-01-16

### Fixed

- Fix sync_id not being passed in account modal payload when editing accounts
- Fix accountsController to properly handle sync_id for create/update/delete operations
- Fix sync_id generation and persistence in loadAll() to ensure all accounts have sync_id
- Fix AddAccountComponent to include sync_id in the saved payload for proper update operations

### Changed Files

- `front/src/controllers/accountsController.ts` - Added sync_id generation, proper handling in loadAll/add/update/delete
- `front/src/views/suppliers/accounts/modals/AddAccountComponent.vue` - Pass sync_id in payload when editing

---

## [v0.32.0] - 2026-01-16

### Added

- Add complete bidirectional offline-first synchronization system
- Add SyncService with offline operation queue and automatic retry (max 3 attempts)
- Add SyncController with endpoints: `/sync/changes`, `/sync/merge`, `/sync/full`, `/sync/resolve-conflict`
- Add SyncStatus.vue component for visual sync indicator in main menu
- Add useSync composable for integrating synchronization with Vue stores
- Add sync_id field to all entities for consistent cross-device identification
- Add conflict resolution with last-write-wins strategy using timestamps

### New Files (Backend)

- `back/app/Http/Controllers/SyncController.php` - Main sync API controller
- `back/app/Models/Account.php` - Account model with sync fields
- `back/app/Models/Income.php` - Income/Expense model with sync fields
- `back/app/Models/Supplier.php` - Supplier model with sync fields
- `back/app/Models/Template.php` - Template model with sync fields
- `back/app/Models/SyncMetadata.php` - Sync state tracking model
- `back/database/migrations/2026_01_16_000001_create_sync_metadata_table.php`
- `back/database/migrations/2026_01_16_000002_create_accounts_table.php`
- `back/database/migrations/2026_01_16_000003_create_incomes_table.php`
- `back/database/migrations/2026_01_16_000004_create_suppliers_table.php`
- `back/database/migrations/2026_01_16_000005_create_templates_table.php`

### New Files (Frontend)

- `front/src/services/syncService.ts` - Sync queue and API service
- `front/src/composables/useSync.ts` - Sync composable for stores
- `front/src/components/SyncStatus.vue` - Visual sync status indicator

### Changed Files (Backend)

- `back/routes/api.php` - Added sync routes with authentication middleware

### Changed Files (Frontend)

- `front/src/controllers/suppliersController.ts` - Added sync integration for create/update/delete
- `front/src/stores/accountsStore.ts` - Added sync integration
- `front/src/stores/templatesStore.ts` - Added sync integration
- `front/src/views/suppliers/SuppliersPage.vue` - Added sync_id handling for updates
- `front/src/views/suppliers/modals/AddSupliersComponent.vue` - Pass sync_id in payload
- `front/src/components/MainMenu.vue` - Added SyncStatus component

### Fixed

- Fix timestamp format issue (milliseconds to seconds conversion for MySQL datetime)
- Fix ID field truncation error when updating entities
- Fix sync_id persistence between create and update operations

### How Sync Works

1. **Offline-First**: All changes are saved locally first, then queued for sync
2. **Auto-Sync**: When online, queued operations are processed automatically
3. **Conflict Resolution**: Last-write-wins using timestamps; conflicts stored in sync_metadata
4. **Visual Feedback**: SyncStatus shows online/offline state, pending changes count, last sync time

---

## [v0.31.0] - 2026-01-16

### Changed

- Migrate authentication from session-based cookies to Bearer tokens
- API endpoints now return user data and token on login/register
- Replace CSRF token flow with stateless Bearer token authentication
- Remove session middleware from API routes (no longer needed)

### Added

- Add `tokenStorage.ts` service for hybrid token storage (localStorage for web, prepared for Capacitor Preferences)
- Add `HasApiTokens` trait to User model for Sanctum token generation
- Login and register endpoints now return `{ user, token }` response

### Improved

- Authentication now works seamlessly across different ports/domains
- Prepared for Capacitor native app deployment (Android/iOS)
- Simplified API middleware configuration

### Backend Files Changed

- `back/app/Http/Controllers/Auth/AuthenticatedSessionController.php` - Returns token on login, revokes on logout
- `back/app/Http/Controllers/Auth/RegisteredUserController.php` - Returns token on registration
- `back/app/Models/User.php` - Added HasApiTokens trait
- `back/bootstrap/app.php` - Removed session middleware for API
- `back/routes/api.php` - Grouped protected routes, logout requires auth

### Frontend Files Changed

- `front/src/controllers/authController.ts` - Uses Bearer tokens instead of cookies
- `front/src/services/tokenStorage.ts` - New hybrid storage service for auth tokens

---

## [v0.30.0] - 2026-01-13

### Added

- Add complete authentication system with Laravel Breeze scaffolding
- Add user registration, login, logout, email verification, and password reset functionality
- Add Laravel Sanctum for secure API token-based authentication
- Add frontend authentication views: LoginView and RegisterView
- Add authStore for managing authentication state in Vue application
- Add authController for authentication API calls and state management
- Add API routes for authentication endpoints (auth.php, api.php)
- Add CORS configuration for frontend-backend communication
- Add personal_access_tokens table migration for Sanctum

### Features

- Backend authentication supports login with either email or username
- Password reset URLs redirect to frontend application
- Email verification middleware protects API endpoints
- Session-based authentication with Sanctum token support

### Breaking Changes

- User model now requires 'user' (username) field in addition to email
- Database migration adds 'user' column to users table

### Backend Files Changed

- back/app/Http/Controllers/Auth/*.php (6 new controllers added)
- back/app/Http/Middleware/EnsureEmailIsVerified.php (new middleware)
- back/app/Http/Requests/Auth/LoginRequest.php (new form request)
- back/app/Models/User.php (added 'user' field)
- back/app/Providers/AppServiceProvider.php (password reset URL configuration)
- back/bootstrap/app.php (API middleware configuration)
- back/composer.json (added laravel/sanctum, laravel/breeze)
- back/config/cors.php (new configuration)
- back/config/sanctum.php (new configuration)
- back/database/migrations/* (personal_access_tokens table)

### Frontend Files Changed

- front/src/controllers/authController.ts (new)
- front/src/stores/authStore.ts (new)
- front/src/router/index.ts (auth routes added)
- front/src/components/MainMenu.vue (auth-related items)
- front/src/views/auth/LoginView.vue (new)
- front/src/views/auth/RegisterView.vue (new)

---

## [v0.29.1] - 2026-01-12

### Refactor

- Extract inline entry modal from InicioViewComponent into reusable EditEntryModal component
- Extract inline templates modal from ProvidersComponent into reusable TemplatesModal component
- Extract inline notes modal from ProvidersComponent into reusable NotesModal component

### Files Changed

- front/src/views/budget/InicioViewComponent.vue (modified)
- front/src/views/budget/ProvidersComponent.vue (modified)
- front/src/views/budget/components/EditEntryModal.vue (added)
- front/src/views/budget/components/NotesModal.vue (added)
- front/src/views/budget/components/TemplatesModal.vue (added)

---

## [v0.29.0] - 2026-01-12

### Added

- Add day closure feature that creates immutable frozen snapshot of entries, providers, and finish day data
- Add "Form" and "Resumen" views in BudgetView for viewing/editing after day is closed
- Add day summary card displaying providers count, income/expense totals, balance, and start/end timestamps
- Add frozen snapshot functionality in budgetController and budgetStore for data preservation
- Add warning message in FinishDayForm about data becoming immutable after saving

### Changed

- Refactor BudgetView to allow navigation and date selection even when day is closed
- Refactor all budget views (InicioViewComponent, ProvidersComponent, AccountCards) to disable editing when day is closed
- Update ProviderCardComponent to show "Día cerrado" state and disable all interactions
- Update FinishDayForm with warning icon and styling for better UX
- Translate console logs to Spanish for consistency

### Files Changed

- front/src/controllers/budgetController.ts (modified)
- front/src/stores/budgetStore.ts (modified)
- front/src/views/budget/BudgetView.vue (modified)
- front/src/views/budget/FinishDayForm.vue (modified)
- front/src/views/budget/InicioViewComponent.vue (modified)
- front/src/views/budget/ProviderCardComponent.vue (modified)
- front/src/views/budget/ProvidersComponent.vue (modified)
- front/src/views/budget/components/AccountCards.vue (modified)

---

## [v0.28.3] - 2026-01-11

### Added

- Add breakpoint detection and logging functions in main.ts for development debugging
- Log current Ionic breakpoint (xs, sm, md, lg, xl) on app mount and window resize

### Changed

- Improve responsive layout in InicioViewComponent by adjusting size-xl column from 3 to 4 for better desktop display
- Increase budget summary card width for improved visibility on large screens

### Refactor

- Redesign ProvidersSummary Resultado Total Card with ion-card-header and ion-item components
- Replace custom div layout with native Ionic components for better accessibility and styling
- Update ingresos/egresos display to use color-coded ion-label slots for improved visual hierarchy

### Files Changed

- front/src/main.ts (modified)
- front/src/views/budget/InicioViewComponent.vue (modified)
- front/src/views/budget/components/ProvidersSummary.vue (modified)

---

## [v0.28.2] - 2026-01-11

### Added

- Add icons to MainMenu navigation items for improved visual navigation
- Add wallet, document, business, layers, statsChart, speedometer, construct, and colorPalette icons to menu items
- Add test data insertion feature for development mode in BudgetView
- Add responsive layout breakpoints (size-lg, size-xl) for better tablet and desktop support

### Changed

- Redesign MainMenu with cleaner styling: remove transparent class, add icons, change lines to none
- Refactor InicioViewComponent with improved responsive layout and scroll behavior
- Simplify ProviderCardComponent from card design to ion-item for cleaner list appearance
- Major refactor EditProviderModal with new UI: save button in header, improved search, better segment navigation
- Remove borders and adjust background styles in variables.css for cleaner visual hierarchy
- Remove modal height restriction from AccountCards for better content flexibility

### Fixed

- Fix typo "etalles" to "Detalles" in InicioViewComponent entry form
- Fix ion-button order in AddAccountComponent for consistent button placement

---

## [v0.28.1] - 2026-01-10

### Refactor

- Move statistics period components to performance directory for better co-location
- Relocate `PeriodLayout.vue`, `PeriodChartWrapper.vue`, and `PeriodSnapshots.vue` from `components/statistics/` to `views/statistics/performance/components/`
- Update imports in all performance view components to use relative paths

### Files Changed

- front/src/views/statistics/performance/components/PeriodLayout.vue (moved)
- front/src/views/statistics/performance/components/PeriodChartWrapper.vue (moved)
- front/src/views/statistics/performance/components/PeriodSnapshots.vue (moved)
- front/src/views/statistics/performance/day/DayPerformanceComponent.vue (modified)
- front/src/views/statistics/performance/month/MonthPerformanceComponent.vue (modified)
- front/src/views/statistics/performance/week/WeekPerformanceComponent.vue (modified)
- front/src/views/statistics/performance/year/YearPerformanceComponent.vue (modified)

---

## [v0.28.0] - 2026-01-10

### Added

- Add reusable `EditProviderModal.vue` component for editing providers and provider entries
- Add total income/expense result card in InicioViewComponent showing balance difference
- Add quick account creation button in entry modal for creating accounts on the fly
- Add account requirement validation for providers before allowing entry creation

### Changed

- Refactor `addProviderEgresos` in budgetController to use single entry with `estimated` field instead of multiple entries for efectivo/tarjeta/credito
- Refactor InicioViewComponent to use EditProviderModal for provider entry editing
- Refactor ProvidersComponent to use EditProviderModal for provider add/edit functionality
- Simplify provider amount display to show only estimated value
- Remove "Sin cuenta" (no account) category from account cards and displays
- Update `handleProviderDeleted` to also remove linked egresos entries

### Refactor

- Extract provider modal logic from InicioViewComponent and ProvidersComponent into shared EditProviderModal component
- Consolidate provider selection and editing workflow into unified modal interface

### Files Changed

- front/src/controllers/budgetController.ts (modified)
- front/src/views/budget/InicioViewComponent.vue (modified)
- front/src/views/budget/ProviderCardComponent.vue (modified)
- front/src/views/budget/ProvidersComponent.vue (modified)
- front/src/views/budget/components/EditProviderModal.vue (added)
- front/src/views/budget/components/ProvidersSummary.vue (modified)

---

## [v0.27.1] - 2026-01-10

### Fixed

- Fix data persistence not saving after provider and entry operations (add, update, delete)
- Fix budget data loading by moving `loadDataForCurrentDate` to BudgetView on mount
- Fix clear day operation to save data immediately after clearing

### Changed

- Redesign ProvidersSummary component with improved per-account summary layout
- Add AccountBarChart visualization for income vs expense per account
- Display difference with color-coded success/danger styling per account
- Simplify layout by consolidating grid structure into single list with summary card
- Update currency formatting to include `$` prefix in difference labels

### Developer

- Add debug logging to budgetController for data loading and saving operations

### Files Changed

- front/src/controllers/budgetController.ts (modified)
- front/src/views/budget/BudgetView.vue (modified)
- front/src/views/budget/InicioViewComponent.vue (modified)
- front/src/views/budget/ProvidersComponent.vue (modified)
- front/src/views/budget/components/ProvidersSummary.vue (modified)

---

## [v0.27.0] - 2026-01-09

### Breaking Changes

- Replace `dollar` field with `accountId` in Provider interface across the entire codebase
- Remove `_accountName` and `_accountType` metadata fields from Provider interface

### Changed

- Refactor ProvidersSummary to dynamically group totals by account using accountsStore
- Refactor ProviderCardComponent to compute account display from accountsStore instead of provider metadata
- Refactor ProvidersComponent to use computed properties for reactive providers list
- Update budgetStore updateProvider to use splice for proper Vue reactivity
- Simplify provider value calculations by removing dollar fallback logic across all cash flow components

### Fixed

- Fix Vue reactivity issue in budgetStore.updateProvider by replacing object in array instead of mutating

### Files Changed

- front/src/composables/usePerformancePeriod.ts (modified)
- front/src/controllers/budgetController.ts (modified)
- front/src/controllers/migrationService.ts (modified)
- front/src/controllers/templateService.ts (modified)
- front/src/stores/budgetStore.ts (modified)
- front/src/views/budget/InicioViewComponent.vue (modified)
- front/src/views/budget/ProviderCardComponent.vue (modified)
- front/src/views/budget/ProvidersComponent.vue (modified)
- front/src/views/budget/components/ProvidersSummary.vue (modified)
- front/src/views/statistics/cashFlow/day/DayComponent.vue (modified)
- front/src/views/statistics/cashFlow/month/MonthComponent.vue (modified)
- front/src/views/statistics/cashFlow/week/WeekComponent.vue (modified)
- front/src/views/statistics/cashFlow/year/YearComponent.vue (modified)

---

## [v0.26.0] - 2026-01-09

### Added

- Add provider add/edit modal with supplier search functionality in ProvidersComponent
- Add account selection for splitting provider amounts across multiple accounts
- Add product quantities tracking with coverage validation and warning display
- Add supplier change notification system with subscribe/notify pattern in suppliersStore
- Add provider-supplier synchronization to keep provider data updated when suppliers change

### Changed

- Refactor ProviderCardComponent to clickable card design with cleaner supplier/account display
- Update budgetController.addProvider to accept new supplier and account fields
- Update suppliersController to notify subscribers after add/update/delete operations
- Update budgetStore Provider interface with new supplier and account metadata fields

### Features

- New provider modal allows searching and selecting from existing suppliers
- Multiple account support with validation preventing duplicate account selection
- Product coverage tracking shows warning when entered amounts don't match product costs
- Real-time sync between providers and suppliers when supplier data changes

---



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
- src/views/budget/components/SummaryCards.vue (modified)
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
- src/views/templates/modals/ApplyTemplateComponent.vue (modified)

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

---


