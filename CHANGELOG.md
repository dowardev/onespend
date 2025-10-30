# Changelog

## [v0.1.6] - 2025-10-30

- Add a responsive split-pane layout and side menu in `App.vue` using `VITE_APP_NAME` for the menu title.
- Register a new `/templates` route and include a new `TemplatesView` component for template management.
- Add `TemplatesView.vue` with a simple UI to list, create, and apply templates.
- Theme tweaks in `src/theme/variables.css`: transparent lists, content card border, and a no-shadow button utility.
- Add project environment file `.env` (VITE_APP_NAME).
- Remove obsolete backup/view file `src/views/BudgetView.bak.vue`.

**Files changed for this release**

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

**Files changed for this release**

- `src/views/BudgetView.vue`

## [v0.1.4] - 2025-10-29

- Adjust layout and responsive column sizing in `BudgetView` to improve spacing on medium and large screens.
- Move and fix add/remove income button behavior and tidy the incomes section markup for clarity.
- Add touch visual feedback for provider cards (temporary `.touch-active` class) and register/unregister pointer event handlers using a new `providersBodyRef` to improve mobile UX.
- Introduce `onUnmounted` cleanup for the added listeners and several small accessibility/responsive CSS adjustments for provider cards (hover/focus/touch states).

**Files changed for this release**

- `src/views/BudgetView.vue`

## [v0.1.3] - 2025-10-29

- Refactor `BudgetView` provider card layout and styles: promote the displayed provider value, add provider actions (visited checkbox and delete button), and move inputs to compact floating labels for a cleaner layout.
- Replace `no-shadow` provider cards with a consistent `.shadow1` style and adjust the add-provider card sizing, padding and colors.
- Add provider notes display, small entrance animation for newly added providers, and CSS classes to improve spacing and responsiveness (e.g. `provider-top`, `provider-value`, `provider-actions`, `provider-row-fields`).
- Minor script updates: add `toggleVisited` helper and small template-friendly wrappers; reorganize some template markup and imports for clarity.
- Minor CSS cleanup: add `.transparent` ion-item background variable to `src/theme/variables.css` and consolidate several style refinements.

**Files changed for this release**

- `src/views/BudgetView.vue`
- `src/theme/variables.css`

## [v0.1.2] - 2025-10-28

- Add a small IndexedDB wrapper at `src/controllers/dixie.ts` to store local backups.
- Add `src/controllers/backupController.ts` to provide backup/restore helpers (put/list and latest-for-date).
- Integrate backup persistence into `BudgetView` with manual backup, debounced auto-save on data changes, and loading the latest backup for the selected date.
- UI/UX improvements around income/provider handling: stable IDs for income entries, add/remove actions, auto-focus for new provider card, provider entrance animation, currency formatting and computed totals.

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
