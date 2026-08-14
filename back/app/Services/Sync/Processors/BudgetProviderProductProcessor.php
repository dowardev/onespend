<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Services\Sync\Processors;

use App\Models\BudgetProviderProduct;

class BudgetProviderProductProcessor extends AbstractEntityProcessor
{
    protected function getModel(): string
    {
        return BudgetProviderProduct::class;
    }

    protected function getEntityName(): string
    {
        return 'budget_provider_product';
    }

    public function preprocessData(array $item, int $userId): array
    {
        $item = $this->resolveForeignKeys($item, $userId);

        if (isset($item['productName'])) {
            $item['product_name'] = $item['productName'];
        }
        if (isset($item['productPrice'])) {
            $item['product_price'] = $item['productPrice'];
        }

        unset($item['budgetProviderId'], $item['productName'], $item['productPrice']);

        return $item;
    }
}
