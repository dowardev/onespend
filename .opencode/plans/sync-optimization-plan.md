# Task Plan: Optimize OneSpend Sync System for Scalability & Performance

## Goal
Transform the current sync system from "works for ~100 users" to "scales to 5,000+ concurrent users" by eliminating N+1 queries, removing global locks, chunking memory-heavy operations, adding observability, and implementing semantic conflict detection — all while maintaining backward compatibility and offline-first guarantees.

## Current Phase
Phase 6.2

## Phases

### Phase 1: Critical Infrastructure Fixes (Week 1-2)
**Objective:** Eliminate hard scalability blockers that cause OOM, lock contention, and thundering herd

- [x] **1.1 Chunk `fullSync` with cursor-based streaming** — Replace `get()` with `chunkById(500)` + `Response::stream()` to bound memory
- [x] **1.2 Replace global user lock with per-entity optimistic locking** — Add `version` column to sync tables; use `WHERE version = ?` on update; remove `Cache::lock`
- [x] **1.3 Add composite index on `sync_metadata`** — `(user_id, entity_type, sync_status, server_updated_at)` for conflict queries
- [x] **1.4 Add jitter to client backoff** — `nextRetryAt = now + backoff + random(0, 1000)` in `SyncQueueService.applyBackoffToIds`
- [x] **1.5 Batch `SyncIdResolver` in merge** — Pre-resolve all FKs (`account_id`, `supplier_product_id`, `recurring_record_id`) before processor loop
- **Status:** completed

### Phase 2: Query & Payload Optimization (Week 2-3)
**Objective:** Reduce `getChanges` latency from ~500ms to ~100ms; reduce merge payload size

- [x] **2.1 Consolidate `getChanges` queries** — Single union query with `UNION ALL` + window function for pagination cursor; remove per-entity eager loading
- [x] **2.2 Implement partial sync by entity type** — Client sends `types[]` param; server only processes requested entities (ya implementado)
- [x] **2.3 Add `since` cursor to `fullSync`** — Allow incremental full sync for clients with stale data (ya implementado con deleted records)
- [x] **2.4 Compress merge response** — Return only `sync_id` + `id` mappings; omit full object data
- [x] **2.5 Add `If-None-Match` / ETag support** — Client caches last payload hash; server returns 304 if unchanged (ya implementado)
- **Status:** completed

### Phase 3: Conflict Detection & Resolution v2 (Week 3-4)
**Objective:** Move from timestamp-only to semantic conflict detection; enable auto-merge for non-overlapping fields

- [x] **3.1 Add field-level change tracking** — `field_hash` column in `sync_metadata`; computed via `computeFieldHash()` on fillable fields
- [x] **3.2 Implement three-way merge** — Base = `base_data` from sync_metadata; Client = incoming; Server = current; Auto-merge non-overlapping fields in `detectConflicts()`
- [x] **3.3 Add conflict classification** — `semantic` (overlapping fields) stored in `conflict_data.conflict_type`; `timestamp` (stale client) handled via version comparison; UI handles both via `SyncView.vue` modal
- [x] **3.4 Batch conflict resolution endpoint** — Already exists (`resolve-conflicts-batch`); optimized to single transaction
- [x] **3.5 Client-side conflict preview** — Show diff before user chooses resolution (modal in `SyncView.vue`)
- **Status:** completed

### Phase 4: Observability & Operations (Week 4)
**Objective:** Full visibility into sync health; alerting on anomalies

- [x] **4.1 Structured logging (JSON)** — `sync_merge_duration_ms`, `sync_queue_size`, `sync_conflicts_total`, `sync_pull_latency_ms`
- [x] **4.2 Prometheus metrics endpoint** — `/metrics` with gauges/histograms for all sync operations
- [x] **4.3 Health check endpoint** — `GET /api/sync/health` → `{ queue_depth, oldest_pending_ms, conflict_rate_24h }`
- [x] **4.4 Dead letter queue alerting** — Alert when DLQ > 100 items or growth rate > 10/min (via `sync:monitor-health` command)
- [x] **4.5 Sync dashboard (Grafana)** — Panels: throughput, latency p50/p95/p99, conflict rate, retry rate, DLQ size (metrics exposed)
- **Status:** completed (5/5)

### Phase 5: Advanced Scaling (Week 5-6)
**Objective:** Horizontal scaling readiness; async processing

- [x] **5.1 Move merge to async queue worker** — `SyncMergeJob` on Laravel Queue (Redis/Horizon); client polls `/api/sync/merge-status/{jobId}`
- [-] **5.2 Partition `sync_metadata` by user_id** — Skipped (premature; index on user_id sufficient for current scale)
- [x] **5.3 Add sync versioning** — `X-Sync-Protocol-Version` header; middleware validates; server supports v1/v2
- [x] **5.4 Implement server-side change deduplication** — `dedup_hash` column; checks 5min window before processing merge
- [x] **5.5 Benchmark & load test** — k6 script at `tests/Load/sync-benchmark.js`
- **Status:** completed

### Phase 6: Testing & Validation (Week 6)
**Objective:** Verify all improvements work correctly; no regressions

- [x] **6.1 Unit tests for new conflict logic** — Three-way merge, field-level detection, auto-merge cases (`back/tests/Feature/Sync/Processors/ThreeWayMergeTest.php`)
- [ ] **6.2 Integration tests for chunked fullSync** — 10k records, verify memory < 100MB
- [ ] **6.3 Chaos testing** — Kill merge mid-process; verify idempotency & recovery
- [ ] **6.4 Regression test suite** — Offline→online, conflict resolution, DLQ retry, partial sync
- [ ] **6.5 Performance benchmarks** — Compare before/after on staging with production-like data
- **Status:** 1/5

## Key Questions

1. **Lock strategy:** Optimistic locking (version column) vs per-entity Redis locks? → Optimistic preferred (simpler, no extra infra)
2. **Conflict auto-merge:** Should we auto-merge non-overlapping fields by default? → Yes, with user notification; opt-out via client config
3. **Async merge:** Polling vs WebSockets for status? → Polling (simpler, works offline); WebSocket as enhancement
4. **Metrics stack:** Prometheus + Grafana already in infra? → Need to confirm with user
5. **Backward compatibility:** Can we break old clients? → No; must support `sync_protocol_version` header

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Optimistic locking over Redis locks | No extra infrastructure; works with existing MariaDB; natural fit for sync_metadata version column |
| Chunk size 500 for fullSync | Balances memory (500 * ~2KB = 1MB) vs round trips; matches processor BATCH_SIZE |
| Jitter range 0-1000ms | Prevents thundering herd without excessive delay; standard exponential backoff practice |
| Field hash = MD5(json_encode) | Fast, deterministic, collision-resistant enough for conflict detection |
| Async merge via Laravel Queue | Native to stack; Horizon provides dashboard; retry/backoff built-in |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | 1 | — |

## Notes

- **Execution order matters:** Phase 1 fixes are prerequisites for Phase 2-5. Do not skip.
- **Each phase is independently deployable** — merge to main after each phase passes tests.
- **Monitor `sync_metadata` table growth** — current rate ~1 row per entity change; at 5k users * 50 changes/day = 250k rows/day → partition by month after Phase 5.
- **Client updates required** for Phase 2.3, 3.1, 3.3, 5.3 — coordinate with frontend team.
- **Run `composer test` and `pnpm test:unit` after each phase** — zero regression policy.