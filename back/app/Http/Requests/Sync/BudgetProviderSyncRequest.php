<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class BudgetProviderSyncRequest extends FormRequest
{
    public static function validationRules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'estimated' => 'required|numeric',
            'account_id' => 'nullable|string|max:100',
            'efectivo' => 'nullable|numeric|min:0',
            'tarjeta' => 'nullable|numeric|min:0',
            'credito' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:65535',
            'visited' => 'nullable|boolean',
            '_supplier_id' => 'nullable|string|max:100',
            '_supplier_name' => 'nullable|string|max:255',
            '_from_recurring_id' => 'nullable|string|max:100',
            'status' => 'sometimes|in:active,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }

    public function rules(): array
    {
        return self::validationRules();
    }
}
