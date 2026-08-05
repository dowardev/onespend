<?php

namespace App\Http\Requests\Sync;

use App\Http\Controllers\SyncController;
use Illuminate\Foundation\Http\FormRequest;

class SyncResolveConflictsBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'resolutions' => 'required|array|min:1|max:50',
            'resolutions.*.entity_type' => ['required', 'string', 'in:'.implode(',', array_keys(SyncController::ENTITY_TYPES))],
            'resolutions.*.entity_id' => 'required|string|max:100',
            'resolutions.*.resolution' => 'required|in:server,client',
            'resolutions.*.client_data' => 'array',
        ];
    }
}
