<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

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
