## [v0.1.26] - 2025-11-12

- Build: Use relative base and hash routing for static deployments
  - index.html: change base href from '/' to './' so the app can be served from a relative path.
  - Router: switch from createWebHistory to createWebHashHistory to avoid server-side history fallback requirements.
  - Vite: export defineConfig as a function and set base to './' when building so asset paths are correct for relative deployments.

**Files changed in this release**

- `index.html`
- `src/router/index.ts`
- `vite.config.ts`
- `CHANGELOG.md`


## [v0.1.25] - 2025-11-11

- Packaging: Add RPM packaging support and helper scripts to build RPM artifacts for the Electron app using fpm.
  - Add build-rpm.sh: shell helper that assembles a staging tree, generates a .desktop file and icon mappings, and calls fpm to build an RPM package.
  - Add electron/build-rpm.mjs: Node launcher that invokes build-rpm.sh from the project root.
- Desktop: Add a desktop entry (build/abogaz.desktop) and include icon assets under the hicolor/pixmaps locations.
- Build: Update package.json to add an electron:build-rpm script and adjust build metadata (appId, productName, executableName) for the desktop build.
- Assets: Add public/PuntoClick.png icon resource used by packaging.

**Files changed in this release**

- `build-rpm.sh`
- `build/abogaz.desktop`
- `electron/build-rpm.mjs`
- `package.json`
- `public/PuntoClick.png`

## [v0.1.24] - 2025-11-11

- Platform: Add initial Electron support and packaging helpers
  - Electron: integrate main and preload processes, add packaging/build scripts and basic native build configuration to support desktop apps.
  - Icons: add an icon generator and packaging resources to produce platform-specific icons.
- Build: Update package.json and pnpm lockfiles to add required dependencies and scripts for the new Electron workflows.
- Repo: Update .gitignore to exclude new build artifacts and generated files from the packaging process.
- Refactor: Small refactors in the Templates store and minor housekeeping changes across build scripts.

**Files changed in this release**

- `.gitignore`
- `package.json`
- `pnpm-lock.yaml` and other pnpm lockfiles
- `build-all.js`, `build-rpm.sh` (build/packaging helpers)
- `scripts/` (icon generator and packaging helpers)
- `src/electron/` (electron integration files)
- `src/stores/Templates*`


## [v0.1.23] - 2025-11-10

- UX: Add confirmation alerts before deleting suppliers and providers
  - Suppliers: Replace direct delete action with a confirmation flow that opens an IonAlert showing the supplier name; add helpers to build alert buttons and perform the confirmed deletion while keeping alert state reset after dismiss.
  - Budget: Add a similar confirmation alert before removing a provider (includes provider name in the message) and wire the trash button to the confirmation flow; add robust handlers for confirm/cancel and ensure state is cleaned on dismiss.
  - General: Improve deletion UX to avoid accidental removals and ensure internal state resets to avoid leaking selection after dismiss.

**Files changed in this release**

- `src/views/SuppliersPage.vue`
- `src/views/budget/BudgetView.vue`


## [v0.1.22] - 2025-11-09

- Budget: Move BudgetView into a sub-folder and extract a reusable Products modal component
  - UI: Extract products modal into ProductsModalComponent and wire it into BudgetView, replacing the previous popover/modal inline implementation.
  - Data: Switch BudgetView to use a `modals.products` reactive structure and pass products/quantities/title to the new component; provide a handler to receive saved quantities and apply them back to provider estimates.
  - Files: Add `src/views/budget/modals/PoductsModalComponent.vue` and move `BudgetView.vue` into `src/views/budget/` while updating imports and cleanup variable names.

**Files changed in this release**

- `src/views/budget/BudgetView.vue`
- `src/views/budget/modals/PoductsModalComponent.vue`


## [v0.1.21] - 2025-11-09

- Budget: Add products modal and product-quantity selection per provider/date
  - UI: Add a products modal in BudgetView to show supplier products, allow entering quantities per product, and compute a provider estimate from price * quantity.
  - Data: Load suppliers' products into a suppliersProducts map (normalized by name) and provide helpers to detect providers that have products.
  - Persistence: Save selected product quantities per provider and selected date so selections can be reloaded when opening the modal for the same provider/date.

**Files changed in this release**n
- `src/views/BudgetView.vue`


## [v0.1.20] - 2025-11-08

