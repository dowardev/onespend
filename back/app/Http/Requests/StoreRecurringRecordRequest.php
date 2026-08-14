<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRecurringRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|string|in:cargo,provedor',
            'entry_type' => 'required|string|in:ingreso,egreso',
            'name' => 'required|string|max:255',
            'amount' => 'nullable|numeric|min:0',
            'account_id' => 'nullable|integer|exists:accounts,id',
            'repeat_frequency' => 'required|string|in:day,week,month,year',
            'repeat_interval' => 'nullable|integer|min:1',
            'repeat_days' => 'nullable|array',
            'repeat_month_day' => 'nullable|integer|min:1|max:31',
            'repeat_month_weekday_mode' => 'nullable|boolean',
            'repeat_month_weekday' => 'nullable|integer|min:0|max:6',
            'repeat_month_weekday_ordinal' => 'nullable|integer|min:1|max:5',
            'repeat_year_month' => 'nullable|integer|min:1|max:12',
            'repeat_year_day' => 'nullable|integer|min:1|max:31',
            'time' => 'nullable|string',
            'auto_insert' => 'nullable|boolean',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'estimated' => 'nullable|numeric|min:0',
            'items' => 'nullable|array',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|in:active,paused,inactive',
            'products' => 'nullable|array',
            'products.*.supplier_product_id' => 'nullable|integer',
            'products.*.product_name' => 'required_without:products.*.supplier_product_id|string|max:255',
            'products.*.product_price' => 'required|numeric|min:0',
            'products.*.quantity' => 'required|integer|min:1',
        ];
    }
}
