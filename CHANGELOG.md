## [v0.1.54] - 2025-12-04

### Added

- Move provider between dates:
  - ProviderCardComponent: added a calendar icon button that opens a date popover; selecting a date emits `move-provider` with the provider and the selected date.
  - BudgetView: added `onMoveProvider` handler which removes the provider from the current in-memory list, builds a minimal backup payload for the destination date, persists it via `backupController.saveBackup`, and displays a toast confirming the move.

### Fixed

- ProviderCardComponent: fixed incorrect template bindings by consistently using `props.provider`; added stronger TypeScript typings (Provider, IonEvent) and ensured emitted payloads use the provider object.
- BudgetView: wired `move-provider` on ProviderCardComponent instances and added the `onMoveProvider` handler. Minor template formatting fixes.

### Changed

- Minor template and typing refinements for improved reactivity and maintainability.

### Files changed

- src/views/budget/ProviderCardComponent.vue
- src/views/budget/BudgetView.vue


## [v0.1.53] - 2025-12-02

### Added

- Add "Add existing supplier" popover in Budget view to pick suppliers from the suppliers database and quickly insert them into the providers list.
- Integrate supplier search UI (IonSearchbar) and computed filtering (filteredSuppliersEntries) to find suppliers by name or normalized key.
- Add provider-level filtering support: introduce searchQuery, filteredProviders and use filteredNotVisited / filteredVisited in the provider lists.

### Fixed

- Prevent adding duplicate providers by normalizing names in addProveedor and showing a toast when a duplicate is detected.
- Prevent creating multiple blank provider cards: add guards in addBlankProvider and addBlankProviderVisited to focus the existing blank entry instead of creating a new one.

### Changed

- Replace older provider list bindings with filtered versions (filteredNotVisited / filteredVisited) to enable search and avoid stale computed variables.
- Add related reactive state and imports (IonSearchbar, flashOutline) and wire popover state (popovers.addExistingSupplier) in BudgetView.

### Files changed

- src/views/budget/BudgetView.vue


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

(remaining history trimmed for brevity)
