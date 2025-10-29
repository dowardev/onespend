# Changelog

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
