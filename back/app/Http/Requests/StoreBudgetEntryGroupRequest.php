<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBudgetEntryGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'budget_entry_id' => 'required|integer|exists:budget_entries,id',
            'account_id' => 'nullable|integer|exists:accounts,id',
            'amount' => 'required|numeric|min:0',
        ];
    }
}
