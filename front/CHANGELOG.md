## [v0.1.52] - 2025-12-02

### Fixed

- ProviderCardComponent: Fix incorrect usage of the `provider` identifier by consistently referencing `props.provider`. Update emitted event payloads to pass the provider object (e.g. emit('visited-changed', { provider: props.provider, event })) so parent handlers receive the correct data and reactivity is preserved. This resolves runtime template errors and broken event flows.
- BudgetView: Minor comment and import/typo fix (controller comment label corrected) and small template bindings alignment tied to ProviderCardComponent changes.
- General: Small whitespace and comment cleanups returned by staged diffs.

### Files changed

- src/views/budget/ProviderCardComponent.vue
- src/views/budget/BudgetView.vue


## [v0.1.51] - 2025-12-02

### Fixed

- BudgetView: Fix event and handler bindings for ProviderCardComponent instances. Converted several prop-based handlers into emitted events (e.g. visited-changed, start-editing, stop-editing, open-products-popover, open-notes-modal, confirm-remove-proveedor) and updated parent bindings to use `@` event listeners. This resolves issues where child components could not communicate updates to the parent and prevents handler invocation errors in templates.
- BudgetView: Change navigation handlers to accept both old and new call shapes. `changeDate` now accepts either a numeric delta or an object { days } for readability. Added robust parsing and fallbacks for invalid dates.
- BudgetView: Improve delete/remove helpers to accept both legacy positional args and object-shaped params (e.g. removeIngreso, removeProveedor, confirmRemoveProveedor). This makes programmatic calls and event handlers more consistent and safer when invoked from child components.
- UI: Improve formatting of ion-alert button handlers and did-dismiss callbacks to be multi-line and more readable.
- ProviderCardComponent: Replace direct prop-callbacks with emitted events and simplify props. Ensure the component no longer expects parent callback props like onVisitedChanged and uses emits for communication.
- ProductsModalComponent: Small formatting and whitespace fixes, a few function reorderings, and minor async/await alignment changes that improve readability and maintainability.

### Changed

- TemplatesView: Normalize `void` usage for ref variables to access `.value` and silence TS unused warnings.
- General: Improve TypeScript-friendly signatures and parameter shapes across several handlers to accept object-shaped params for forward compatibility.

### Files changed

- src/views/budget/BudgetView.vue
- src/views/budget/ProviderCardComponent.vue
- src/views/budget/modals/PoductsModalComponent.vue
- src/views/templates/TemplatesView.vue
- src/views/templates/modals/AddTemplateComponent.vue


## [v0.1.50] - 2025-12-01

### Changed

- DixieController: ensure stored entries are plain, extensible objects before saving to IndexedDB; remove any existing `id` to allow autoIncrement keys; add fallback to `put()` when `add()` throws synchronously; improve error logging and last-error persistence in localStorage.
- BudgetView: normalize openNotesModal call shapes (accept provider object, {providerId}, id, or undefined); only attempt to load persisted notes when a valid providerId exists; clean up the notes initialization and ensure modals.notes.content is set predictably.
- ApplyTemplateComponent: fix datetime binding to use `:value="selectedDate"` so the IonDatetime receives the reactive value.

### Fixed

- Avoid potential IndexedDB DataCloneError and synchronous failures by sanitizing non-serializable values and shallow-copying objects before DB operations.
- Prevent attempts to query backups when provider id is missing (reduce noisy errors and unnecessary DB reads).

### Files changed

- src/controllers/dixie.ts
- src/views/budget/BudgetView.vue
- src/views/templates/modals/ApplyTemplateComponent.vue


## [v0.1.49] - 2025-12-01

### Added

- Product totals shown in Products modal header and computed per-product totals (quantity × price) to give immediate feedback when selecting product quantities.
- Overwrite confirmation flow when applying computed products totals to a provider that already has efectivo or tarjeta values. Includes a Promise-based helper (askOverwriteConfirm) and an Ionic alert to prompt the user.
- Date popover for Apply Template modal with a formatted display of the selected date and an update:applySelectedDate binding to allow selecting the target date before applying a template.

### Changed

- When saving products selections, the computed total is now applied to provider.efectivo (instead of the generic estimated field) and the UI will prompt the user before overwriting existing efectivo/tarjeta values.
- PoductsModalComponent now calculates and displays the formatted total in the header for improved UX.
- ApplyTemplateComponent: replaced the datetime button with a clickable row that opens a date popover and shows the selected date; simplified related template markup and improved event handling.

### Files changed

- src/views/budget/BudgetView.vue
- src/views/budget/modals/PoductsModalComponent.vue
- src/views/templates/modals/ApplyTemplateComponent.vue


## [v0.1.48] - 2025-11-30

### Added

- Added a search bar and filtering options to the `PoductsModalComponent` for better product management.
- Integrated visibility-based product filtering (all, with values, without values).
- Introduced search functionality within the product list, enabling users to locate products by name or title.
- Added keyboard navigation enhancements for smoother user interactions.
- Popover-based filter visualization and UI tweaks for filtering mode selectors.

