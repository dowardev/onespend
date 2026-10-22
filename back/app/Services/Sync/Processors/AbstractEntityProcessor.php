<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Services\Sync\Processors;

use App\Repositories\SyncMetadataRepository;
use App\Services\Sync\ConflictDetector;
use App\Services\Sync\Contracts\SyncProcessorInterface;
use App\Services\Sync\ForeignKeyResolver;
use App\Services\SyncIdResolver;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

abstract class AbstractEntityProcessor implements SyncProcessorInterface
{
    protected const BATCH_SIZE = 500;

    protected SyncIdResolver $idResolver;

    private ConflictDetector $conflictDetector;

    protected ForeignKeyResolver $foreignKeyResolver;

    protected SyncMetadataRepository $syncMetadataRepo;

    private ?array $cachedFillable = null;

    public function __construct()
    {
        $this->idResolver = app(SyncIdResolver::class);
        $this->conflictDetector = app(ConflictDetector::class);
        $this->foreignKeyResolver = app(ForeignKeyResolver::class);
        $this->syncMetadataRepo = app(SyncMetadataRepository::class);
    }

    protected function resolveForeignKeys(array $item, int $userId): array
    {
        return $this->foreignKeyResolver->resolveItem($item, $this->getEntityName(), $userId);
    }

    abstract protected function getModel(): string;

    abstract protected function getEntityName(): string;

    protected function getCreateValidationRules(): array
    {
        return [];
    }

    protected function getUpdateValidationRules(): array
    {
        return [];
    }

    protected function getFillableFields(): array
    {
        $modelClass = $this->getModel();
        $model = new $modelClass;
        $fillable = $model->getFillable();

        return array_diff($fillable, ['id', 'created_at', 'updated_at', 'deleted_at', 'user_id', 'sync_id', 'version']);
    }

    public function preprocessData(array $item, int $userId): array
    {
        return $item;
    }

    protected function postprocessCreate(array $created, int $userId): void {}

    protected function postprocessUpdate(array $updated, int $userId): void {}

    /**
     * LBDS-280: hook fired after a delete batch commits. Receives the list
     * of sync_ids that were actually tombstoned by the parent impl so
     * processors like AttachmentProcessor can perform side-effects (e.g.
     * remove the file from storage).
     *
     * @param  array<int, array{sync_id: string}>  $deleted
     */
    protected function postprocessDelete(array $deleted, int $userId): void {}

    public function canProcess(string $entityType): bool
    {
        return $entityType === $this->getEntityName();
    }

    public function getEntityType(): string
    {
        return $this->getEntityName();
    }

    public function getModelClass(): string
    {
        return $this->getModel();
    }

    public function create(array $items, int $userId): array
    {
        if (empty($items)) {
            return [];
        }

        $result = [];
        $chunks = array_chunk($items, static::BATCH_SIZE);

        foreach ($chunks as $chunk) {
            $chunkResult = $this->createBatch($chunk, $userId);
            $result = array_merge($result, $chunkResult);
        }

        return $result;
    }

