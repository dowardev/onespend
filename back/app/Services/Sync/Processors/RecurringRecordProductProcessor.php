<?php

namespace App\Services\Sync\Processors;

use App\Models\RecurringRecordProduct;
use App\Services\Sync\Processors\Concerns\ResolvesSupplierProductId;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RecurringRecordProductProcessor extends AbstractEntityProcessor
{
    use ResolvesSupplierProductId;

    protected function getModel(): string
    {
        return RecurringRecordProduct::class;
    }

    protected function getEntityName(): string
    {
        return 'recurring_record_product';
    }

    public function canProcess(string $entityType): bool
    {
        return $entityType === 'recurring_record_product';
    }

    public function getEntityType(): string
    {
        return 'recurring_record_product';
    }

    public function update(array $items, int $userId, array|Collection $existingMap = []): array
    {
        if (empty($items)) {
            return [];
        }

        $modelClass = $this->getModel();
        $updated = [];
        $syncIds = [];
        $errors = [];

        try {
            DB::beginTransaction();

            foreach ($items as $item) {
                $syncId = $item['id'] ?? ($item['sync_id'] ?? null);
                if (!$syncId) {
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

                $existingUpdatedAt = null;
                if (isset($existingMap[$syncId])) {
                    $existingUpdatedAt = $existingMap[$syncId]->updated_at ?? null;
                }

                $query = $modelClass::where('sync_id', $syncId)
                    ->whereHas('recurringRecord', fn($q) => $q->where('user_id', $userId));

                if ($existingUpdatedAt !== null) {
                    $query->where('updated_at', $existingUpdatedAt);
                }

                $affected = $query->update($data);

                if ($affected === 0 && $existingUpdatedAt !== null) {
                    $errors[] = ['sync_id' => $syncId, 'error' => 'Optimistic lock conflict'];
                    continue;
                }

                $syncIds[] = $syncId;
                $updated[] = ['sync_id' => $syncId, '_original' => $item];
            }

            if (!empty($syncIds)) {
                $this->bulkUpdateSyncMetadata($syncIds, 'synced', $userId);
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

    protected function preprocessData(array $item, int $userId): array
    {
        $item = $this->resolveSupplierProductFields($item, $userId);

        if (isset($item['recurringRecordId'])) {
            $item['recurring_record_id'] = $item['recurringRecordId'];
        }
        unset($item['recurringRecordId']);

        return $item;
    }
}