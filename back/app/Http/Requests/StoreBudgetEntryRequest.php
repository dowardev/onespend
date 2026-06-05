<?php

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
            'groups' => 'nullable|array',
            'groups.*.account_id' => 'nullable|integer',
            'groups.*.amount' => 'required|numeric|min:0',
        ];
    }
}
