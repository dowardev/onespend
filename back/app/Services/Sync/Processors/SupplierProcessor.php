<?php

namespace App\Services\Sync\Processors;

use App\Models\Supplier;
use App\Models\SupplierProduct;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SupplierProcessor extends AbstractEntityProcessor
{
    protected function getModel(): string
    {
        return Supplier::class;
    }

    protected function getEntityName(): string
    {
        return 'supplier';
    }

    public function create(array $items, int $userId): array
    {
        if (empty($items)) {
            return [];
        }

        $result = [];
        $insertData = [];
        $productsToCreate = [];
        $errors = [];
        $now = now();

        $validFields = $this->getCachedFillable();

        foreach ($items as $item) {
            $syncId = $item['id'] ?? null;
            if (! $syncId) {
                $errors[] = ['sync_id' => null, 'error' => 'Missing id'];

                continue;
            }

            $products = $item['products'] ?? [];
            if (empty($products)) {
                $errors[] = ['sync_id' => $syncId, 'error' => 'At least one product is required'];

                continue;
            }

            $preprocessed = $this->preprocessData($item, $userId);
            $data = $this->filterToFillableFromCache($preprocessed, $validFields);
            $data['sync_id'] = $syncId;
            $data['user_id'] = $userId;
            $data['created_at'] = $now;
            $data['updated_at'] = $now;

            if (isset($data['updated_at']) && is_numeric($data['updated_at'])) {
                $data['updated_at'] = date('Y-m-d H:i:s', self::normalizeTimestamp($data['updated_at']));
            }

            $insertData[] = $data;

            if (! empty($products)) {
                $productsToCreate[$syncId] = $products;
            }
        }

        if (! empty($insertData)) {
            try {
                DB::beginTransaction();
                Supplier::insert($insertData);

                $syncIds = array_column($insertData, 'sync_id');
                $created = Supplier::whereIn('sync_id', $syncIds)
                    ->where('user_id', $userId)
                    ->get(['id', 'sync_id']);

                foreach ($created as $record) {
                    $result[] = ['sync_id' => $record->sync_id, 'id' => $record->id];
                    if (isset($productsToCreate[$record->sync_id])) {
                        $this->createSupplierProducts($record->sync_id, $record->id, $productsToCreate[$record->sync_id], $userId);
                    }
                }

                $this->bulkUpdateSyncMetadata($syncIds, 'synced', $userId);
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        }

        return $result;
    }

    public function update(array $items, int $userId, array|Collection $existingMap = []): array
    {
        if (empty($items)) {
            return [];
        }

        $result = [];
        $errors = [];
        $validFields = array_diff($this->getCachedFillable(), ['user_id', 'sync_id', 'created_at']);

        try {
            DB::beginTransaction();

            $productsBySyncId = [];
            $filteredDataBySyncId = [];

            foreach ($items as $item) {
                $syncId = $item['id'] ?? null;
                if (! $syncId) {
                    continue;
                }

                $products = $item['products'] ?? [];
                if (empty($products)) {
                    $errors[] = ['sync_id' => $syncId, 'error' => 'At least one product is required'];

                    continue;
                }

                $preprocessed = $this->preprocessData($item, $userId);
                $updateFields = $this->filterToFillableFromCache($preprocessed, $validFields);
                foreach ($updateFields as $key => $value) {
                    if ($key === 'updated_at' && is_numeric($value)) {
                        $updateFields[$key] = date('Y-m-d H:i:s', self::normalizeTimestamp($value));
                    }
                }

                $existingUpdatedAt = null;
                if (isset($existingMap[$syncId])) {
                    $existingUpdatedAt = $existingMap[$syncId]->updated_at ?? null;
                }

                $query = Supplier::where('sync_id', $syncId)->where('user_id', $userId);
                if ($existingUpdatedAt !== null) {
                    $query->where('updated_at', $existingUpdatedAt);
                }

                $affected = $query->update($updateFields);

                if ($affected === 0 && $existingUpdatedAt !== null) {
                    $errors[] = ['sync_id' => $syncId, 'error' => 'Optimistic lock conflict'];

                    continue;
                }

                $result[] = ['sync_id' => $syncId];
                $filteredDataBySyncId[$syncId] = $updateFields;

                if (! empty($products)) {
                    $productsBySyncId[$syncId] = $products;
                }
            }

            if (! empty($productsBySyncId)) {
                foreach ($productsBySyncId as $syncId => $products) {
                    $this->updateSupplierProducts($syncId, 0, $products, $userId);
                }
            }

            $syncIds = array_column($result, 'sync_id');
            if (! empty($syncIds)) {
                $fieldHashes = [];
                $baseDataMap = [];
                foreach ($syncIds as $sid) {
                    if (isset($filteredDataBySyncId[$sid])) {
                        $fieldHashes[$sid] = $this->computeFieldHash($filteredDataBySyncId[$sid]);
                        $baseDataMap[$sid] = [];
                    }
                }
                $this->bulkUpdateSyncMetadata($syncIds, 'synced', $userId, [], $fieldHashes, $baseDataMap);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        $lockConflicts = array_filter($errors, fn ($e) => $e['error'] === 'Optimistic lock conflict');
        if (! empty($lockConflicts)) {
            Log::warning("Optimistic lock conflicts in batch update for {$this->getEntityName()}", [
                'conflicts' => $lockConflicts,
            ]);
        }

        return $result;
    }

    private function createSupplierProducts(string $supplierSyncId, int $supplierId, array $products, int $userId): void
    {
        $now = now();
        $insertData = [];

        foreach ($products as $product) {
            $productSyncId = $product['sync_id'] ?? $product['id'] ?? uniqid('sp_', true);

            $insertData[] = [
                'user_id' => $userId,
                'supplier_id' => $supplierSyncId,
                'sync_id' => $productSyncId,
                'name' => $product['name'] ?? '',
                'price' => $product['price'] ?? 0,
                'image_base64' => $product['imageBase64'] ?? null,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (! empty($insertData)) {
            SupplierProduct::insert($insertData);
        }
    }

    private function updateSupplierProducts(string $supplierSyncId, int $supplierId, array $products, int $userId): void
    {
        $now = now();
        $productSyncIds = [];
        $productsBySyncId = [];

        foreach ($products as $product) {
            $productSyncId = $product['sync_id'] ?? $product['id'] ?? null;
            if (! $productSyncId) {
                continue;
            }
            $productSyncIds[] = $productSyncId;
            $productsBySyncId[$productSyncId] = $product;
        }

        $existingProducts = SupplierProduct::whereIn('sync_id', $productSyncIds)
            ->where('supplier_id', $supplierSyncId)
            ->where('user_id', $userId)
            ->get()
            ->keyBy('sync_id');

        $insertData = [];

        foreach ($productsBySyncId as $productSyncId => $product) {
            $productData = [
                'name' => $product['name'] ?? '',
                'price' => $product['price'] ?? 0,
                'image_base64' => $product['imageBase64'] ?? null,
                'updated_at' => $now,
            ];

            if (isset($existingProducts[$productSyncId])) {
                $existingProducts[$productSyncId]->update($productData);
            } else {
                $insertData[] = [
                    'user_id' => $userId,
                    'supplier_id' => $supplierSyncId,
                    'sync_id' => $productSyncId,
                    'name' => $productData['name'],
                    'price' => $productData['price'],
                    'image_base64' => $productData['image_base64'],
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if (! empty($insertData)) {
            SupplierProduct::insert($insertData);
        }

        $incomingSyncIds = array_filter($productSyncIds);
        if (! empty($incomingSyncIds)) {
            SupplierProduct::where('supplier_id', $supplierSyncId)
                ->where('user_id', $userId)
                ->whereNotIn('sync_id', $incomingSyncIds)
                ->update(['deleted_at' => $now, 'status' => 'deleted']);
        }
    }
}