    private function createBatch(array $items, int $userId): array
    {
        $now = now();
        $insertData = [];
        $resolvedItems = [];

        foreach ($items as $item) {
            $syncId = $item['id'] ?? null;
            if (! $syncId) {
                continue;
            }

            $validation = $this->validate($item);
            if (! $validation['valid']) {
                Log::warning("Invalid item in batch create for {$this->getEntityName()}", [
                    'sync_id' => $syncId,
                    'errors' => $validation['errors'],
                ]);

                continue;
            }

            $preprocessed = $this->preprocessData($item, $userId);
            $data = $this->filterToFillableFromCache($preprocessed, $this->getCachedFillable());
            $data['sync_id'] = $syncId;
            $data['user_id'] = $userId;
            $data['created_at'] = $now;
            $data['updated_at'] = $now;
            $data['version'] = 1;

            $insertData[] = $data;
            $resolvedItems[] = $item;
        }

        if (empty($insertData)) {
            return [];
        }

        $modelClass = $this->getModel();

        try {
            DB::beginTransaction();

            $modelClass::insert($insertData);

            $syncIds = array_column($insertData, 'sync_id');
            $created = $modelClass::whereIn('sync_id', $syncIds)
                ->where('user_id', $userId)
                ->get(['id', 'sync_id']);

            $result = [];
            $fieldHashes = [];
            $baseDataMap = [];
            foreach ($created as $record) {
                $result[] = ['sync_id' => $record->sync_id, 'id' => $record->id];
            }
            foreach ($insertData as $data) {
                $sid = $data['sync_id'];
                $fillableOnly = $this->filterToFillableFromCache($data, $this->getCachedFillable());
                $fieldHashes[$sid] = $this->computeFieldHash($fillableOnly);
                $baseDataMap[$sid] = $fillableOnly;
            }

            $this->bulkUpdateSyncMetadata($syncIds, 'synced', $userId, [], $fieldHashes, $baseDataMap);
            $this->postprocessCreate($result, $userId);

            DB::commit();

            return $result;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Batch create failed for {$this->getEntityName()}", [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function update(array $items, int $userId, array|Collection $existingMap = []): array
    {
        if (empty($items)) {
            return [];
        }

        $result = [];
        $chunks = array_chunk($items, static::BATCH_SIZE);

        foreach ($chunks as $chunk) {
            $chunkResult = $this->updateBatch($chunk, $userId, $existingMap);
            $result = array_merge($result, $chunkResult);
        }

        return $result;
    }

    private function updateBatch(array $items, int $userId, array|Collection $existingMap = []): array
    {
        $modelClass = $this->getModel();
        $updated = [];
        $syncIds = [];

        $bulkData = [];

        try {
            DB::beginTransaction();

            foreach ($items as $item) {
                $syncId = $item['id'] ?? ($item['sync_id'] ?? null);
                if (! $syncId) {
                    continue;
                }

                $validation = $this->validate($item, true);
                if (! $validation['valid']) {
                    Log::warning("Invalid item in batch update for {$this->getEntityName()}", [
                        'sync_id' => $syncId,
                        'errors' => $validation['errors'],
                    ]);

                    continue;
                }

                $preprocessed = $this->preprocessData($item, $userId);
                $data = $this->filterToFillableFromCache($preprocessed, $this->getCachedFillable());

                unset($data['id'], $data['sync_id'], $data['user_id'], $data['created_at'],
                    $data['products'], $data['_deleted'], $data['groups'], $data['version']);

                if (isset($data['updated_at']) && is_numeric($data['updated_at'])) {
                    $data['updated_at'] = date('Y-m-d H:i:s', self::normalizeTimestamp($data['updated_at']));
                } else {
                    $data['updated_at'] = now();
                }

                $bulkData[$syncId] = $data;
                $updated[] = ['sync_id' => $syncId, '_original' => $item];
            }

            if (! empty($bulkData)) {
                $syncIds = array_keys($bulkData);
                $this->bulkUpdateByCase($modelClass, $bulkData, $userId);

                $fieldHashes = [];
                $baseDataMap = [];
                foreach ($syncIds as $sid) {
                    if (isset($bulkData[$sid])) {
                        $fillableData = $this->filterToFillableFromCache($bulkData[$sid], $this->getCachedFillable());
                        $fieldHashes[$sid] = $this->computeFieldHash($fillableData);
                        $baseDataMap[$sid] = $fillableData;
                    }
                }
                $this->bulkUpdateSyncMetadata($syncIds, 'synced', $userId, [], $fieldHashes, $baseDataMap);
            }

            $this->postprocessUpdate($updated, $userId);

            DB::commit();

            return $updated;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Batch update failed for {$this->getEntityName()}", [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function bulkUpdateByCase(
        string $modelClass,
        array $bulkData,
        int $userId,
    ): void {
        if (empty($bulkData)) {
            return;
        }

        $allSyncIds = array_keys($bulkData);
        $table = (new $modelClass)->getTable();

        // GitLab #16 (P2): the column set used to be taken from the FIRST
        // item of the batch only, so a column that a later item carried
        // (e.g. `notes`) was silently dropped from the UPDATE whenever the
        // first item did not have it. The set is now the union of the keys
        // of every item in the batch, and an item that does not carry a
        // column is written as NULL (the payload is a full snapshot, so an
        // absent column means "no value" — that is also how a field gets
        // cleared).
        $columns = [];
        foreach ($bulkData as $itemData) {
            foreach (array_keys($itemData) as $col) {
                $columns[$col] = true;
            }
        }
        $columns = array_keys($columns);

        $setParts = [];
        $bindings = [];

        foreach ($columns as $col) {
            $whenClauses = [];
            foreach ($allSyncIds as $syncId) {
                $whenClauses[] = 'WHEN ? THEN ?';
                $bindings[] = $syncId;
                $bindings[] = $bulkData[$syncId][$col] ?? null;
            }
            $setParts[] = "`{$col}` = CASE `sync_id` ".implode(' ', $whenClauses)." ELSE `{$col}` END";
        }

        $setParts[] = '`version` = `version` + 1';

        $placeholders = implode(', ', array_fill(0, count($allSyncIds), '?'));
        foreach ($allSyncIds as $syncId) {
            $bindings[] = $syncId;
        }
        $bindings[] = $userId;

        $sql = "UPDATE `{$table}` SET ".implode(', ', $setParts)
             ." WHERE sync_id IN ({$placeholders}) AND user_id = ?";

        DB::update($sql, $bindings);
    }

    public function delete(array $syncIds, int $userId): array
    {
        if (empty($syncIds)) {
            return [];
        }

        $modelClass = $this->getModel();

        try {
            DB::beginTransaction();

            $existing = $modelClass::whereIn('sync_id', $syncIds)
                ->where('user_id', $userId)
                ->pluck('sync_id')
                ->toArray();

            if (! empty($existing)) {
                $deleteData = ['deleted_at' => now()];
                $modelInstance = new $modelClass;
                if (in_array('status', $modelInstance->getFillable())) {
                    $deleteData['status'] = 'deleted';
                }
                $modelClass::whereIn('sync_id', $existing)
                    ->where('user_id', $userId)
                    ->update($deleteData);

                $this->bulkUpdateSyncMetadata($existing, 'deleted', $userId);

                $deletedRows = array_map(fn ($syncId) => ['sync_id' => $syncId], $existing);
                $this->postprocessDelete($deletedRows, $userId);
            }

            DB::commit();

            return $existing;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Batch delete failed for {$this->getEntityName()}", [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function validate(array $item, bool $isUpdate = false): array
    {
        $rules = $isUpdate ? $this->getUpdateValidationRules() : $this->getCreateValidationRules();

        if (empty($rules)) {
            return ['valid' => true, 'errors' => []];
        }

        $validator = validator($item, $rules);

        if ($validator->fails()) {
            return [
                'valid' => false,
                'errors' => $validator->errors()->toArray(),
            ];
        }

        return ['valid' => true, 'errors' => []];
    }

    public function computeFieldHash(array $data): string
    {
        return $this->conflictDetector->computeFieldHash($this, $data);
    }

    public function detectConflicts(array $items, int $userId): array
    {
        return $this->conflictDetector->detectConflicts($this, $items, $userId);
    }

    protected function bulkUpdateSyncMetadata(array $syncIds, string $status, int $userId, array $conflictDataMap = [], array $fieldHashes = [], array $baseDataMap = []): void
    {
        if ($status === 'deleted') {
            $this->syncMetadataRepo->markSynced($this->getEntityName(), $syncIds, $userId, [], [], 'deleted');

            return;
        }

        $this->syncMetadataRepo->markSynced($this->getEntityName(), $syncIds, $userId, $fieldHashes, $baseDataMap, $status);
    }

    public function getCachedFillable(): array
    {
        if ($this->cachedFillable === null) {
            $this->cachedFillable = $this->getFillableFields();
        }

        return $this->cachedFillable;
    }

    public function filterToFillableFromCache(array $data, array $fillable): array
    {
        if (empty($fillable)) {
            return $data;
        }

        $filtered = [];
        foreach ($fillable as $field) {
            if (array_key_exists($field, $data)) {
                $filtered[$field] = $data[$field];
            }
        }

        return $filtered;
    }

    public static function normalizeTimestamp(mixed $timestamp): int
    {
        if (! is_numeric($timestamp)) {
            return 0;
        }
        $ts = (int) $timestamp;
        if ($ts > 10000000000) {
            $ts = (int) ($ts / 1000);
        }

        return $ts;
    }
}
