<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MergeJob extends Model
{
    protected $fillable = [
        'user_id',
        'status',
        'data',
        'results',
        'error_message',
        'completed_at',
    ];

    protected $casts = [
        'data' => 'array',
        'results' => 'array',
        'completed_at' => 'datetime',
    ];
}
