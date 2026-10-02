<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Services\Sync;

use App\Repositories\SyncMetadataRepository;
use App\Services\Sync\Contracts\SyncProcessorInterface;
use App\Services\SyncIdResolver;
use Illuminate\Support\Facades\Log;

class SyncOrchestratorService
{
    private array $processors = [];

    private SyncIdResolver $idResolver;

    private ForeignKeyResolver $foreignKeyResolver;

    private SyncMetadataRepository $syncMetadataRepo;

    public function __construct(SyncIdResolver $idResolver, ForeignKeyResolver $foreignKeyResolver)
    {
        $this->idResolver = $idResolver;
        $this->foreignKeyResolver = $foreignKeyResolver;
        $this->syncMetadataRepo = app(SyncMetadataRepository::class);
    }

    public function registerProcessor(string $entityType, SyncProcessorInterface $processor): void
    {
        $this->processors[$entityType] = $processor;
    }

    public function getProcessor(string $entityType): ?SyncProcessorInterface
    {
        return $this->processors[$entityType] ?? null;
    }

    public function merge(array $data, int $userId): array
    {
        $results = [
            'created' => [],
            'updated' => [],
            'deleted' => [],
            'conflicts' => [],
            'errors' => [],
            'skipped' => [],
        ];

        $entityOrder = [
            'account',
            'recurring_record',
            'recurring_record_product',
            'supplier',
            'supplier_product',
            'budget_provider',
            'budget_provider_product',
            // LBDS-280: tombstones attachments BEFORE budget_entry so an
            // entry delete in the same drain cycle never races an
            // attachment delete. The processor's postprocessDelete hook
            // removes the file from storage as well.
            'attachment',
            'budget_entry',
        ];

        $processed = [];

        foreach ($entityOrder as $entityType) {
            if (! isset($data[$entityType])) {
                continue;
            }

            $items = $data[$entityType];
            $processed[] = $entityType;

            $this->foreignKeyResolver->warmCache($entityType, $data, $userId);

            $processor = $this->processors[$entityType] ?? null;

            if (! $processor) {
                Log::warning("SyncOrchestrator: No processor registered for {$entityType}");
                $results['skipped'][$entityType] = count($items);

                continue;
            }

            try {
                $entityResult = $this->processEntityType($entityType, $items, $processor, $userId);

                if (! empty($entityResult['created'])) {
                    $results['created'][$entityType] = $entityResult['created'];
                }
                if (! empty($entityResult['updated'])) {
                    $results['updated'][$entityType] = $entityResult['updated'];
                }
                if (! empty($entityResult['deleted'])) {
                    $results['deleted'][$entityType] = $entityResult['deleted'];
                }
                if (! empty($entityResult['conflicts'])) {
                    $results['conflicts'][$entityType] = $entityResult['conflicts'];
                }
                if (! empty($entityResult['errors'])) {
                    $results['errors'][$entityType] = $entityResult['errors'];
                }
            } catch (\Exception $e) {
                Log::error("SyncOrchestrator: Error processing {$entityType}", [
                    'error' => $e->getMessage(),
                ]);
                $results['errors'][$entityType] = [
                    ['sync_id' => 'batch', 'error' => $e->getMessage()],
                ];
            }
        }

        foreach ($data as $entityType => $items) {
            if (in_array($entityType, $processed, true)) {
                continue;
            }

            if (! isset($this->processors[$entityType])) {
                Log::warning("SyncOrchestrator: Unknown entityType {$entityType}");

                continue;
            }

            $this->foreignKeyResolver->warmCache($entityType, $data, $userId);

            $processor = $this->processors[$entityType];

            try {
                $entityResult = $this->processEntityType($entityType, $items, $processor, $userId);

                if (! empty($entityResult['created'])) {
                    $results['created'][$entityType] = $entityResult['created'];
                }
                if (! empty($entityResult['updated'])) {
                    $results['updated'][$entityType] = $entityResult['updated'];
                }
                if (! empty($entityResult['deleted'])) {
                    $results['deleted'][$entityType] = $entityResult['deleted'];
                }
                if (! empty($entityResult['conflicts'])) {
                    $results['conflicts'][$entityType] = $entityResult['conflicts'];
                }
            } catch (\Exception $e) {
                $results['errors'][$entityType] = [
                    ['sync_id' => 'batch', 'error' => $e->getMessage()],
                ];
            }
        }

        return $results;
    }