- Suppliers: Refactor persistence and add product management UI
  - Controllers: Instantiate a per-operation DixieController for suppliers instead of keeping a long-lived instance.
  - Controllers: Deep-clone incoming supplier payloads to avoid passing Vue Proxy objects to IndexedDB (structured-clone issues).
  - Controllers: Add createdAt and updatedAt timestamps on create/update operations and sort supplier listings by createdAt descending.
  - Controllers: Lazily synchronize the Pinia suppliers store after add/update/delete/list to keep UI state consistent.
  - UI: SuppliersPage.vue: add product management inside the supplier modal (add/edit/remove products), product editing state, numeric price handling, and improved form reset/validation logic.

**Files changed in this release**

- `src/controllers/suppliersController.ts`
- `src/views/SuppliersPage.vue`



## [v0.1.19] - 2025-11-07

- Templates: Reload suppliers when opening the template creation or edit modal so updated supplier names are reflected immediately in the UI. Added openNewTemplate() helper which reloads suppliers before opening the create modal, and call loadSuppliers() at the start of editTemplate() to refresh supplier names for edit flow.
- Templates: Replace direct modal toggles with openNewTemplate() for the new-template button and minor code cleanups in TemplatesView.
- Suppliers: Small formatting and import consolidation cleanup in SuppliersPage.vue.

**Files changed in this release**

- `src/views/TemplatesView.vue`
- `src/views/SuppliersPage.vue`



# Changelog

## [v0.1.18] - 2025-11-07

- Suppliers: Refactor SuppliersController to create a per-operation DixieController instead of holding a long-lived singleton. Simplify imports and instantiate dedicated controller instances for suppliers operations.
- Suppliers: Add a Pinia suppliers store (useSuppliersStore) that provides reactive suppliers state and actions to load, create, update and delete suppliers. The controller now lazily synchronizes the store after add/update/delete/list operations to keep UI state in sync.

**Files changed in this release**

- `src/controllers/suppliersController.ts`
- `src/stores/suppliersStore.ts`



## [v0.1.17] - 2025-11-06

- Templates: Improve TemplatesView by adding suppliersSnapshot (preserve supplier names at save time), resolve supplier names more robustly when applying templates, and provide helpers to detect/remove deleted suppliers. Use ion-card for template preview and refine the apply-template UI to show supplier status (deleted/exists) and actions.
- Styles: Update list styling and class names (use .list-content), make transparent ion-list background explicit, and adjust related CSS for hover/touch behavior.
- Refactor: Switch templates container to a ref, tighten TypeScript typings for supplier mapping, reorganize imports (IonCard / IonDatetimeButton), and improve form/description generation to include supplier snapshots.

**Files changed in this release**

- `src/views/TemplatesView.vue`
- `src/theme/variables.css`

## [v0.1.16] - 2025-11-04

- Templates: Add supplier selection to TemplatesView. Replace free-text providers with a searchable suppliers list, multi-select checkboxes, and chips for selected suppliers. Add suppliersController usage to load supplier list, store supplier IDs on template save, and preserve backward compatibility by parsing supplier names from template descriptions when necessary. Update apply-template flow to prefer stored supplier IDs and resolve names when applying templates.

**Files changed in this release**n
- `src/views/TemplatesView.vue`
- `src/controllers/suppliersController.ts`

## [v0.1.15] - 2025-11-04

- Suppliers: Add edit supplier flow and improve supplier list UI. SuppliersPage now displays contact, phone and email for each supplier, adds an Edit action that opens the modal in edit mode, and supports updating existing suppliers. Refactor to use a supplier store instance (updateSupplier) and introduce selectedId and an edit handler; unify payload handling for create vs update.

**Files changed in this release**

- `src/views/SuppliersPage.vue`

## [v0.1.14] - 2025-11-04

- Suppliers: Add suppliers management UI and data layer. Includes SuppliersPage (view) with create/delete modal and list, suppliersController for IndexedDB persistence, and a useSuppliers store for reactive access. Registered `/suppliers` route and added a menu entry in App.vue.

**Files changed in this release**

- `src/views/SuppliersPage.vue`
- `src/controllers/suppliersController.ts`
- `src/stores/useSuppliers.ts`
- `src/router/index.ts`
- `src/App.vue`

## [v0.1.13] - 2025-11-04

- Templates: Add edit/save flow to update existing templates from the UI. When editing, providers are parsed from the template description and prefilled. Fix modal title and button behavior for edit mode. Show distinct success toast messages for create vs update.
- Dixie: Add putEntry method to support updating existing IndexedDB entries via objectStore.put.
- TemplateController: Update saveTemplate to accept an optional id and use putEntry when updating templates; preserve createdAt and coerce string IDs to numeric when possible.

