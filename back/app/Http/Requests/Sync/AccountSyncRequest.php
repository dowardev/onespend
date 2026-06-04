<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class AccountSyncRequest extends FormRequest
{
    public static function validationRules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'initial_balance' => 'required|numeric|min:0',
            'status' => 'sometimes|in:active,archived,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }

    public function rules(): array
    {
        return self::validationRules();
    }
}
