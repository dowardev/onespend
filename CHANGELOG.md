# Changelog

## [v0.1.0] - 2025-10-28

- Add ability to append an empty provider card to quickly create providers inline; new blank card auto-focuses the provider name input to speed up data entry.
- Introduce visual entrance animation for newly added providers (.provider-just-added) to improve perceived responsiveness.
- Use unique IDs for providers and store name input refs to enable per-item focus behavior and animations.
- Add computed totals: totalIngresos, totalProviders, totalVisitedProviders and helper valueToConsider to choose between dollar and estimated values.
- Allow adding inline income fields (addIngresoField) for quick income entry.
- Add formatCurrency utility (es-MX) for consistent currency display.
- UI and style refinements for provider cards, add-provider card, responsive layout, and numeric input alignment.

<!-- NOTE: This changelog entry was generated based on changes in src/views/BudgetView.vue -->
