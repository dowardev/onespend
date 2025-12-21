## [v0.9.0] - 2025-12-21

### Added

- Admin backups route: add `/admin/maintenance/backups` route and `Backups` page registration in `src/router/index.ts`.
- Clear day UI: add "Vaciar día" action and confirmation alert in `src/views/budget/BudgetView.vue` to clear providers and ingresos for the selected date.
- Clear day persistence: implement `performClearDay` to persist an empty `BudgetView` backup for the selected date (uses `dixieController`/`backupController` fallback) and reload view.
- Backup-by-id loading: allow loading a specific backup via `?backupId=` query param in `BudgetView` (applies backup data to view state).

### Changed

- Improve `BudgetView` routing and watchers to support asynchronous backup loading and route-driven refreshes.

### Fixed

- Add defensive persistence fallback when saving cleared-day backups: try `dixieController.addEntry`, then `putEntry`, then `backupController.saveBackup`.

### Files changed (staged)

- src/router/index.ts (modified)
- src/views/budget/BudgetView.vue (modified)

---
