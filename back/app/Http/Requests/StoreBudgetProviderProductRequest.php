<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBudgetProviderProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'budget_provider_id' => 'required|string|exists:budget_providers,sync_id',
            'supplier_product_id' => 'nullable|integer|exists:supplier_products,id',
            'product_name' => 'required_without:supplier_product_id|string|max:255',
            'product_price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:1',
            'status' => 'nullable|string|in:active,inactive',
        ];
    }
}
