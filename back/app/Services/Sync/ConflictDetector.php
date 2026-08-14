<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Services\Sync;

use App\Models\SyncMetadata;
use App\Services\Sync\Contracts\SyncProcessorInterface;

class ConflictDetector
{
    public function computeFieldHash(SyncProcessorInterface $processor, array $data): string
    {
        $fillable = $processor->getCachedFillable();
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

    public function normalizeTimestamp(int|string $timestamp): int
    {
        if (is_numeric($timestamp) && strlen((string) $timestamp) >= 10) {
            return (int) $timestamp;
        }

        return 0;
    }

    public function valuesDiffer(mixed $a, mixed $b): bool
    {
        if ($a === $b) {
            return false;
        }
        if ($a === null || $b === null) {
            return true;
        }
        if (is_numeric($a) && is_numeric($b)) {
            return abs((float) $a - (float) $b) > 0.0001;
        }

        return json_encode($a) !== json_encode($b);
    }

    public function detectConflicts(
        SyncProcessorInterface $processor,
        array $items,
        int $userId,
    ): array {
        $conflicts = [];
        $modelClass = $processor->getModelClass();

        $syncIds = array_map(fn ($item) => $item['id'] ?? null, $items);
        $syncIds = array_filter(array_unique($syncIds));

        if (empty($syncIds)) {
            return ['conflicts' => [], 'existingMap' => collect()];
        }

        $existing = $modelClass::whereIn('sync_id', $syncIds)
            ->where('user_id', $userId)
            ->get()
            ->keyBy('sync_id');

        $baseDataRecords = SyncMetadata::forUser($userId)
            ->byEntityType($processor->getEntityType())
            ->where('sync_status', '!=', 'resolved')
            ->whereIn('entity_id', $syncIds)
            ->get()
            ->keyBy('entity_id');

        foreach ($items as $item) {
            $syncId = $item['id'] ?? null;
            if (! $syncId) {
                continue;
            }

            $serverItem = $existing->get($syncId);
            if (! $serverItem) {
                continue;
            }

            $clientProcessed = $processor->preprocessData($item, $userId);
            $clientFiltered = $processor->filterToFillableFromCache($clientProcessed, $processor->getCachedFillable());
            $clientHash = $this->computeFieldHash($processor, $clientFiltered);

            $serverData = $serverItem->toArray();
            $serverFiltered = $processor->filterToFillableFromCache($serverData, $processor->getCachedFillable());
            $serverHash = $this->computeFieldHash($processor, $serverFiltered);

            if ($clientHash === $serverHash) {
                continue;
            }

            $clientTimestamp = $this->normalizeTimestamp($item['updated_at'] ?? 0);
            $serverTimestamp = $serverItem->updated_at->timestamp;

            $syncMeta = $baseDataRecords->get($syncId);
            $baseData = $syncMeta?->base_data ?? [];

            $shouldReportConflict = false;

            if ($clientTimestamp < $serverTimestamp) {
                $shouldReportConflict = true;
            } elseif (! empty($baseData)) {
                $shouldReportConflict = true;
            }

            if ($shouldReportConflict) {
                $conflict = $this->buildConflictReport([
                    'syncId' => $syncId,
                    'clientFiltered' => $clientFiltered,
                    'serverFiltered' => $serverFiltered,
                    'baseData' => $baseData,
                    'serverData' => $serverData,
                    'item' => $item,
                    'serverHash' => $serverHash,
                    'clientHash' => $clientHash,
                ]);

                if ($conflict !== null) {
                    $conflicts[] = $conflict;
                }
            }
        }

        return ['conflicts' => $conflicts, 'existingMap' => $existing];
    }

    private function buildConflictReport(array $params): ?array
    {
        $syncId = $params['syncId'];
        $clientFiltered = $params['clientFiltered'];
        $serverFiltered = $params['serverFiltered'];
        $baseData = $params['baseData'];
        $serverData = $params['serverData'];
        $item = $params['item'];
        $serverHash = $params['serverHash'];
        $clientHash = $params['clientHash'];

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

        if (! empty($overlapping)) {
            return [
                'sync_id' => $syncId,
                'server_data' => $serverData,
                'client_data' => $item,
                'server_hash' => $serverHash,
                'client_hash' => $clientHash,
                'conflict_type' => 'semantic',
                'overlapping_fields' => array_values($overlapping),
            ];
        }

        if (! empty($clientChangedFields)) {
            return [
                'sync_id' => $syncId,
                'server_data' => $serverData,
                'client_data' => $item,
                'server_hash' => $serverHash,
                'client_hash' => $clientHash,
                'conflict_type' => 'concurrent_edit',
                'changed_fields' => array_values($clientChangedFields),
            ];
        }

        return null;
    }
}
