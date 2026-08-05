<?php

namespace App\Services;

use App\Models\Account;
use App\Models\BudgetProvider;
use App\Models\RecurringRecord;
use App\Models\Supplier;
use App\Models\SupplierProduct;

class SyncIdResolver
{
    private array $cache = [];

    public function resolve(string $entityType, ?string $syncId, ?int $userId = null): ?int
    {
        if ($syncId === null || $syncId === '') {
            return null;
        }

        $cacheKey = "{$entityType}:{$syncId}:".($userId ?? 'global');

        if (array_key_exists($cacheKey, $this->cache)) {
            return $this->cache[$cacheKey];
        }

        $query = match ($entityType) {
            'account' => Account::where('sync_id', $syncId),
            'supplier_product' => SupplierProduct::where('sync_id', $syncId),
            'recurring_record' => RecurringRecord::where('sync_id', $syncId),
            'budget_provider' => BudgetProvider::where('sync_id', $syncId),
            'supplier' => Supplier::where('sync_id', $syncId),
            default => throw new \InvalidArgumentException("Unknown entity type for SyncIdResolver: {$entityType}"),
        };

        if ($userId !== null && in_array($entityType, ['account', 'recurring_record', 'budget_provider', 'supplier', 'supplier_product'], true)) {
            $query->where('user_id', $userId);
        }

        $id = $query->value('id');

        $this->cache[$cacheKey] = $id ? (int) $id : null;

        return $this->cache[$cacheKey];
    }

    public function resolveToInt(mixed $value, string $entityType, ?int $userId = null): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        return $this->resolve($entityType, (string) $value, $userId);
    }

    public function resolveAccountId(mixed $accountId, ?int $userId = null): ?int
    {
        return $this->resolveToInt($accountId, 'account', $userId);
    }

    public function resolveSupplierProductId(mixed $supplierProductId, ?int $userId = null): ?int
    {
        return $this->resolveToInt($supplierProductId, 'supplier_product', $userId);
    }

    public function resolveRecurringRecordId(mixed $recurringRecordId, ?int $userId = null): ?int
    {
        return $this->resolveToInt($recurringRecordId, 'recurring_record', $userId);
    }

    public function resolveBatch(string $entityType, array $syncIds, ?int $userId = null): array
    {
        $syncIds = array_filter(array_unique($syncIds));
        if (empty($syncIds)) {
            return [];
        }

        $results = [];
        $uncachedIds = [];

        foreach ($syncIds as $syncId) {
            $cacheKey = "{$entityType}:{$syncId}:".($userId ?? 'global');
            if (array_key_exists($cacheKey, $this->cache)) {
                if ($this->cache[$cacheKey] !== null) {
                    $results[$syncId] = $this->cache[$cacheKey];
                }
            } else {
                $uncachedIds[] = $syncId;
            }
        }

        if (! empty($uncachedIds)) {
            $query = match ($entityType) {
                'account' => Account::whereIn('sync_id', $uncachedIds),
                'supplier_product' => SupplierProduct::whereIn('sync_id', $uncachedIds),
                'recurring_record' => RecurringRecord::whereIn('sync_id', $uncachedIds),
                'budget_provider' => BudgetProvider::whereIn('sync_id', $uncachedIds),
                'supplier' => Supplier::whereIn('sync_id', $uncachedIds),
                default => throw new \InvalidArgumentException("Unknown entity type for SyncIdResolver: {$entityType}"),
            };

            if ($userId !== null && in_array($entityType, ['account', 'recurring_record', 'budget_provider', 'supplier', 'supplier_product'], true)) {
                $query->where('user_id', $userId);
            }

            $rows = $query->get(['id', 'sync_id']);
            foreach ($rows as $row) {
                $cacheKey = "{$entityType}:{$row->sync_id}:".($userId ?? 'global');
                $this->cache[$cacheKey] = (int) $row->id;
                $results[$row->sync_id] = (int) $row->id;
            }

            foreach ($uncachedIds as $uncachedId) {
                $cacheKey = "{$entityType}:{$uncachedId}:".($userId ?? 'global');
                if (! array_key_exists($cacheKey, $this->cache)) {
                    $this->cache[$cacheKey] = null;
                }
            }
        }

        return $results;
    }

    public function clear(): void
    {
        $this->cache = [];
    }
}
