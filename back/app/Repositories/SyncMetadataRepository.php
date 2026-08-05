<?php

namespace App\Repositories;

use App\Models\SyncMetadata;
use Illuminate\Support\Collection;

class SyncMetadataRepository
{
    public function markSynced(
        string $entityType,
        array $syncIds,
        int $userId,
        array $fieldHashes = [],
        array $baseDataMap = [],
        string $status = 'synced',
    ): void {
        if (empty($syncIds)) {
            return;
        }

        $now = now();
        $upsertData = [];

        foreach ($syncIds as $syncId) {
            $fieldHash = $fieldHashes[$syncId] ?? null;
            $baseData = $baseDataMap[$syncId] ?? null;

            $upsertData[] = [
                'entity_type' => $entityType,
                'entity_id' => $syncId,
                'user_id' => $userId,
                'sync_status' => $status,
                'last_synced_at' => $now,
                'server_updated_at' => $now,
                'field_hash' => $fieldHash,
                'base_data' => $baseData ? json_encode($baseData) : null,
            ];
        }

        SyncMetadata::upsert(
            $upsertData,
            ['entity_type', 'entity_id', 'user_id'],
            ['sync_status', 'last_synced_at', 'server_updated_at', 'field_hash', 'base_data']
        );
    }

    public function markConflict(
        string $entityType,
        string $syncId,
        int $userId,
        array $conflictData
    ): void {
        $meta = new SyncMetadata;
        $meta->conflict_data = $conflictData;
        $serialized = $meta->getAttributes()['conflict_data'];

        SyncMetadata::upsert(
            [
                'entity_type' => $entityType,
                'entity_id' => $syncId,
                'user_id' => $userId,
                'sync_status' => 'conflict',
                'last_synced_at' => now(),
                'server_updated_at' => now(),
                'conflict_data' => $serialized,
            ],
            ['entity_type', 'entity_id', 'user_id'],
            ['sync_status', 'last_synced_at', 'server_updated_at', 'conflict_data']
        );
    }

    public function markResolved(array $syncIds, int $userId, ?string $resolutionPayload = null): int
    {
        if (empty($syncIds)) {
            return 0;
        }
        $updateData = [
            'sync_status' => 'resolved',
            'updated_at' => now(),
        ];
        if ($resolutionPayload !== null) {
            $updateData['conflict_data'] = $resolutionPayload;
        }

        return SyncMetadata::forUser($userId)
            ->where('sync_status', 'conflict')
            ->whereIn('entity_id', $syncIds)
            ->update($updateData);
    }

    public function updateDedupHash(
        string $entityType,
        string $entityId,
        int $userId,
        string $dedupHash
    ): void {
        $meta = SyncMetadata::where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->where('user_id', $userId)
            ->firstOrNew();

        if (! $meta->exists) {
            $meta->fill([
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'user_id' => $userId,
                'dedup_hash' => $dedupHash,
            ]);
            $meta->save();
        } else {
            $meta->update(['dedup_hash' => $dedupHash]);
        }
    }

    public function updateFieldHash(
        string $entityType,
        string $entityId,
        string $fieldHash,
        array $baseData,
        string $serverUpdatedAt
    ): void {
        $meta = SyncMetadata::where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->first();

        if ($meta) {
            $meta->update([
                'field_hash' => $fieldHash,
                'base_data' => $baseData,
                'server_updated_at' => $serverUpdatedAt,
            ]);
        }
    }

    public function getBaseData(string $entityType, string $syncId, int $userId): ?array
    {
        $record = SyncMetadata::forUser($userId)
            ->where('entity_type', $entityType)
            ->where('entity_id', $syncId)
            ->first();

        return $record?->base_data;
    }

    public function getDeletedMetadata(int $userId, string $entityType): Collection
    {
        return SyncMetadata::forUser($userId)
            ->where('entity_type', $entityType)
            ->where('sync_status', 'pending')
            ->get();
    }

    public function getConflicts(int $userId, ?string $entityType = null): Collection
    {
        $query = SyncMetadata::forUser($userId)
            ->where('sync_status', 'conflict');

        if ($entityType) {
            $query->where('entity_type', $entityType);
        }

        return $query->get();
    }

    public function getResolvedSince(int $userId, int $timestamp): Collection
    {
        $date = date('Y-m-d H:i:s', $timestamp);

        return SyncMetadata::forUser($userId)
            ->where('sync_status', 'resolved')
            ->where('updated_at', '>=', $date)
            ->get();
    }

    public function getMaxDeletedMetadata(int $userId): ?string
    {
        return SyncMetadata::forUser($userId)
            ->where('sync_status', 'pending')
            ->max('updated_at');
    }

    public function getAllSyncedRecords(int $userId): Collection
    {
        return SyncMetadata::forUser($userId)
            ->whereIn('sync_status', ['synced', 'conflict'])
            ->get();
    }
}