    // LBDS-244: per-item fallback for a poisoned batch. Returns the same
    // result shape with per-item errors carrying real sync_ids.
    private function executeEntityOperationsPerItem(
        SyncProcessorInterface $processor,
        string $entityType,
        array $toCreate,
        array $toUpdate,
        array $toDelete,
        int $userId,
        $existingMap,
        array $conflicts,
    ): array {
        $created = [];
        $updated = [];
        $deleted = [];
        $errors = [];

        foreach ($toCreate as $item) {
            $syncId = $item['id'] ?? ($item['sync_id'] ?? 'unknown');
            try {
                foreach ($processor->create([$item], $userId) as $row) {
                    $created[] = $row;
                }
            } catch (\Exception $e) {
                Log::warning('Sync per-item create failed', [
                    'entity_type' => $entityType,
                    'sync_id' => $syncId,
                    'error' => $e->getMessage(),
                ]);
                $errors[] = ['sync_id' => $syncId, 'error' => $e->getMessage()];
            }
        }

        foreach ($toUpdate as $item) {
            $syncId = $item['id'] ?? ($item['sync_id'] ?? 'unknown');
            try {
                foreach ($processor->update([$item], $userId, $existingMap) as $row) {
                    $updated[] = $row;
                }
            } catch (\Exception $e) {
                Log::warning('Sync per-item update failed', [
                    'entity_type' => $entityType,
                    'sync_id' => $syncId,
                    'error' => $e->getMessage(),
                ]);
                $errors[] = ['sync_id' => $syncId, 'error' => $e->getMessage()];
            }
        }

        foreach ($toDelete as $syncId) {
            try {
                foreach ($processor->delete([$syncId], $userId) as $row) {
                    $deleted[] = $row;
                }
            } catch (\Exception $e) {
                Log::warning('Sync per-item delete failed', [
                    'entity_type' => $entityType,
                    'sync_id' => $syncId,
                    'error' => $e->getMessage(),
                ]);
                $errors[] = ['sync_id' => $syncId, 'error' => $e->getMessage()];
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'deleted' => $deleted,
            'conflicts' => $conflicts,
            'errors' => $errors,
        ];
    }

    private function processEntityType(
        string $entityType,
        array $items,
        SyncProcessorInterface $processor,
        int $userId,
    ): array {
        $toCreate = [];
        $toUpdate = [];
        $toDelete = [];

        $result = $processor->detectConflicts($items, $userId);
        $conflicts = $result['conflicts'];
        $existingMap = $result['existingMap'];

        $conflictSyncIds = array_map(fn ($c) => $c['sync_id'], $conflicts);

        foreach ($items as $item) {
            $syncId = $item['id'] ?? null;
            if (! $syncId) {
                continue;
            }

            if (in_array($syncId, $conflictSyncIds, true)) {
                $clientData = $item;
                $conflictInfo = [];
                foreach ($conflicts as $c) {
                    if ($c['sync_id'] === $syncId) {
                        $conflictInfo = array_intersect_key(
                            $c,
                            array_flip(['conflict_type', 'server_hash', 'client_hash', 'overlapping_fields', 'server_data'])
                        );
                        break;
                    }
                }
                $this->saveConflictMetadata($entityType, $syncId, $userId, $clientData, $conflictInfo);

                continue;
            }

            if (isset($item['_deleted']) && $item['_deleted'] === true) {
                $toDelete[] = $syncId;
            } else {
                $existing = $existingMap->get($syncId);
                if ($existing) {
                    $toUpdate[] = $item;
                } else {
                    $toCreate[] = $item;
                }
            }
        }

        try {
            $updated = $processor->update($toUpdate, $userId, $existingMap);

            $result = [
                'created' => $processor->create($toCreate, $userId),
                'updated' => $updated,
                'deleted' => $processor->delete($toDelete, $userId),
                'conflicts' => $conflicts,
                'errors' => [],
            ];

            return $result;
        } catch (\Exception $e) {
            // LBDS-244: one poison row (e.g. an FK to a local-only id) must not
            // nuke the whole batch. Retry per item so siblings still sync and
            // culprits come back with their real sync_id in errors.
            Log::warning('Sync entity batch failed, retrying per item', [
                'entity_type' => $entityType,
                'error' => $e->getMessage(),
            ]);

            return $this->executeEntityOperationsPerItem(
                $processor, $entityType, $toCreate, $toUpdate, $toDelete, $userId, $existingMap, $conflicts
            );
        }
    }

    private function saveConflictMetadata(string $entityType, string $syncId, int $userId, array $clientData, array $conflictInfo = []): void
    {
        $conflictData = $clientData;
        if (! empty($conflictInfo)) {
            $conflictData = array_merge($clientData, $conflictInfo);
        }

        $this->syncMetadataRepo->markConflict($entityType, $syncId, $userId, $conflictData);
    }
}
