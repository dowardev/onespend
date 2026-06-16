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