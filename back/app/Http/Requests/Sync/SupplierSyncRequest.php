<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class SupplierSyncRequest extends FormRequest
{
    public static function validationRules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'deleted_at' => 'nullable|date',
        ];
    }

    public function rules(): array
    {
        return self::validationRules();
    }
}
