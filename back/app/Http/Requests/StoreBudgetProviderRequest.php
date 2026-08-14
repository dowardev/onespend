<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBudgetProviderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'estimated' => 'nullable|numeric|min:0',
            'account_id' => 'nullable|integer|exists:accounts,id',
            'notes' => 'nullable|string',
            'visited' => 'nullable|boolean',
            'status' => 'nullable|string|in:active,inactive',
            'products' => 'nullable|array',
            'products.*.supplier_product_id' => 'nullable|integer',
            'products.*.product_name' => 'required_without:products.*.supplier_product_id|string',
            'products.*.product_price' => 'required|numeric|min:0',
            'products.*.quantity' => 'required|integer|min:1',
        ];
    }
}
