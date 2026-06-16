<?php

namespace App\Services\Sync\Processors;

use App\Services\Sync\Contracts\SyncProcessorInterface;
use App\Services\SyncIdResolver;
use App\Models\SyncMetadata;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Collection;

abstract class AbstractEntityProcessor implements SyncProcessorInterface
{
    protected const BATCH_SIZE = 500;

    protected SyncIdResolver $idResolver;

    private ?array $cachedFillable = null;

    public function __construct()
    {
        $this->idResolver = app(SyncIdResolver::class);
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
        $model = new $modelClass();
        $fillable = $model->getFillable();
        return array_diff($fillable, ['id', 'created_at', 'updated_at', 'deleted_at', 'user_id', 'sync_id', 'version']);
    }

    protected function preprocessData(array $item, int $userId): array
    {
        return $item;
    }

    protected function postprocessCreate(array $created, int $userId): void {}

    protected function postprocessUpdate(array $updated, int $userId): void {}

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
            if (!$syncId) {
                continue;
            }

            $validation = $this->validate($item);
            if (!$validation['valid']) {
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
        $errors = [];

        $bulkData = [];
        $lockConditions = [];

        try {
            DB::beginTransaction();

            foreach ($items as $item) {
                $syncId = $item['id'] ?? ($item['sync_id'] ?? null);
                if (!$syncId) {
                    continue;
                }

                $validation = $this->validate($item, true);
                if (!$validation['valid']) {
                    Log::warning("Invalid item in batch update for {$this->getEntityName()}", [
                        'sync_id' => $syncId,
                        'errors' => $validation['errors'],
                    ]);
                    continue;
                }

                $preprocessed = $this->preprocessData($item, $userId);
                $data = $this->filterToFillableFromCache($preprocessed, $this->getCachedFillable());

                unset($data['id'], $data['sync_id'], $data['user_id'], $data['created_at'],
                      $data['products'], $data['_deleted'], $data['groups']);

                if (isset($data['updated_at']) && is_numeric($data['updated_at'])) {
                    $data['updated_at'] = date('Y-m-d H:i:s', self::normalizeTimestamp($data['updated_at']));
                } else {
                    $data['updated_at'] = now();
                }

                $existingVersion = null;
                $existingRow = $existingMap[$syncId] ?? null;
                if ($existingRow) {
                    $existingVersion = $existingRow->version ?? null;
                }

                $bulkData[$syncId] = $data;
                $lockConditions[$syncId] = $existingVersion;
                $updated[] = ['sync_id' => $syncId, '_original' => $item];
            }

            if (!empty($bulkData)) {
                $this->bulkUpdateByCaseWithVersion($modelClass, $bulkData, $lockConditions, $userId);

                $lockedSyncIds = array_keys(array_filter($lockConditions, fn($v) => $v !== null));
                if (!empty($lockedSyncIds)) {
                    $stillOld = $modelClass::whereIn('sync_id', $lockedSyncIds)
                        ->where('user_id', $userId)
                        ->where(function ($q) use ($lockConditions) {
                            foreach ($lockConditions as $syncId => $version) {
                                if ($version === null) continue;
                                $q->orWhere(function ($sub) use ($syncId, $version) {
                                    $sub->where('sync_id', $syncId)->where('version', $version);
                                });
                            }
                        })
                        ->pluck('sync_id')
                        ->toArray();

                    foreach ($stillOld as $conflictSyncId) {
                        $errors[] = ['sync_id' => $conflictSyncId, 'error' => 'Optimistic lock conflict'];
                    }
                }

                $failedSyncIds = array_column($errors, 'sync_id');
                $bulkSyncIds = array_keys($bulkData);
                $bulkSyncIds = array_diff($bulkSyncIds, $failedSyncIds);
                $syncIds = array_merge($syncIds, $bulkSyncIds);

                $updated = array_values(
                    array_filter($updated, fn($u) => !in_array($u['sync_id'], $failedSyncIds))
                );
            }

            if (!empty($syncIds)) {
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

            if (!empty($errors)) {
                Log::warning("Optimistic lock conflicts in batch update for {$this->getEntityName()}", [
                    'conflicts' => $errors,
                ]);
            }

            return $updated;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Batch update failed for {$this->getEntityName()}", [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function bulkUpdateByCaseWithVersion(
        string $modelClass,
        array $bulkData,
        array $lockConditions,
        int $userId,
    ): void {
        if (empty($bulkData)) {
            return;
        }

        $allSyncIds = array_keys($bulkData);
        $table = (new $modelClass)->getTable();
        $first = reset($bulkData);
        $columns = array_keys($first);

        $setParts = [];
        $bindings = [];

        foreach ($columns as $col) {
            $whenClauses = [];
            foreach ($allSyncIds as $syncId) {
                $whenClauses[] = 'WHEN ? THEN ?';
                $bindings[] = $syncId;
                $bindings[] = $bulkData[$syncId][$col] ?? null;
            }
            $setParts[] = "`{$col}` = CASE `sync_id` " . implode(' ', $whenClauses) . " ELSE `{$col}` END";
        }

        $setParts[] = "`version` = `version` + 1";

        $bindings[] = $userId;

        $whereParts = [];
        foreach ($allSyncIds as $syncId) {
            if (isset($lockConditions[$syncId]) && $lockConditions[$syncId] !== null) {
                $whereParts[] = '(sync_id = ? AND version = ?)';
                $bindings[] = $syncId;
                $bindings[] = $lockConditions[$syncId];
            } else {
                $whereParts[] = 'sync_id = ?';
                $bindings[] = $syncId;
            }
        }

        $sql = "UPDATE `{$table}` SET " . implode(', ', $setParts)
             . " WHERE user_id = ? AND (" . implode(' OR ', $whereParts) . ")";

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

            if (!empty($existing)) {
                $deleteData = ['deleted_at' => now()];
                $modelInstance = new $modelClass();
                if (in_array('status', $modelInstance->getFillable())) {
                    $deleteData['status'] = 'deleted';
                }
                $modelClass::whereIn('sync_id', $existing)
                    ->where('user_id', $userId)
                    ->update($deleteData);

                $this->bulkUpdateSyncMetadata($existing, 'deleted', $userId);
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
        $fillable = $this->getCachedFillable();
        $relevantData = array_intersect_key($data, array_flip($fillable));
        array_walk($relevantData, function (&$v) {
            if (is_numeric($v)) {
                $v = (string) ((float) $v);
            } else {
                $v = (string) $v;
            }
        });
        ksort($relevantData);
        return md5(json_encode($relevantData));
    }

    public function detectConflicts(array $items, int $userId): array
    {
        $conflicts = [];
        $modelClass = $this->getModel();

        $syncIds = array_map(fn($item) => $item['id'] ?? null, $items);
        $syncIds = array_filter(array_unique($syncIds));

        if (empty($syncIds)) {
            return ['conflicts' => [], 'existingMap' => collect()];
        }

        $existing = $modelClass::whereIn('sync_id', $syncIds)
            ->where('user_id', $userId)
            ->get()
            ->keyBy('sync_id');

        $baseDataRecords = SyncMetadata::forUser($userId)
            ->byEntityType($this->getEntityName())
            ->whereIn('entity_id', $syncIds)
            ->get()
            ->keyBy('entity_id');

        foreach ($items as $item) {
            $syncId = $item['id'] ?? null;
            if (!$syncId) {
                continue;
            }

            $serverItem = $existing->get($syncId);
            if (!$serverItem) {
                continue;
            }

            $clientProcessed = $this->preprocessData($item, $userId);
            $clientFiltered = $this->filterToFillableFromCache($clientProcessed, $this->getCachedFillable());
            $clientHash = $this->computeFieldHash($clientFiltered);

            $serverData = $serverItem->toArray();
            $serverFiltered = $this->filterToFillableFromCache($serverData, $this->getCachedFillable());
            $serverHash = $this->computeFieldHash($serverFiltered);

            if ($clientHash === $serverHash) {
                continue;
            }

            $clientTimestamp = self::normalizeTimestamp($item['updated_at'] ?? 0);
            $serverTimestamp = $serverItem->updated_at->timestamp;

            if ($clientTimestamp < $serverTimestamp) {
                $syncMeta = $baseDataRecords->get($syncId);
                $baseData = $syncMeta?->base_data ?? [];

                $clientChangedFields = [];
                $serverChangedFields = [];

                foreach (array_keys($clientFiltered + $serverFiltered) as $field) {
                    $clientVal = $clientFiltered[$field] ?? null;
                    $baseVal = $baseData[$field] ?? null;
                    $serverVal = $serverFiltered[$field] ?? null;

                    $clientDifferent = $this->valuesDiffer($clientVal, $baseVal);
                    $serverDifferent = $this->valuesDiffer($serverVal, $baseVal);

                    if ($clientDifferent) {
                        $clientChangedFields[] = $field;
                    }
                    if ($serverDifferent) {
                        $serverChangedFields[] = $field;
                    }
                }

                $overlapping = array_intersect($clientChangedFields, $serverChangedFields);

                if (!empty($overlapping)) {
                    $conflicts[] = [
                        'sync_id' => $syncId,
                        'server_data' => $serverData,
                        'client_data' => $item,
                        'server_hash' => $serverHash,
                        'client_hash' => $clientHash,
                        'conflict_type' => 'semantic',
                        'overlapping_fields' => array_values($overlapping),
                    ];
                } else {
                    $mergedData = $serverData;
                    foreach ($clientChangedFields as $field) {
                        if (isset($clientProcessed[$field])) {
                            $mergedData[$field] = $clientProcessed[$field];
                        }
                    }
                    unset($mergedData['id'], $mergedData['sync_id'], $mergedData['user_id'],
                          $mergedData['created_at'], $mergedData['updated_at'], $mergedData['version']);
                    $mergedData['updated_at'] = now();
                    $modelClass::where('sync_id', $syncId)
                        ->where('user_id', $userId)
                        ->update($mergedData);

                    $modelClass::where('sync_id', $syncId)
                        ->where('user_id', $userId)
                        ->increment('version');

                    $newBaseData = array_merge($serverFiltered, $clientFiltered);
                    $newHash = $this->computeFieldHash($newBaseData);
                    $this->bulkUpdateSyncMetadata(
                        [$syncId],
                        'synced',
                        $userId,
                        [],
                        [$syncId => $newHash],
                        [$syncId => $newBaseData]
                    );
                }
            }
        }

        return ['conflicts' => $conflicts, 'existingMap' => $existing];
    }

    private function valuesDiffer(mixed $a, mixed $b): bool
    {
        if (is_numeric($a) && is_numeric($b)) {
            return (float) $a !== (float) $b;
        }
        return $a !== $b;
    }

    protected function bulkUpdateSyncMetadata(array $syncIds, string $status, int $userId, array $conflictDataMap = [], array $fieldHashes = [], array $baseDataMap = []): void
    {
        if (empty($syncIds)) {
            return;
        }

        $now = now();
        $upsertData = [];

        foreach ($syncIds as $syncId) {
            $upsertData[] = [
                'entity_type' => $this->getEntityName(),
                'entity_id' => $syncId,
                'user_id' => $userId,
                'sync_status' => $status,
                'last_synced_at' => $now,
                'server_updated_at' => $now,
                'conflict_data' => $conflictDataMap[$syncId] ?? null,
                'field_hash' => $fieldHashes[$syncId] ?? null,
                'base_data' => isset($baseDataMap[$syncId]) ? json_encode($baseDataMap[$syncId]) : null,
            ];
        }

        SyncMetadata::upsert(
            $upsertData,
            ['entity_type', 'entity_id', 'user_id'],
            ['sync_status', 'last_synced_at', 'server_updated_at', 'conflict_data', 'field_hash', 'base_data']
        );
    }

    protected function getCachedFillable(): array
    {
        if ($this->cachedFillable === null) {
            $this->cachedFillable = $this->getFillableFields();
        }

        return $this->cachedFillable;
    }

    protected function filterToFillableFromCache(array $data, array $fillable): array
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
        if (!is_numeric($timestamp)) {
            return 0;
        }
        $ts = (int) $timestamp;
        if ($ts > 10000000000) {
            $ts = (int) ($ts / 1000);
        }
        return $ts;
    }
}