**Files changed in this release**

- `src/controllers/dixie.ts`
- `src/controllers/TempalteController.ts`
- `src/views/TemplatesView.vue`

## [v0.1.12] - 2025-11-04

- **Setup:** Added Prettier configuration (`.prettierrc.cjs`), introduced new ESLint configurations for better linting enforcement (
  including removal of `.eslintrc.cjs` and integrations via `eslint.config.js`).
- **Utilities:** Included new Prettier and Prettier plugin dependencies for formatting support in `package.json`.
- **Refactoring:** Replaced all double quotes with single quotes, structured imports for cleanliness, and switched event handlers to camel-case format.

**Files changed in this release**

- `.prettierrc.cjs`
- `.prettierignore`
- ESLint configurational files `eslint.config.js`

## [v0.1.11] - 2025-11-03

- UI: Display selected date in Budget header and add a "Today" quick button in the date popover; make the date selector background transparent and improve date-change handling.
- Templates: Use ion-datetime-button to open the date picker for applying templates and keep modal contents mounted; stop click propagation on end-slot action buttons to avoid triggering item row clicks.
- Styles: Reorganize ion-card, ion-item and ion-button utility CSS, adjust card shadows and background contrast for better visual consistency.

**Files changed for this release**

- `src/theme/variables.css`
- `src/views/BudgetView.vue`
- `src/views/TemplatesView.vue`

## [v0.1.10] - 2025-11-01

- Add "Apply template" modal in TemplatesView: allow selecting a date to apply a template; build provider payload from the template description and save it as a BudgetView backup for the selected date.
- Add confirm/cancel flow for applying templates, persist selected date to localStorage, and navigate to Budget view with a refresh query parameter so the Budget view reloads the applied data.
- Introduce pointer event handlers on BudgetView's providers list (pointerdown/pointerup/pointercancel) with proper registration and cleanup (onMounted/onUnmounted) to provide touch visual feedback.
- Improve watchers and reactivity in BudgetView: clarify watcher parameter names, support refresh via route query (TemplatesView -> BudgetView), and reorganize focus helper types for maintainability.
- Minor TypeScript typing and code-organization refactors in BudgetView and TemplatesView.

**Files changed for this release**n
- `src/views/BudgetView.vue`
- `src/views/TemplatesView.vue`

## [v0.1.9] - 2025-11-01

- Rename and improve backup API: replace putBackup with addEntry in the Dixie controller and expose BackupController.saveBackup. Improve logging and error handling in the IndexedDB helpers.
- Refactor TemplateController API: rename parameter from `t` to `template`, use dixie.addEntry when saving templates, improve listTemplates typing and payload mapping, and tighten deleteTemplate ID type.
- Fix event/parameter naming and template bindings in BudgetView and TemplatesView; apply various TypeScript typing and code-style cleanups.
- Minor UI/UX and internationalization tweaks and comment clarifications across App.vue, BudgetView.vue and TemplatesView.vue.

**Files changed for this release**

- `src/App.vue`
- `src/controllers/TempalteController.ts`
- `src/controllers/backupController.ts`
- `src/controllers/dixie.ts`
- `src/views/BudgetView.vue`
- `src/views/TemplatesView.vue`

## [v0.1.8] - 2025-10-31

- Fix filename typo in Templates controller and improve template management logic.
- Improve IndexedDB backup wrapper logging and error handling in `src/controllers/dixie.ts`.
- Update backup controller API/behavior in `src/controllers/backupController.ts`.
- Minor UI/UX fixes and tweaks in `src/views/BudgetView.vue`.

**Files changed in this release**

- `src/controllers/TempalteController.ts`
- `src/controllers/backupController.ts`
- `src/controllers/dixie.ts`
- `src/views/BudgetView.vue`

## [v0.1.7] - 2025-10-31

- Add Templates controller and update Templates view.
- Improve local IndexedDB backup wrapper logging and error handling in `dixie.ts`.
- Remove obsolete UI store file.

**Files changed in this release**

- `src/controllers/TempalteController.ts`
- `src/controllers/dixie.ts`
- `src/views/TemplatesView.vue`
- `src/stores/ui.ts`

## [v0.1.6] - 2025-10-30

