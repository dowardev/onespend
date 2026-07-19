## [v0.73.0] - 2026-06-23

### Added

- Shared utility functions `formatCurrency` and `calcProviderProductsTotal` (`front/src/utils/currency.ts`)
- Shared budget types `AccountWithBalance`, `ProviderItem`, `EntryGroup` (`front/src/utils/budgetTypes.ts`)
- `user_id` field to `BudgetEntryGroup` fillable and corresponding migration
- `Supplier` type import to `budgetStore`
- `notes` optional field to `ProviderData` interface

### Changed

- Migrate budget components to use shared formatting utilities (SummaryCards, DaySummaryModal, AccountCards, ProviderCardComponent, InicioViewComponent)
- Migrate budget components to use shared budget types (InicioViewComponent, ProviderEditPage)
- Migrate ProvidersSummary from direct store access to controller pattern
- Apply named parameters pattern to domain functions across ProviderEditPage, ProvidersComponent, AccountCards
- Pass `user_id` when creating budget entry groups in SyncController

### Removed

- Remove 13 dead functions and variables from ProvidersComponent
- Remove dead code from ProviderEditPage (`_isAccountInvalid`, `_isAccountTouched`)
- Remove unused `AccountWithBalance` import from ProviderEditPage
- Remove dead CSS and empty methods from ProviderCardComponent
- Remove unused imports from EntryEditPage

### Fixed

- Broken `EditEntryModal.vue` import in InicioViewComponent
- `removeEgresosGroup` string comparison bug in budgetStore
- `d_asset` → `danger` invalid Ionic color in ProvidersSummary
- `danget` → `danger` typo in ProvidersSummary
- Reassign variable bug in EntryEditPage (`applyPopoverReassign` name collision)
- `updateAccount({ a })` → `updateAccount({ account })` broken named param in AccountCards
- `filteProducts` → `filterProducts` typo breaking filter popover in ProductsModalComponent
- `PoductsModal` → `ProductsModalComponent` filename typo
- `Provedores` → `Proveedores` typo in EntryEditPage
- Missing `IonRow` import in ProviderEditPage
- Missing `ProviderData` import in ProvidersComponent
- Empty products array edge case in `calcProviderProductsTotal`
- ProviderCardComponent typing and dead code issues

## [v0.63.0] - 2026-05-20

### Added
- SSO authentication integration via `@tu-org/sso-client` package (PKCE + DPoP)
- Auth callback page to handle SSO redirects
- SSO-aware router guard and auth state sync with Pinia store

### Changed
- Replaced local auth (Breeze) with SSO OAuth2 Authorization Code + PKCE flow
- Login and Register views now redirect to SSO portal
- Router history mode from hash-based (`createWebHashHistory`) to HTML5 (`createWebHistory`)
- `ResolveSsoUser` middleware uses `SsoServerClient` DI and `firstOrCreate` to avoid race conditions

### Removed
- Breeze auth routes, controllers, and request classes (`routes/auth.php`, `app/Http/Controllers/Auth/*`)
- Legacy auth tests (`AuthenticationTest`, `RegistrationTest`, `EmailVerificationTest`, `PasswordResetTest`)

### Fixed
- Race condition in `ResolveSsoUser` user provisioning (now uses `firstOrCreate`)
- SSO user resolution by injecting `SsoServerClient` instead of making HTTP calls to SSO server

## [v0.72.0] - 2026-06-22

### Added
- Income statement (Estado de Resultados) with responsive grid layout
- Financial glossary popovers for all statement terms (Ingresos, Costo de Vida, Utilidad Bruta, etc.)
- Skeleton loading placeholders with CSS pulse animation for performance views
- Actionable empty states with icon and "Agregar" button

### Changed
- Refactored performance page to Ionic-First layout (ion-grid/row/col, shadow1 cards, Ionic color props)
- Extracted reusable composables: useBudgetEntries, useDatePopover, usePeriodConfig
- Removed 6 orphaned components and cleaned up StatisticsController (4 dead methods removed)

### Fixed
- FinancialInfoPopover dark mode compatibility (use --ion-color-medium/light instead of step vars)
- Popover CSS variables for dark/light mode in PerformanceComponent
- BudgetDetailModal CSS replaced with Ionic color props
- Mobile and tablet responsivity across all performance views
- Add account budget flow

### Accessibility
- Added aria-labels to icon buttons and color indicators in performance views
- Added keyboard support for FinancialInfoPopover trigger

## [v0.71.0] - 2026-06-18

