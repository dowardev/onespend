<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class SyncMergeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'data' => 'required|array',
            'data.account' => 'sometimes|array|max:100',
            'data.supplier' => 'sometimes|array|max:100',
            'data.supplier_product' => 'sometimes|array|max:100',
            'data.budget_entry' => 'sometimes|array|max:100',
            'data.budget_provider' => 'sometimes|array|max:100',
            'data.budget_provider_product' => 'sometimes|array|max:100',
            'data.recurring_record' => 'sometimes|array|max:100',
            'data.recurring_record_product' => 'sometimes|array|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'data.required' => 'El campo data es obligatorio.',
            'data.array' => 'El campo data debe ser un array.',
        ];
    }
}
