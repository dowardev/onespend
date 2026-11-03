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

        // LBDS-273: null values are left out of the hash. A field the
        // client did not send and a field the server stores as null have
        // to hash the same, or every push of a row that does not carry the
        // field raises a phantom conflict: the server's row includes the
        // column (as null) while a client that predates the field omits
        // the key entirely, and `array_intersect_key` keeps the server's
        // version but not the client's.
        //
        // This is safe to do here rather than in the fillable filter: the
        // filter also feeds the write path, where a null MUST be written
        // (that is how a field gets cleared). The stored field_hash is
        // never compared against a recomputed one, so changing what goes
        // into it does not invalidate the hashes already on disk.
        $relevantData = array_filter($relevantData, fn ($value) => $value !== null);

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
            // GitLab #15 (review R1-001): the detection and the write must
            // see the same server state. The row lock is held until the
            // transaction that wraps both commits.
            ->lockForUpdate()
            ->get()
            ->keyBy('sync_id');

        $dateColumns = $this->dateColumnsFor($modelClass);

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
            $serverFiltered = $this->normalizeDateColumns($serverFiltered, $serverItem, $dateColumns);
            $serverHash = $this->computeFieldHash($processor, $serverFiltered);

            if ($clientHash === $serverHash) {
                continue;
            }

            $clientTimestamp = $this->normalizeTimestamp($item['updated_at'] ?? 0);
            $serverTimestamp = $serverItem->updated_at->timestamp;

            $syncMeta = $baseDataRecords->get($syncId);
            $baseData = $syncMeta?->base_data ?? [];

            // GitLab #15: a row with a higher version than the base was
            // written after the base was taken, so a field the base does not
            // carry has an unknown server state.
            $baseVersion = $baseData['_version'] ?? null;
            $serverChangedSinceBase = $baseVersion !== null
                && (int) $serverItem->version > (int) $baseVersion;

            $conflict = $this->buildConflictReport([
                'syncId' => $syncId,
                'clientFiltered' => $clientFiltered,
                'serverFiltered' => $serverFiltered,
                'baseData' => $baseData,
                'serverData' => $serverData,
                'item' => $item,
                'serverHash' => $serverHash,
                'clientHash' => $clientHash,
                'clientTimestamp' => $clientTimestamp,
                'serverTimestamp' => $serverTimestamp,
                'serverChangedSinceBase' => $serverChangedSinceBase,
            ]);

            if ($conflict !== null) {
                $conflicts[] = $conflict;
            }
        }

        return ['conflicts' => $conflicts, 'existingMap' => $existing];
    }

    /**
     * Bring the stored DATE columns back to the "Y-m-d" shape the client
     * sends.
     *
     * The model casts a DATE column to a Carbon instance, so `toArray()`
     * serializes it as an ISO timestamp ("2026-06-01T00:00:00.000000Z")
     * while the client (and the merge base) carry the plain "2026-06-01".
     * Comparing the two as they are makes every push of a dated row look
     * like the server changed the date, which raises a phantom conflict.
     *
     * The raw column value is used (not the cast one) so the calendar day
     * is the one the database stores, with no timezone shifting.
     */
    private function normalizeDateColumns(array $serverFiltered, $serverItem, array $dateColumns): array
    {
        $rawAttributes = $serverItem->getAttributes();

        foreach ($dateColumns as $field) {
            if (! array_key_exists($field, $serverFiltered)) {
                continue;
            }

            $rawValue = $rawAttributes[$field] ?? null;
            if ($rawValue === null || $rawValue === '') {
                continue;
            }

            $serverFiltered[$field] = substr((string) $rawValue, 0, 10);
        }

        return $serverFiltered;
    }

    /**
     * The fillable fields the model stores in a DATE column.
     */
    private function dateColumnsFor(string $modelClass): array
    {
        $casts = (new $modelClass)->getCasts();
        $fields = [];

        foreach ($casts as $field => $cast) {
            if (in_array($cast, ['date', 'immutable_date'], true)) {
                $fields[] = $field;
            }
        }

        return $fields;
    }

    /**
     * GitLab #15: decide whether one push is a conflict, field by field.
     *
     * The client payload is "base + the client's own changes", so it can be
     * applied as-is whenever the server row still equals the base state for
     * every field the client writes. That is the normal case of a client
     * that creates a row and then edits it: the server never touched the
     * row after the create, so the edit is a plain update, not a conflict.
     *
     * A conflict is reported only when applying the payload would destroy
     * something the server owns:
     *
     *  - `semantic`: both sides changed the same field since the base.
     *  - `concurrent_edit`: the server changed a field and the client still
     *    carries the base value for it, so the write would revert it.
     *
     * Rows without a merge base (never synced through the merge path) keep
     * the historical rule: the client wins unless its timestamp is older
     * than the server's.
     */
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
        $clientTimestamp = $params['clientTimestamp'];
        $serverTimestamp = $params['serverTimestamp'];
        $serverChangedSinceBase = $params['serverChangedSinceBase'] ?? false;

        $analysis = $this->analyzeChanges($clientFiltered, $serverFiltered, $baseData, $serverChangedSinceBase);

        if (empty($baseData)) {
            // No merge base: there is nothing to compare the server row
            // against, so the client wins unless it is stale.
            if ($clientTimestamp >= $serverTimestamp) {
                return null;
            }

            return $this->report([
                'syncId' => $syncId,
                'serverData' => $serverData,
                'item' => $item,
                'serverHash' => $serverHash,
                'clientHash' => $clientHash,
                'conflictType' => 'concurrent_edit',
                'fields' => $analysis['clientChanged'],
            ]);
        }

        if (! empty($analysis['overlapping'])) {
            return $this->report([
                'syncId' => $syncId,
                'serverData' => $serverData,
                'item' => $item,
                'serverHash' => $serverHash,
                'clientHash' => $clientHash,
                'conflictType' => 'semantic',
                'fields' => $analysis['overlapping'],
                'fieldsKey' => 'overlapping_fields',
            ]);
        }

        if (! empty($analysis['staleClobber'])) {
            return $this->report([
                'syncId' => $syncId,
                'serverData' => $serverData,
                'item' => $item,
                'serverHash' => $serverHash,
                'clientHash' => $clientHash,
                'conflictType' => 'concurrent_edit',
                'fields' => array_values(array_unique(array_merge(
                    $analysis['clientChanged'],
                    $analysis['staleClobber'],
                ))),
            ]);
        }

        // The server did not change anything the client writes: the client
        // is simply ahead of the server and its update can be applied.
        return null;
    }

    /**
     * Field-level three-way analysis of one push.
     *
     * Only the fields the client sends are analysed: those are the ones
     * the update path writes. A field the client does not send keeps the
     * stored value, so it can never be clobbered by this push.
     *
     * A field the client sends but the base never saw (the base is the
     * snapshot of the last synced payload) counts as "changed by the
     * server" only when the server holds a value for it — a null server
     * value means nobody ever set it.
     */
    private function analyzeChanges(
        array $clientFiltered,
        array $serverFiltered,
        array $baseData,
        bool $serverChangedSinceBase = false,
    ): array {
        $clientChanged = [];
        $serverChanged = [];
        $overlapping = [];
        $staleClobber = [];

        foreach (array_keys($clientFiltered) as $field) {
            $clientVal = $clientFiltered[$field] ?? null;
            $serverVal = $serverFiltered[$field] ?? null;

            // The push does not change this field: nothing to merge.
            if (! $this->valuesDiffer($clientVal, $serverVal)) {
                continue;
            }

            $hasBase = array_key_exists($field, $baseData);
            $baseVal = $hasBase ? $baseData[$field] : null;

            $clientChangedField = $this->valuesDiffer($clientVal, $baseVal);
            $serverChangedField = $this->valuesDiffer($serverVal, $baseVal);

            if (! $hasBase && $serverChangedSinceBase) {
                // The base never carried this field and the server wrote the
                // row after the base was taken, so the server side value of
                // the field is unknown: treat it as changed so the client's
                // write cannot silently overwrite it.
                $serverChangedField = true;
            }

            if ($clientChangedField) {
                $clientChanged[] = $field;
            }

            if ($serverChangedField) {
                $serverChanged[] = $field;

                if ($clientChangedField) {
                    $overlapping[] = $field;
                } else {
                    // The server changed this field and the client still
                    // carries the base value: applying the push would
                    // revert the server's change.
                    $staleClobber[] = $field;
                }
            }
        }

        return [
            'clientChanged' => $clientChanged,
            'serverChanged' => $serverChanged,
            'overlapping' => $overlapping,
            'staleClobber' => $staleClobber,
        ];
    }

    private function report(array $params): array
    {
        $report = [
            'sync_id' => $params['syncId'],
            'server_data' => $params['serverData'],
            'client_data' => $params['item'],
            'server_hash' => $params['serverHash'],
            'client_hash' => $params['clientHash'],
            'conflict_type' => $params['conflictType'],
        ];

        $fieldsKey = $params['fieldsKey'] ?? 'changed_fields';
        $report[$fieldsKey] = array_values($params['fields']);

        return $report;
    }
}
