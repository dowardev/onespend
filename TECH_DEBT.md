<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

# Sync System — Technical Debt Registry

## Closed Items (resolved this pass)

| Item | Resolution |
|------|-----------|
| #1 UpdatedAt fallback muta server changes | Mappers usan `\| undefined` en vez de `\| Date.now()`. No clobber. |
| #2 getChanges boundary race | `>` cambiado a `>=` en las 2 cláusulas WHERE principales. Elimina la race de 1 segundo. |
| #3 Version bump local / version_mismatch | Server es autoridad única de version. Eliminado `version_mismatch` del backend. Frontend no re-queue con version. |
| #4 create→delete queue dropea el delete | Force-delete siempre: el item en cola permanece como delete; server hace noop si no existe el row. |
| #5 getResolvedConflicts stale | **Closed — by design.** `conflict_data` es snapshot forense del momento del conflicto. |
| #6 batch single transaction | Eliminada transacción externa. Atomic per-item con try/catch separado. Fallos no bloquean items restantes. |
| #7 No FOR UPDATE / CAS | Implementado CAS atómico con `WHERE sync_status='conflict'` en `update()`. Sin transacción, sin race. |
| #8 Store optimistic clobber | Removidos `addEntry`/`updateEntry`/`removeEntry`/`loadEntries`/`removeEgresosGroup`/`clearEntries` — dead code, 0 callers. |

## Fixed Items (this pass — PASO 1-13)

| Issue | Fix |
|---|---|
| Frontend: resolveConflict doesn't write Dexie/dequeue | `syncController.ts:241-283` writes entity via `applyServerItem`, dequeues via `syncQueueDb.delete`, removes from conflict store |
| Backend: resolveConflict returns no entity data | `SyncController.php:898-959` now loads entity + relations, returns `{success, entity, message}` |
| Backend: keep-client doesn't bump version | `SyncController.php:updateEntity` now increments `version + 1`, refreshes SyncMetadata |
| Backend: detectConflicts uses resolved metadata as base | `AbstractEntityProcessor.php:479-483` filters `sync_status != 'resolved'` |
| Frontend: getConflicts calls pullChanges silently | `SyncQueueService.ts:1076-1100` now reads from `syncApiService.getActiveConflicts()` |
| Frontend: unconditional overwrite in useSync.applyServerChanges for non-budget_entry types | `useSync.ts:240-462` applies `shouldSkipServerChange` helper to all 8 entity types |
| Backend: metadata write doesn't preserve existing conflict_data + doesn't update server_updated_at | `SyncController.php:946-952` uses `array_merge` and sets `last_synced_at`/`server_updated_at` |
| Frontend: keep-client shows 422 (UUID validation) | `resolveEntityFkFields` resuelve FKs antes de `validateEntityData`. Frontend muestra detalle del error 422. |
| Backend: recurring FormRequests no mapeados | Añadidos `recurring_record` y `recurring_record_product` a `ENTITY_REQUEST_TYPES`. |
| Backend: version_mismatch optimistic-lock | `AbstractEntityProcessor` eliminado `bulkUpdateByCaseWithVersion` → `bulkUpdateByCase`. Siempre `version = version + 1` sin WHERE version clause. |
| Frontend: version_mismatch auto-resolve re-queue | Eliminado bloque de auto-resolve en `SyncQueueService.ts:634-664`. |
| Frontend: mapper updatedAt fallback | `mappers.ts:97,122,135` `\| Date.now()` → `\| undefined`. |
| Frontend: create→delete drop | Eliminado branch especial en `addOrUpdateQueueItem`. Force-delete always. |
| Backend: batch race + lock | CAS atómico `WHERE sync_status='conflict'` en `resolveConflict`/`resolveConflictsBatch`. Eliminada transacción externa. |
| Backend: getChanges > race | Cambiado `>` a `>=` en las cláusulas WHERE principales de `fetchChangedSyncIds` y `fetchChangedSyncIdsUnion`. |
| Frontend: store mutators dead code | Removidos `addEntry`/`updateEntry`/`removeEntry`/`loadEntries`/`removeEgresosGroup`/`clearEntries` de `budgetEntriesStore.ts` — 0 callers. |