- Add a responsive split-pane layout and side menu in `App.vue` using `VITE_APP_NAME` for the menu title.
- Register a new `/templates` route and include a new `TemplatesView` component for template management.
- Add `TemplatesView.vue` with a simple UI to list, create, and apply templates.
- Theme tweaks in `src/theme/variables.css`: transparent lists, content card border, and a no-shadow button utility.
- Add project environment file `.env` (VITE_APP_NAME).
- Remove obsolete backup/view file `src/views/BudgetView.bak.vue`.

**Files changed in this release**

- `.env`
- `src/App.vue`
- `src/router/index.ts`
- `src/theme/variables.css`
- `src/views/TemplatesView.vue`
- `src/views/BudgetView.bak.vue` (deleted)

## [v0.1.5] - 2025-10-30

- Improve date popover UX in `BudgetView`: add a dedicated "Today" button to quickly reset the selected date.
- Keep the popover contents mounted to avoid re-render flicker and retain state during open/close cycles.
- Remove ad-hoc inline styling from `ion-datetime` and rely on consistent layout/styling.
- Minor template cleanups in the popover block.

**Files changed in this release**

- `src/views/BudgetView.vue`

## [v0.1.4] - 2025-10-29

- Adjust layout and responsive column sizing in `BudgetView` to improve spacing on medium and large screens.
- Move and fix add/remove income button behavior and tidy the incomes section markup for clarity.
- Add touch visual feedback for provider cards (temporary `.touch-active` class) and register/unregister pointer event handlers using a new `providersBodyRef` to improve mobile UX.
- Introduce onUnmounted cleanup for the added listeners and several small accessibility/responsive CSS adjustments for provider cards (hover/focus/touch states).

**Files changed in this release**

- `src/views/BudgetView.vue`

## [v0.1.3] - 2025-10-29

- Refactor `BudgetView` provider card layout and styles: promote the displayed provider value, add provider actions (visited checkbox and delete button), and move inputs to compact floating labels for a cleaner layout.
- Replace `no-shadow` provider cards with a consistent `.shadow1` style and adjust the add-provider card sizing, padding and colors.
- Add provider notes display, small entrance animation for newly added providers, and CSS classes to improve spacing and responsiveness (e.g. `provider-top`, `provider-value`, `provider-actions`, `provider-row-fields`).
- Minor script updates: add `toggleVisited` helper and small template-friendly wrappers; reorganize some template markup and imports for clarity.
- Minor CSS cleanup: add `.transparent` ion-item background variable to `src/theme/variables.css` and consolidate several style refinements.

**Files changed in this release**

- `src/views/BudgetView.vue`
- `src/theme/variables.css`

## [v0.1.2] - 2025-10-28

- Add a small IndexedDB wrapper at `src/controllers/dixie.ts` to store local backups.
- Add `src/controllers/backupController.ts` to provide backup/restore helpers (put/list and latest-for-date).
- Integrate backup persistence into `BudgetView` with manual backup, debounced auto-save on data changes, and loading the latest backup for the selected date.

<!-- NOTE: This changelog entry was generated from unstaged changes in src/controllers/dixie.ts, src/controllers/backupController.ts and src/views/BudgetView.vue -->

## [v0.1.1] - 2025-10-28

- Add local backup support for `BudgetView` using a small IndexedDB wrapper (`dixie`) and a `backupController` to persist and list backups.
- Integrate backup/restore into `BudgetView`: manual backup action, debounced auto-save on data changes, and loading the latest backup for the selected date.
- Persist selected date in `localStorage` and add a date popover to choose/load data for other dates.
- Use stable IDs for income entries, add remove actions for incomes and providers, and improve new-provider focus behavior and entrance animation.
- Small UX and logging/error-handling improvements around backup operations and data loading.

<!-- NOTE: This changelog entry was generated based on modifications to src/controllers/dixie.ts, src/controllers/backupController.ts and src/views/BudgetView.vue -->

## [v0.1.0] - 2025-10-28

- Add ability to append an empty provider card to quickly create providers inline; new blank card auto-focuses the provider name input to speed up data entry.
- Introduce visual entrance animation for newly added providers (.provider-just-added) to improve perceived responsiveness.
- Use unique IDs for providers and store name input refs to enable per-item focus behavior and animations.
- Add computed totals: totalIngresos, totalProviders, totalVisitedProviders and helper valueToConsider to choose between dollar and estimated values.
- Allow adding inline income fields (addIngresoField) for quick income entry.
- Add formatCurrency utility (es-MX) for consistent currency display.
- UI and style refinements for provider cards, add-provider card, responsive layout, and numeric input alignment.

<!-- NOTE: This changelog entry was generated based on changes in src/views/BudgetView.vue -->
