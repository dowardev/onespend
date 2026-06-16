<?php

namespace App\Services\Sync\Processors;

use App\Models\BudgetProviderProduct;
use App\Services\Sync\Processors\Concerns\ResolvesSupplierProductId;

class BudgetProviderProductProcessor extends AbstractEntityProcessor
{
    use ResolvesSupplierProductId;

    protected function getModel(): string
    {
        return BudgetProviderProduct::class;
    }

    protected function getEntityName(): string
    {
        return 'budget_provider_product';
    }

    public function canProcess(string $entityType): bool
    {
        return $entityType === 'budget_provider_product';
    }

    public function getEntityType(): string
    {
        return 'budget_provider_product';
    }

    protected function preprocessData(array $item, int $userId): array
    {
        $item = $this->resolveSupplierProductFields($item, $userId);
        unset($item['budgetProviderId']);
        return $item;
    }
}