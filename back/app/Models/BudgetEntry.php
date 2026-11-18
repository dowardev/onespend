<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Models;

use App\Support\CanonicalTime;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class BudgetEntry extends Model
{
    use SoftDeletes;

    protected $table = 'budget_entries';

    protected $fillable = [
        'user_id',
        'sync_id',
        '_from_recurring_id',
        'name',
        'amount',
        'date',
        'payment_type',
        'entry_type',
        'category',
        'notes',
        // LBDS-273 (GitLab #13): optional HH:MM mirror of the recurring
        // `time` column. Nullable so legacy rows and the daily "no specific
        // time" UX continue to work; kept as string in $casts to match
        // RecurringRecord::$casts and to avoid timezone juggling when the
        // helper `front/src/utils/entryTimestamp.ts` rebuilds the instant.
        'time',
        'account_id',
        'supplier_id',
        'supplier_name',
        'status',
        'deleted_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date',
        'time' => 'string',
        'deleted_at' => 'datetime',
    ];

    protected $hidden = ['deleted_at'];

    /**
     * LBDS-273 (GitLab #13): normalize the stored time to "HH:MM".
     *
     * The column is a MySQL TIME, so the database hands back "HH:MM:SS"
     * and zero-pads the hour ("9:00" comes back as "09:00:00"). Two
     * things depend on the value being the canonical "HH:MM":
     *
     * 1. The sync payload. The client stores and sends "HH:MM" on the
     *    local row, and the conflict detector compares the hash of the
     *    client's payload against the hash of the stored row. If the
     *    client sent "9:00" and the server hashed "09:00", the two
     *    hashes would differ and every push of that row would raise a
     *    phantom conflict.
     * 2. The field hash used for conflict detection, for the same reason.
     *
     * A value that is not a usable time of day returns null instead of a
     * half-parsed string, so a malformed payload can never be read back as
     * a bogus time.
     *
     * Only the getter is defined: the raw value is still what the column
     * stores, and writing "14:30" or "14:30:00" both land as the same
     * MySQL TIME.
     */
    public function getTimeAttribute($value): ?string
    {
        // GitLab #17 (P1): the rule lives in `App\Support\CanonicalTime`
        // so the budget entries and the recurring records cannot drift
        // apart from the client's `normalizeTime`.
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

    public function groups(): HasMany
    {
        return $this->hasMany(BudgetEntryGroup::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByDate($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    public function scopeByType($query, $entryType)
    {
        return $query->where('entry_type', $entryType);
    }
}
