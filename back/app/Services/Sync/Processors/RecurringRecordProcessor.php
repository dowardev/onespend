<?php

namespace App\Services\Sync\Processors;

use App\Models\RecurringRecord;
use App\Models\RecurringRecordProduct;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RecurringRecordProcessor extends AbstractEntityProcessor
{
    protected function getModel(): string
    {
        return RecurringRecord::class;
    }

    protected function getEntityName(): string
    {
        return 'recurring_record';
    }

    public function preprocessData(array $item, int $userId): array
    {
        $resolver = $this->idResolver;

        $accountId = $item['account_id'] ?? $item['accountId'] ?? null;
        if ($accountId !== null) {
            $item['account_id'] = $resolver->resolveToInt($accountId, 'account', $userId);
        }

        // Normalize field names (camelCase -> snake_case)
        $map = [
            'entryType' => 'entry_type',
            'repeatFrequency' => 'repeat_frequency',
            'repeatInterval' => 'repeat_interval',
            'repeatDays' => 'repeat_days',
            'repeatMonthDay' => 'repeat_month_day',
            'repeatMonthWeekdayMode' => 'repeat_month_weekday_mode',
            'repeatMonthWeekday' => 'repeat_month_weekday',
            'repeatMonthWeekdayOrdinal' => 'repeat_month_weekday_ordinal',
            'repeatYearMonth' => 'repeat_year_month',
            'repeatYearDay' => 'repeat_year_day',
            'autoInsert' => 'auto_insert',
            'startDate' => 'start_date',
            'endDate' => 'end_date',
            'accountId' => 'account_id',
        ];

        foreach ($map as $camel => $snake) {
            if (isset($item[$camel])) {
                $item[$snake] = $item[$camel];
            }
            unset($item[$camel]);
        }

        return $item;
    }

    public function create(array $items, int $userId): array
    {
        if (empty($items)) {
            return [];
        }

        $modelClass = $this->getModel();
        $now = now();
        $insertData = [];
        $productsToCreate = [];
        $result = [];

        foreach ($items as $item) {
            $syncId = $item['id'] ?? null;
            if (! $syncId) {
                continue;
            }

            $products = $item['products'] ?? [];
            $preprocessed = $this->preprocessData($item, $userId);
            $data = $this->filterToFillableFromCache($preprocessed, $this->getCachedFillable());
            $data['sync_id'] = $syncId;
            $data['user_id'] = $userId;
            $data['created_at'] = $now;
            $data['updated_at'] = $now;

            $insertData[] = $data;

            if (! empty($products)) {
                $productsToCreate[$syncId] = $products;
            }
        }

        if (empty($insertData)) {
            return [];
        }

        try {
            DB::beginTransaction();

            $modelClass::insert($insertData);
            $syncIds = array_column($insertData, 'sync_id');
            $created = $modelClass::whereIn('sync_id', $syncIds)
                ->where('user_id', $userId)
                ->get(['id', 'sync_id']);

            foreach ($created as $record) {
                $result[] = ['sync_id' => $record->sync_id, 'id' => $record->id];
                if (isset($productsToCreate[$record->sync_id])) {
                    $this->upsertRecordProducts($record->id, $productsToCreate[$record->sync_id], $userId);
                }
            }

            $fieldHashes = [];
            $baseDataMap = [];
            foreach ($insertData as $item) {
                $fieldHashes[$item['sync_id']] = $this->computeFieldHash($item);
                $baseDataMap[$item['sync_id']] = $item;
            }

            $this->bulkUpdateSyncMetadata($syncIds, 'synced', $userId, [], $fieldHashes, $baseDataMap);
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return $result;
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

            $productsBySyncId = [];
            $filteredDataBySyncId = [];

            foreach ($items as $item) {
                $syncId = $item['id'] ?? null;
                if (! $syncId) {
                    continue;
                }

                $preprocessed = $this->preprocessData($item, $userId);
                $data = $this->filterToFillableFromCache($preprocessed, $this->getCachedFillable());
                $filteredDataBySyncId[$syncId] = $data;
                unset($data['id'], $data['sync_id'], $data['user_id'], $data['created_at'],
                    $data['products'], $data['_deleted']);
                $data['updated_at'] = now();

                $existingUpdatedAt = null;
                if (isset($existingMap[$syncId])) {
                    $existingUpdatedAt = $existingMap[$syncId]->updated_at ?? null;
                }

                $query = $modelClass::where('sync_id', $syncId)->where('user_id', $userId);
                if ($existingUpdatedAt !== null) {
                    $query->where('updated_at', $existingUpdatedAt);
                }

                $affected = $query->update($data);

                if ($affected === 0 && $existingUpdatedAt !== null) {
                    $errors[] = ['sync_id' => $syncId, 'error' => 'Optimistic lock conflict'];

                    continue;
                }

                $products = $item['products'] ?? [];
                if (! empty($products)) {
                    $productsBySyncId[$syncId] = $products;
                }

                $syncIds[] = $syncId;
                $updated[] = ['sync_id' => $syncId];
            }

            if (! empty($productsBySyncId)) {
                $recordSyncIds = array_keys($productsBySyncId);
                $records = $modelClass::whereIn('sync_id', $recordSyncIds)
                    ->where('user_id', $userId)
                    ->get(['id', 'sync_id'])
                    ->keyBy('sync_id');

                foreach ($productsBySyncId as $syncId => $products) {
                    if (! isset($records[$syncId])) {
                        continue;
                    }
                    $recordId = $records[$syncId]->id;

                    $incomingSyncIds = array_filter(array_map(fn ($p) => $p['sync_id'] ?? $p['id'] ?? null, $products));
                    RecurringRecordProduct::where('recurring_record_id', $recordId)
                        ->when(! empty($incomingSyncIds), fn ($q) => $q->whereNotIn('sync_id', $incomingSyncIds))
                        ->update(['deleted_at' => now(), 'status' => 'deleted']);

                    $this->upsertRecordProducts($recordId, $products, $userId);
                }
            }

            if (! empty($syncIds)) {
                $this->bulkUpdateSyncMetadata($syncIds, 'synced', $userId);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        if (! empty($errors)) {
            Log::warning("Optimistic lock conflicts in batch update for {$this->getEntityName()}", [
                'conflicts' => $errors,
            ]);
        }

        return $updated;
    }

    private function upsertRecordProducts(int $recordId, array $products, int $userId): void
    {
        $now = now();

        $spSyncIds = array_filter(array_map(fn ($p) => $p['supplier_product_id'] ?? $p['supplierProductId'] ?? null, $products));
        $spIdMap = ! empty($spSyncIds) ? $this->idResolver->resolveBatch('supplier_product', $spSyncIds, $userId) : [];

        $upsertData = [];
        $productSyncIds = [];

        foreach ($products as $product) {
            $productSyncId = $product['sync_id'] ?? uniqid('rrp_', true);
            $spId = $product['supplier_product_id'] ?? $product['supplierProductId'] ?? null;
            if ($spId && isset($spIdMap[$spId])) {
                $spId = $spIdMap[$spId];
            } elseif ($spId && is_numeric($spId)) {
                $spId = (int) $spId;
            }

            $upsertData[] = [
                'sync_id' => $productSyncId,
                'user_id' => $userId,
                'recurring_record_id' => $recordId,
                'supplier_product_id' => $spId,
                'product_name' => $product['product_name'] ?? $product['productName'] ?? '',
                'product_price' => $product['product_price'] ?? $product['productPrice'] ?? 0,
                'quantity' => $product['quantity'] ?? 0,
                'status' => 'active',
                'deleted_at' => null,
                'updated_at' => $now,
                'created_at' => $now,
            ];
            $productSyncIds[] = $productSyncId;
        }

        if (! empty($upsertData)) {
            RecurringRecordProduct::upsert(
                $upsertData,
                ['sync_id', 'user_id'],
                ['recurring_record_id', 'supplier_product_id', 'product_name', 'product_price', 'quantity', 'status', 'deleted_at', 'updated_at']
            );
            $fieldHashes = [];
            $baseDataMap = [];
            foreach ($upsertData as $item) {
                $fieldHashes[$item['sync_id']] = $this->computeFieldHash($item);
                $baseDataMap[$item['sync_id']] = $item;
            }
            $this->bulkUpdateSyncMetadata($productSyncIds, 'synced', $userId, [], $fieldHashes, $baseDataMap);
        }
    }
}
