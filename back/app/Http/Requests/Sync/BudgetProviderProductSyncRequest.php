<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class BudgetProviderProductSyncRequest extends FormRequest
{
    public static function validationRules(): array
    {
        return [
            'budget_provider_id' => 'required|string|max:255',
            'supplier_product_id' => 'nullable|string|max:255',
            'product_name' => 'required|string|max:255',
            'product_price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0',
            'status' => 'sometimes|in:active,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }

    public function rules(): array
    {
        return self::validationRules();
    }
}
