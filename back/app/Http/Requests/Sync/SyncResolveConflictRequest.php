<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Requests\Sync;

use App\Http\Controllers\SyncController;
use Illuminate\Foundation\Http\FormRequest;

class SyncResolveConflictRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'entity_type' => ['required', 'string', 'in:'.implode(',', array_keys(SyncController::ENTITY_TYPES))],
            'entity_id' => 'required|string|max:100',
            'resolution' => 'required|in:server,client',
            'client_data' => 'required_if:resolution,client|array',
        ];
    }
}
