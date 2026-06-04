<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class RecurringRecordProductSyncRequest extends FormRequest
{
    public static function validationRules(): array
    {
        return [
            'recurring_record_id' => 'required|integer|exists:recurring_records,id',
            'supplier_product_id' => 'nullable|integer|exists:supplier_products,id',
            'product_name' => 'required|string|max:255',
            'product_price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0',
        ];
    }

    public function rules(): array
    {
        return self::validationRules();
    }
}
