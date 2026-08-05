<?php

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

        $updated = $processor->update($toUpdate, $userId, $existingMap);

        $result = [
            'created' => $processor->create($toCreate, $userId),
            'updated' => $updated,
            'deleted' => $processor->delete($toDelete, $userId),
            'conflicts' => $conflicts,
            'errors' => [],
        ];

        return $result;
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
