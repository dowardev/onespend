<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Services\Sync\Processors;

use App\Models\BudgetProvider;
use App\Models\BudgetProviderProduct;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BudgetProviderProcessor extends AbstractEntityProcessor
{
    protected function getModel(): string
    {
        return BudgetProvider::class;
    }

    protected function getEntityName(): string
    {
        return 'budget_provider';
    }

    public function preprocessData(array $item, int $userId): array
    {
        $item = $this->resolveForeignKeys($item, $userId);

        if (isset($item['supplierName'])) {
            $item['_supplier_name'] = $item['supplierName'];
        }

        unset($item['accountId'], $item['supplierId'], $item['supplierName']);

        return $item;
    }

    public function create(array $items, int $userId): array
    {
        if (empty($items)) {
            return [];
        }

        $result = [];
        $productsToCreate = [];

        $modelClass = $this->getModel();
        $now = now();
        $insertData = [];

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
                    $this->upsertProviderProducts($record->sync_id, $record->id, $productsToCreate[$record->sync_id], $userId);
                }
            }

            $this->bulkUpdateSyncMetadata($syncIds, 'synced', $userId);
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
                unset($data['id'], $data['sync_id'], $data['user_id'], $data['created_at'],
                    $data['products'], $data['_deleted']);
                $data['updated_at'] = now();
                $filteredDataBySyncId[$syncId] = $data;

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
                    $incomingSyncIds = array_filter(array_map(fn ($p) => $p['sync_id'] ?? $p['id'] ?? null, $products));
                    BudgetProviderProduct::where('budget_provider_id', $syncId)
                        ->where('user_id', $userId)
                        ->when(! empty($incomingSyncIds), fn ($q) => $q->whereNotIn('sync_id', $incomingSyncIds))
                        ->update(['deleted_at' => now(), 'status' => 'deleted']);

                    $productsBySyncId[$syncId] = $products;
                }

                $syncIds[] = $syncId;
                $updated[] = ['sync_id' => $syncId];
            }

            if (! empty($productsBySyncId)) {
                $providerSyncIds = array_keys($productsBySyncId);
                $providers = $modelClass::whereIn('sync_id', $providerSyncIds)
                    ->where('user_id', $userId)
                    ->get(['id', 'sync_id'])
                    ->keyBy('sync_id');

                foreach ($productsBySyncId as $syncId => $products) {
                    if (isset($providers[$syncId])) {
                        $this->upsertProviderProducts($syncId, $providers[$syncId]->id, $products, $userId);
                    }
                }
            }

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

        if (! empty($errors)) {
            Log::warning("Optimistic lock conflicts in batch update for {$this->getEntityName()}", [
                'conflicts' => $errors,
            ]);
        }

        return $updated;
    }

    private function upsertProviderProducts(string $providerSyncId, int $providerId, array $products, int $userId): void
    {
        $now = now();

        $spSyncIds = array_filter(array_map(fn ($p) => $p['supplier_product_id'] ?? $p['supplierProductId'] ?? null, $products));
        $spIdMap = ! empty($spSyncIds) ? $this->idResolver->resolveBatch('supplier_product', $spSyncIds, $userId) : [];

        $upsertData = [];
        $productSyncIds = [];

        foreach ($products as $product) {
            $productSyncId = $product['sync_id'] ?? $product['id'] ?? uniqid('bpp_', true);
            $spId = $product['supplier_product_id'] ?? $product['supplierProductId'] ?? null;
            if ($spId && isset($spIdMap[$spId])) {
                $spId = $spIdMap[$spId];
            } elseif ($spId && is_numeric($spId)) {
                $spId = (int) $spId;
            }

            $upsertData[] = [
                'sync_id' => $productSyncId,
                'user_id' => $userId,
                'budget_provider_id' => $providerSyncId,
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
            BudgetProviderProduct::upsert(
                $upsertData,
                ['sync_id', 'user_id'],
                ['budget_provider_id', 'supplier_product_id', 'product_name', 'product_price', 'quantity', 'status', 'deleted_at', 'updated_at']
            );
            $fieldHashes = array_combine($productSyncIds, array_map(fn ($item) => $this->computeFieldHash($item), $upsertData));
            $baseDataMap = array_fill_keys($productSyncIds, []);
            $this->bulkUpdateSyncMetadata($productSyncIds, 'synced', $userId, [], $fieldHashes, $baseDataMap);
        }
    }
}
