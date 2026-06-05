<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'initial_balance' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:active,inactive',
        ];
    }
}
