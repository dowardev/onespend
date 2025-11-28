## [v0.1.43] - 2025-11-27

### Added
- Accelerated template application: Users can now quickly apply templates directly to the current date for improved workflow efficiency.
- Enhanced backup serializers with recursive sanitizer methods to manage IndexedDB compatibility issues.
- Introduced robust conflict resolution handlers for template merges with full UI integration (Combine/Overwrite).

### Changed
- Improved function formatting consistency within templates store.
- Modified date handling in controllers to ensure template merges are serialized correctly.

## [v0.1.42] - 2025-11-26

### Added

- Template apply conflict resolution: when applying a template to a date that already has saved data, the UI now prompts the user to Combine or Overwrite. Handlers were added to merge backups conservatively or overwrite existing data and persist the selected date for BudgetView. Files: src/views/templates/TemplatesView.vue

### Changed

- Improve backup persistence and IndexedDB safety: added a recursive sanitizer and attempted structuredClone fallback to ensure payloads saved to IndexedDB are serializable, with safer logging of error previews. Files: src/controllers/dixie.ts
- Minor formatting and function signature normalization in the templates store. Files: src/stores/templatesStore.ts

## [v0.1.41] - 2025-11-26

### Added

- Parent handlers for ProviderCardComponent: added @update-provider and @register-name-input bindings in BudgetView to centralize provider field updates and register name input refs, improving focus management and avoiding direct child prop mutation. Files: src/views/budget/BudgetView.vue.

### Changed

- Small template update in BudgetView to pass event handlers to ProviderCardComponent.


## [v0.1.40] - 2025-11-26

### Added

- Extracted ProviderCardComponent to improve readability and reuse; replaced inline provider markup with the component in BudgetView. Files: src/views/budget/ProviderCardComponent.vue, src/views/budget/BudgetView.vue.
- Improved providers lists: separate scrollable columns for "Asistio" / "No asistio", programmatic scrolling to newly added providers, and enhanced touch/focus handling for provider cards.
- Unified provider input handling: parent handlers for updating provider fields and registering name input refs; safer focus helpers and auto-focus when adding providers.

### Changed

- Refactored src/views/budget/BudgetView.vue: moved provider card logic into a standalone component, cleaned template and script, normalized reactive types and computed totals.


## [v0.1.39] - 2025-11-25

### Added

- UI and layout improvements in BudgetView: reorganized grid/row structure, split columns for "Asistio"/"No asistio", improved scrolling behavior and card layout for different viewports (src/views/budget/BudgetView.vue).
- Date navigation: added previous/next day buttons and changeDate(dateDelta) helper; made the date picker display the formatted date in the header.
- Incomes management: add/remove income rows, payment type selection (efectivo/digital), and computed totals per payment method.
- Summary enhancements: accordion breakdowns with estimations per payment method, signed balance (faltante) and per-method faltante with alert coloring.
- Providers: inline editing, per-provider payment inputs (efectivo, tarjeta, credito), visual separation of visited vs not visited providers, add-provider card and remove provider flow with confirmation.
- Products and quantities: integration with suppliersController to load products per provider, modal for selecting product quantities, computed estimated totals applied to providers and persisted per date.
- Notes: modal to edit and persist notes per provider (using dixieController), with in-memory update and persisted backup.
- Persistence & autosave: debounced auto-save of backups, load backups per selected date, and manual backup save improvements.
- Utilities and focus/accessibility: new helpers (normalizeName, nonNegative, valueToConsider*, isPaymentPrimary), pointer handling for touch feedback, and focus management helpers for inputs.

### Changed

- Major refactor and clean-up in src/views/budget/BudgetView.vue: template reorganization, script normalization and scoped style enhancements.


## [v0.1.38] - 2025-11-23

### Added

- Improve BudgetView layout: replaced nested ion-card markup with a clearer grid/row structure and a .list-content wrapper to fix layout and scrolling issues (src/views/budget/BudgetView.vue).
- Add computed totals for per-provider payments (totalEstimacionEfectivoTarjeta) and a signed balance indicator (faltante) used in the summary accordion (src/views/budget/BudgetView.vue).
- Restore and correct template labels and imports (IonAccordion / IonAccordionGroup) and minor accessibility/layout fixes.

### Changed

- Refactored the income and provider sections to improve responsiveness and editing UX (src/views/budget/BudgetView.vue).

**Files changed in this release**

- src/views/budget/BudgetView.vue


## [v0.1.37] - 2025-11-22

### Added

- Split providers UI into "Visited" and "Not visited" columns and restored the add-provider card; added explicit per-provider payment inputs (efectivo, tarjeta, credito) and payment-aware display/totals in BudgetView.
- Added income payment type selection (cash / digital) and computed totals by payment method.

### Changed

- Refactored BudgetView layout and provider card markup to improve mobile/desktop layout, accessibility and editing (src/views/budget/BudgetView.vue).
- Adjusted main card content height (src/theme/variables.css).
- Minor TemplatesView improvements: added IonSearchbar import and search-related refs (src/views/templates/TemplatesView.vue).

**Files changed in this release**

- src/views/budget/BudgetView.vue
- src/theme/variables.css
- src/views/templates/TemplatesView.vue


## [v0.1.36] - 2025-11-20

### Added

- Improve keyboard navigation and focus management for product inputs in PoductsModalComponent (src/views/budget/modals/PoductsModalComponent.vue): added id attributes to inputs, enterkeyhint and keydown handlers (Enter / ArrowUp / ArrowDown) to enhance accessibility and UX.

### Changed

- Refactored PoductsModalComponent: extracted focus helpers (focusNext/focusPrev), centralized key handling (handleEnter, handleArrowUp, handleArrowDown), and improved safe access to native input elements. Minor import and comment cleanups.

**Files changed in this release**

- src/views/budget/modals/PoductsModalComponent.vue
