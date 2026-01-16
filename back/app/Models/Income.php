<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Income extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'sync_id',
        'name',
        'amount',
        'date',
        'payment_type',
        'entry_type',
        'account_id',
        'groups',
        '_from_provider_group_id',
        '_provider_name',
        'status',
        'deleted_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date',
        'groups' => 'array',
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
