<?php

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
