<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BudgetProvider extends Model
{
    use SoftDeletes;

    protected $table = 'budget_providers';

    protected $fillable = [
        'user_id',
        'sync_id',
        'date',
        'name',
        'estimated',
        'account_id',
        'efectivo',
        'tarjeta',
        'credito',
        'product_quantities',
        'notes',
        'visited',
        '_supplier_id',
        '_supplier_name',
        'status',
        'deleted_at',
    ];

    protected $casts = [
        'date' => 'date',
        'estimated' => 'decimal:2',
        'efectivo' => 'decimal:2',
        'tarjeta' => 'decimal:2',
        'credito' => 'decimal:2',
        'product_quantities' => 'array',
        'visited' => 'boolean',
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

    public function scopeByDate($query, $date)
    {
        return $query->where('date', $date);
    }
}
