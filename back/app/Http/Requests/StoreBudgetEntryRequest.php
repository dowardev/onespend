<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBudgetEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'name' => 'nullable|string|max:255',
            'payment_type' => 'required|string|in:cash,digital',
            'entry_type' => 'required|string|in:ingreso,egreso',
            'account_id' => 'nullable|integer|exists:accounts,id',
            'supplier_id' => 'nullable|string',
            'supplier_name' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:active,inactive',
            // LBDS-273: optional HH:MM time of day. The rule is deliberately
            // lenient (no `date_format`): the column is a MySQL TIME, the
            // model accessor normalizes whatever comes back to "HH:MM", and
            // a strict format here would reject the empty string a client
            // sends to clear the field.
            'time' => 'nullable|string|max:5',
            'groups' => 'nullable|array',
            'groups.*.account_id' => 'nullable|integer',
            'groups.*.amount' => 'required|numeric|min:0',
        ];
    }
}
