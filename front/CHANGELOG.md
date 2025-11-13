## [v0.1.29] - 2025-11-13

- Dixie: Improve addEntry robustness and diagnostics
  - Catch synchronous errors when calling IndexedDB store.add and reject early with a clear error path.
  - Improve logging for request and transaction errors, including safer structured logging (name/message) and fallback logging paths.
  - Persist a brief last-error payload to localStorage (`dixie:lastError`) to aid offline diagnosis of failing addEntry operations.
  - Add transaction onabort handler to capture and persist abort details.

- Budget: Add Notes modal and related save/load logic
  - Add a Notes modal to BudgetView to view and edit provider notes per-provider and per-date.
  - Persist notes via dixieController (with addEntry/putEntry fallback) and update in-memory provider notes immediately when saving.
  - Move provider action buttons into the card footer and tidy imports for modal/textarea/icons.

**Files changed in this release**

- `src/controllers/dixie.ts`
- `src/views/budget/BudgetView.vue`


## [v0.1.28] - 2025-11-13

- Build / Packaging: add Electron and packaging-related dev dependencies (electron, electron-builder, asar, pngjs, concurrently) and update pnpm lock to include new packages.
- Dependencies: add date-fns for date formatting and adjust dependency ordering (Pinia / vue-router adjustments).
- Budget: use date-fns to display a formatted selected date in the budget title; refactor provider card markup and provider name editing behavior (use ion-blur, adjust input refs); tweak provider removal handler and related CSS adjustments.
- Templates: minor import reordering and small placeholder comment for future Ionic changes.
- Suppliers: add IonButtons and IonIcon imports in SuppliersPage.

**Files changed in this release**

- package.json
- pnpm-lock.yaml
- src/views/SuppliersPage.vue
- src/views/TemplatesView.vue
- src/views/budget/BudgetView.vue



## [v0.1.27] - 2025-11-12

- Budget: enable inline editing of provider names with dedicated edit mode and focus handling
  - Add an `_editing` flag on provider objects and show a focused name input when editing or when the provider has no name.
  - Add `startEditing` and `stopEditing` helpers that manage the edit mode and attempt to focus the name input using multiple strategies (setFocus / $el.setFocus / focus).
  - When adding a blank provider (`addBlankProvider`) mark the new item as `_editing` so the name input is focused automatically.
  - Normalize providers loaded from backups to ensure editor-state fields exist and always clear `_editing` when restoring from storage.

**Files changed in this release**

- `src/views/budget/BudgetView.vue`


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

... (rest of file unchanged)
