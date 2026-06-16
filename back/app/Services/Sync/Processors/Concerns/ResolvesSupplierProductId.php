<?php

namespace App\Services\Sync\Processors\Concerns;

trait ResolvesSupplierProductId
{
    protected function resolveSupplierProductFields(array $item, int $userId): array
    {
        $resolver = $this->idResolver;

        if (isset($item['supplierProductId'])) {
            $item['supplier_product_id'] = $item['supplierProductId'];
        }

        $spId = $item['supplier_product_id'] ?? null;
        if ($spId !== null && !is_numeric($spId)) {
            $resolved = $resolver->resolve('supplier_product', $spId, $userId);
            if ($resolved !== null) {
                $item['supplier_product_id'] = $resolved;
            }
        } elseif ($spId !== null && is_numeric($spId)) {
            $item['supplier_product_id'] = (int) $spId;
        }

        unset($item['supplierProductId']);

        if (isset($item['productName'])) {
            $item['product_name'] = $item['productName'];
        }
        if (isset($item['productPrice'])) {
            $item['product_price'] = $item['productPrice'];
        }

        unset($item['productName'], $item['productPrice']);

        return $item;
    }
}