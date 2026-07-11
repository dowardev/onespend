<?php

namespace App\Services\Sync\Processors;

use App\Models\SupplierProduct;

class SupplierProductProcessor extends AbstractEntityProcessor
{
    protected function getModel(): string
    {
        return SupplierProduct::class;
    }

    protected function getEntityName(): string
    {
        return 'supplier_product';
    }
}
