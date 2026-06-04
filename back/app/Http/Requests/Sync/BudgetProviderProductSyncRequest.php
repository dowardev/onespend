<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class BudgetProviderProductSyncRequest extends FormRequest
{
    public static function validationRules(): array
    {
        return [
            'budget_provider_id' => 'required|string|max:100',
            'supplier_product_id' => 'nullable|integer|exists:supplier_products,id',
            'product_name' => 'required|string|max:255',
            'product_price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0',
            'status' => 'sometimes|in:active,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }

    public function rules(): array
    {
        return self::validationRules();
    }
}
