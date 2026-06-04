<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class SupplierProductSyncRequest extends FormRequest
{
    public static function validationRules(): array
    {
        return [
            'supplier_id' => 'required|string|max:100',
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'image_base64' => 'nullable|string|max:5242880',
            'status' => 'sometimes|in:active,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }

    public function rules(): array
    {
        return self::validationRules();
    }
}
