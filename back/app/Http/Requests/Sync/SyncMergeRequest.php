<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class SyncMergeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'data' => 'required|array',
            'data.account' => 'sometimes|array',
            'data.supplier' => 'sometimes|array',
            'data.supplier_product' => 'sometimes|array',
            'data.budget_entry' => 'sometimes|array',
            'data.budget_provider' => 'sometimes|array',
            'data.budget_provider_product' => 'sometimes|array',
            'data.recurring_record' => 'sometimes|array',
            'data.recurring_record_product' => 'sometimes|array',
        ];
    }

    public function messages(): array
    {
        return [
            'data.required' => 'El campo data es obligatorio.',
            'data.array' => 'El campo data debe ser un array.',
        ];
    }
}
