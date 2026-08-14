<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RecurringRecord extends Model
{
    use SoftDeletes;

    protected $table = 'recurring_records';

    protected $fillable = [
        'user_id', 'sync_id', 'type', 'entry_type', 'name', 'amount',
        'account_id', 'repeat_frequency', 'repeat_interval', 'repeat_days',
        'repeat_month_day', 'repeat_month_weekday_mode', 'repeat_month_weekday',
        'repeat_month_weekday_ordinal', 'repeat_year_month', 'repeat_year_day',
        'time', 'auto_insert', 'start_date', 'end_date', 'estimated',
        'items', 'notes', 'status', 'deleted_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'estimated' => 'decimal:2',
        'repeat_days' => 'array',
        'items' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
        'time' => 'string',
        'auto_insert' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    protected $hidden = ['deleted_at'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(RecurringRecordProduct::class, 'recurring_record_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}
