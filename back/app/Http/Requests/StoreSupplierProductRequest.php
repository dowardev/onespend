<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => 'required|string|exists:suppliers,sync_id',
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'image_base64' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
        ];
    }
}
