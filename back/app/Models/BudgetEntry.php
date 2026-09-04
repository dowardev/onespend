<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Models;

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
        'account_id',
        'supplier_id',
        'supplier_name',
        'status',
        'deleted_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date',
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
