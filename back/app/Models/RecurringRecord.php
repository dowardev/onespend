<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Support\CanonicalTime;

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
        // LBDS-273 (GitLab #13): mirror the `category` column that
        // budget_entries already has. Stores the category id (string, not
        // FK) so the contract stays device-local; the Dexie `entryCategories`
        // table is the source of truth, the sync payload only carries the
        // id. Nullable so legacy rows and the "no category" UX continue to
        // work and so the auto-inserted entry can opt-out by inheritance.
        'category',
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

    /**
     * GitLab #17 (P1): the `time` column is a MySQL TIME, so the database
     * stores "14:30:00" while the wire format (and the local row) is the
     * canonical "HH:MM". Without this accessor the API handed "14:30:00"
     * back and the client stored it verbatim, which then disagreed with
     * the field hash the server computes over the "HH:MM" the client sent.
     *
     * Same contract as `BudgetEntry::getTimeAttribute`: only the getter is
     * defined, so the raw column value is still what the database stores.
     */
    public function getTimeAttribute($value): ?string
    {
        return CanonicalTime::normalize($value);
    }

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