### Added
- Auto-create missing accounts with proper error handling in random data generator
- Responsive cash flow page layout (grid adapts to screen size)
- Random data generator for budget page testing

### Fixed
- Cash flow components no longer mutate parent popover state (Vue anti-pattern)
- Remove duplicate prop keys in Day/Month/Week/Year components
- Empty catch blocks in Month/Year chart components now include intentional comment
- Remove unused variable in DayPerformanceChart
- Fix TypeScript errors across 18 files (App.vue router, Vuelidate optional chaining, type casts)

## [v0.70.1] - 2026-06-17

### Fixed
- Sync store reactive refs when reading theme config from DB
- Fix CSS `@import` syntax by removing invalid `url()` wrapper and placing imports before other rules per spec


## [v0.70.0] - 2026-06-16

### Added
- Chunked fullSync with streaming (Response::stream) + test fallback
- Async merge via SyncMergeJob + polling endpoint
- Server-side change deduplication via dedup_hash
- Sync protocol versioning (X-Sync-Protocol-Version header)
- Structured JSON logging for sync operations
- MetricsController to expose /metrics endpoint
- SyncMetrics class for collecting metrics
- SyncMetadata cleanup command
- Enhanced health check endpoint for sync system
- Sync health monitor command with schedule
- Frontend performance monitoring utility
- Instrument frontend sync services with performance monitoring
- usePerformanceMonitoring composable with test utilities
- k6 benchmark script for sync load testing
- Chaos testing for sync functionality (Phase 6.3)
- Consolidated getChanges into single UNION ALL query with cursor-based pagination
- Phase 2.4: compress merge response to sync_id + id mappings only

### Fixed
- Resolve all frontend lint errors (oxlint) and backend sync controller bugs
- Guard localStorage quota in dataClearService with truncation fallback
- Remove dead saveQueue, add max debounce delay to prevent indefinite sync delay
- Replace any casts with proper types in SyncQueueService and accountsController
- Use model fillable in SupplierProcessor, soft-delete removed products
- Cache filtered fillable fields (excluding system cols), remove duplicate filterToModelFillable
- Atomic DLQ retry, remove direct service/DB imports from views
- Add mutex to ConflictStore.ensureLoaded to prevent concurrent load races
- Use put instead of add in addOrUpdateQueueItem to prevent race condition
- Add missing recurring_record_product and supplier_product to bulkUpsert
- Apply backoff only to failed chunk IDs, not entire queue
- Wire AbortController signal to fetch calls so cancelActiveRequests works
- Release Web Lock properly by resolving the held promise
- Overhaul phase 3-4: DLQ, last_sync, conflict resolution, pendingAttachments, Web Lock, syncInProgress, cleanup keys, SyncView conflicts UI
- Remove orphaned Income model (table was renamed to budget_entries)
- Overhaul phase 1-2: merge lock, groups sync_id, N+1 queries, throttle, cursor HMAC, cleanup command

### Performance
- Batch conflict resolution (backend + frontend)
- Concurrent chunk processing, persist ConflictStore in IndexedDB
- Retry before fullSync, bulkUpsert refactor, upload timeout, auto-sync backoff, nextRetryAt index
- Batch supplier store mutations in applyServerChanges
- Map lookups in applyServerChanges instead of Array.find
- Bulk IndexedDB operations for queue removal and entity deletion
- Remove duplicate validation from SyncController (processors already validate)
- Diff-based upsert for RecurringRecordProduct, remove whereHas subquery
- Diff-based upsert for BudgetProviderProduct instead of delete-and-recreate
- Bulk UPDATE using CASE WHEN in AbstractEntityProcessor
- Consolidate detectConflicts and existingMap into single DB query
- Cache fillable fields in AbstractEntityProcessor
- Add batch size limit (500) to create/update to prevent oversized SQL

### Refactored
- Extract ResolvesSupplierProductId trait to DRY product processors
- BudgetEntryProcessor uses postprocessCreate instead of duplicating parent logic
- Move recurring_record_product type-check to processor override, remove from abstract

### Documentation
- Phase 6.1 complete, move to Phase 6.2
- Phase 3 complete - conflict detection v2 fully implemented
- Phase 2 complete, move to Phase 3
- Mark Phase 2.1 complete, move to Phase 2.2
- Mark Phase 1.1 complete, move to Phase 2
- Update sync-optimization-plan with actual implementation status

### Testing
- Phase 6.1 - unit tests for three-way merge, auto-merge, field-level detection


## [v0.69.0] - 2026-06-09

