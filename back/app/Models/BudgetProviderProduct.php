<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BudgetProviderProduct extends Model
{
    use SoftDeletes;

    protected $table = 'budget_provider_products';

    protected $fillable = [
        'user_id',
        'sync_id',
        'budget_provider_id',
        'supplier_product_id',
        'product_name',
        'product_price',
        'quantity',
        'status',
        'deleted_at',
    ];

    protected $casts = [
        'product_price' => 'decimal:2',
        'quantity' => 'integer',
        'deleted_at' => 'datetime',
    ];

    protected $hidden = ['deleted_at'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function budgetProvider(): BelongsTo
    {
        return $this->belongsTo(BudgetProvider::class, 'budget_provider_id', 'sync_id');
    }

    public function supplierProduct(): BelongsTo
    {
        return $this->belongsTo(SupplierProduct::class, 'supplier_product_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByBudgetProvider($query, $budgetProviderId)
    {
        return $query->where('budget_provider_id', $budgetProviderId);
    }
}