### Changed

- Refactored `PoductsModalComponent` to improve reactivity and modular handling of search results and filtered states.
- Centralized key handling for navigation and accessibility refinements, including improved focus management.

### Meta

- Last change integrated to amend commit: feat(modals): enhance PoductsModalComponent with search, filtering, and keyboard navigation tools. Authored by dowardev.

## [v0.1.47] - 2025-11-30

### Added

- Optional product images: add Product.imageBase64 and show thumbnails in product lists and supplier modals.
- Image attachment UI in Add Suppliers modal with preview and removal, enabling suppliers to include product images.

### Changed

- Products modal and supplier UIs: improved keyboard navigation and focus management; inputs now ensure visibility when focused; introduced focused-border visuals and smoother scrolling behavior.
- PoductsModalComponent refactor: use a scrollable list container, focus tracking (focusedIndex) and ensureVisible helper to guarantee the focused input is visible.
- SuppliersController: extended Product type to support optional imageBase64 on products.

### Fixed

- Minor UI/UX fixes related to product rendering, input focus, and defensive checks during product loading and persistence.

## [v0.1.46] - 2025-11-29

### Changed

- Normalize controller and DB API signatures (DixieController.addEntry/putEntry, BackupController.saveBackup) to accept single-object parameters ({ entry }) and update call sites accordingly.
- Improve error handling and consistency: unify catch parameter names, small formatting and import cleanups across scripts and controllers.
- Improve template apply and backup flow: better conflict detection and merge handling; sanitize payloads before saving to avoid IndexedDB DataCloneError.
- Budget view and provider handling improvements:
  - Make product association resilient to provider name edits by persisting a supplier key (\_supplierKey) and mapping normalized names.
  - Normalize visited/change handlers and ProviderCardComponent interfaces to use parameter objects.
  - Ensure suppliers/products map and loading order are robust during mount.
- Small script fixes: generate-icons and electron build script formatting and robustness updates.

### Fixed

- Avoid IndexedDB DataCloneError by sanitizing payloads and ensuring plain objects are saved.

---

## [v0.1.46] - 2025-11-29

### Changed

- Normalize controller and DB API signatures and improve error handling across the codebase (DixieController, BackupController, TemplateController, SuppliersController and related stores).
- Improve template application and supplier-product association in BudgetView:
  - Preserve supplier keys and normalize supplier names to keep product associations stable when provider names are edited.
  - Better merging behavior when applying templates and improved conflict handling (combine/overwrite flows).
- UI and UX improvements:
  - ProviderCardComponent and Products modal: more robust event handling and focus behavior.
  - TemplatesView and AddTemplate/ApplyTemplate modals: code cleanup and defensive checks.
- Scripts & Electron tweaks: formatting and resilience improvements in scripts/generate-icons.mjs and electron build/start scripts.

### Fixed

- Reduce risk of IndexedDB DataCloneError by sanitizing payloads before saving and using plain objects for DB operations.
- Multiple defensive-catch fixes (rename unused catch vars to \_e) and small bug fixes across views and controllers.

---

## [v0.1.45] - 2025-11-29

### Changed

- Normalized storage API signatures and call sites:
  - DixieController.addEntry and DixieController.putEntry now accept a single object parameter { entry }.
  - BackupController.saveBackup now accepts { entry } and forwards it to the DB layer.
  - Updated TemplateController and SuppliersController to pass { entry } when calling the Dixie API.
- Updated BudgetView and TemplatesView to use the new save/add/put signatures (e.g. saveBackup({ entry }), dixieController.addEntry({ entry })) and added a helper (hasBackupMeaningfulContent) to improve template-apply conflict detection and merging.
- Refactored system configuration API and store:
  - Renamed variable `deisgnMode` to `designMode` in useSystemConfig.
  - setDesignMode now accepts an object parameter { mode } and getDesignMode returns the normalized value.
  - systemConfigController methods now accept parameters as objects and forward them accordingly.
- Minor formatting and import cleanups across several files.

### Fixed

- Avoid potential IndexedDB DataCloneError by sanitizing payloads before saving and consistently using plain objects for DB operations.

---

## [v0.1.44] - 2025-11-28

### Added

- Introduced `ProviderCardComponent`: Enhanced provider management in the budget view with dedicated component for better modularity.
- Integrated user notification system: Added toast alerts to guide users during interactions with providers.

### Changed

- Refined `sanitizeForIndexedDB` usage: Enhanced data handling consistency in Dixie Controller.
- Simplified `BudgetView` template: Replaced inline provider card logic with the new component.
- General template and dependency clean-up across BudgetView and ProviderCardComponent.

---

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
- Utilities and focus/accessibility: new helpers (normalizeName, nonNegative, valueToConsider\*, isPaymentPrimary), pointer handling for touch feedback, and focus management helpers for inputs.

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
