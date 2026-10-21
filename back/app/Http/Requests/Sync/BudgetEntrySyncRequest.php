<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class BudgetEntrySyncRequest extends FormRequest
{
    public static function validationRules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric',
            'date' => 'required|date',
            'payment_type' => 'required|in:cash,digital',
            'entry_type' => 'required|in:ingreso,egreso',
            'category' => 'nullable|string|max:100',
            // LBDS-275: notes thread end-to-end. Nullable free-form text;
            // the front sends it as `notes` (camelCase) and the API name
            // is also `notes`, so no preprocessing is needed in the
            // BudgetEntryProcessor.
            'notes' => 'nullable|string|max:2000',
            // LBDS-273: optional HH:MM mirror of recurring `time`. The rule
            // is deliberately lenient (no `date_format`): a strict format
            // would reject the empty string a client sends to clear the
            // field, and the model's accessor normalizes whatever comes
            // back to "HH:MM" anyway.
            //
            // NOTE: this class is not wired into any route — the live sync
            // push is validated by `StoreBudgetEntryRequest`. The rule is
            // kept here for parity but currently never runs.
            'time' => 'nullable|string|max:5',
            'account_id' => 'nullable|string|max:100',
            'supplier_id' => 'nullable|string|max:100',
            'supplier_name' => 'nullable|string|max:255',
            '_from_recurring_id' => 'nullable|string|max:100',
            'status' => 'sometimes|in:active,deleted',
            'deleted_at' => 'nullable|date',
            'groups' => 'nullable|array',
            'groups.*.account_id' => 'nullable|string|max:100',
            'groups.*.amount' => 'required_with:groups|numeric',
        ];
    }

    public function rules(): array
    {
        return self::validationRules();
    }
}
