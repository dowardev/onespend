<?php

namespace App\Services\Sync;

use App\Services\Sync\Contracts\SyncProcessorInterface;
use App\Models\SyncMetadata;
use App\Services\SyncIdResolver;
use Illuminate\Support\Facades\Log;

class SyncOrchestratorService
{
    private array $processors = [];
    private SyncIdResolver $idResolver;

    public function __construct(SyncIdResolver $idResolver)
    {
        $this->idResolver = $idResolver;
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
            if (!isset($data[$entityType])) {
                continue;
            }

            $items = $data[$entityType];
            $processed[] = $entityType;

            $this->resolveForeignKeysForEntity($entityType, $data, $userId);

            $processor = $this->processors[$entityType] ?? null;

            if (!$processor) {
                Log::warning("SyncOrchestrator: No processor registered for {$entityType}");
                $results['skipped'][$entityType] = count($items);
                continue;
            }

            try {
                $entityResult = $this->processEntityType($entityType, $items, $processor, $userId);

                if (!empty($entityResult['created'])) {
                    $results['created'][$entityType] = $entityResult['created'];
                }
                if (!empty($entityResult['updated'])) {
                    $results['updated'][$entityType] = $entityResult['updated'];
                }
                if (!empty($entityResult['deleted'])) {
                    $results['deleted'][$entityType] = $entityResult['deleted'];
                }
                if (!empty($entityResult['conflicts'])) {
                    $results['conflicts'][$entityType] = $entityResult['conflicts'];
                }
                if (!empty($entityResult['errors'])) {
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

            if (!isset($this->processors[$entityType])) {
                Log::warning("SyncOrchestrator: Unknown entityType {$entityType}");
                continue;
            }

            $this->resolveForeignKeysForEntity($entityType, $data, $userId);

            $processor = $this->processors[$entityType];

            try {
                $entityResult = $this->processEntityType($entityType, $items, $processor, $userId);

                if (!empty($entityResult['created'])) {
                    $results['created'][$entityType] = $entityResult['created'];
                }
                if (!empty($entityResult['updated'])) {
                    $results['updated'][$entityType] = $entityResult['updated'];
                }
                if (!empty($entityResult['deleted'])) {
                    $results['deleted'][$entityType] = $entityResult['deleted'];
                }
                if (!empty($entityResult['conflicts'])) {
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

    private function resolveForeignKeysForEntity(string $entityType, array $data, int $userId): void
    {
        $accountSyncIds = [];
        $supplierSyncIds = [];
        $supplierProductSyncIds = [];
        $recurringRecordSyncIds = [];

        $items = $data[$entityType] ?? [];

        foreach ($items as $item) {
            if (in_array($entityType, ['budget_entry', 'budget_provider', 'recurring_record'])) {
                $accountId = $item['account_id'] ?? $item['accountId'] ?? null;
                if ($accountId && is_string($accountId) && !is_numeric($accountId)) {
                    $accountSyncIds[] = $accountId;
                }
            }

            if (in_array($entityType, ['budget_provider'])) {
                $supplierId = $item['_supplier_id'] ?? $item['supplierId'] ?? null;
                if ($supplierId && is_string($supplierId) && !is_numeric($supplierId)) {
                    $supplierSyncIds[] = $supplierId;
                }
            }

            if (in_array($entityType, ['budget_provider_product', 'recurring_record_product'])) {
                $spId = $item['supplier_product_id'] ?? $item['supplierProductId'] ?? null;
                if ($spId && is_string($spId) && !is_numeric($spId)) {
                    $supplierProductSyncIds[] = $spId;
                }
            }

            if ($entityType === 'recurring_record_product') {
                $rrId = $item['recurring_record_id'] ?? $item['recurringRecordId'] ?? null;
                if ($rrId && is_string($rrId) && !is_numeric($rrId)) {
                    $recurringRecordSyncIds[] = $rrId;
                }
            }
        }

        $accountSyncIds = array_unique($accountSyncIds);
        $supplierSyncIds = array_unique($supplierSyncIds);
        $supplierProductSyncIds = array_unique($supplierProductSyncIds);
        $recurringRecordSyncIds = array_unique($recurringRecordSyncIds);

        if (!empty($accountSyncIds)) {
            $this->idResolver->resolveBatch('account', $accountSyncIds, $userId);
        }
        if (!empty($supplierSyncIds)) {
            $this->idResolver->resolveBatch('supplier', $supplierSyncIds, $userId);
        }
        if (!empty($supplierProductSyncIds)) {
            $this->idResolver->resolveBatch('supplier_product', $supplierProductSyncIds, $userId);
        }
        if (!empty($recurringRecordSyncIds)) {
            $this->idResolver->resolveBatch('recurring_record', $recurringRecordSyncIds, $userId);
        }
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

        $conflictSyncIds = array_map(fn($c) => $c['sync_id'], $conflicts);

        foreach ($items as $item) {
            $syncId = $item['id'] ?? null;
            if (!$syncId) {
                continue;
            }

            if (in_array($syncId, $conflictSyncIds, true)) {
                $clientData = $item;
                $conflictInfo = [];
                foreach ($conflicts as $c) {
                    if ($c['sync_id'] === $syncId) {
                        $conflictInfo = array_intersect_key(
                            $c,
                            array_flip(['conflict_type', 'server_hash', 'client_hash', 'overlapping_fields'])
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

        $result = [
            'created' => $processor->create($toCreate, $userId),
            'updated' => $processor->update($toUpdate, $userId, $existingMap),
            'deleted' => $processor->delete($toDelete, $userId),
            'conflicts' => $conflicts,
            'errors' => [],
        ];
        return $result;
    }

    private function saveConflictMetadata(string $entityType, string $syncId, int $userId, array $clientData, array $conflictInfo = []): void
    {
        $meta = new SyncMetadata();
        $conflictData = $clientData;
        if (!empty($conflictInfo)) {
            $conflictData = array_merge($clientData, $conflictInfo);
        }
        $meta->conflict_data = $conflictData;
        $serializedConflictData = $meta->getAttributes()['conflict_data'];

        SyncMetadata::upsert(
            [
                'entity_type' => $entityType,
                'entity_id' => $syncId,
                'user_id' => $userId,
                'sync_status' => 'conflict',
                'last_synced_at' => now(),
                'server_updated_at' => now(),
                'conflict_data' => $serializedConflictData,
            ],
            ['entity_type', 'entity_id', 'user_id'],
            ['sync_status', 'last_synced_at', 'server_updated_at', 'conflict_data']
        );
    }

}
