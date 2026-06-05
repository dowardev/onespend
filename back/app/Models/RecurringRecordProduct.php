<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecurringRecordProduct extends Model
{
    protected $table = 'recurring_record_products';

    protected $fillable = [
        'recurring_record_id', 'sync_id', 'supplier_product_id',
        'product_name', 'product_price', 'quantity',
    ];

    protected $casts = [
        'product_price' => 'decimal:2',
        'quantity' => 'integer',
    ];

    public function recurringRecord(): BelongsTo
    {
        return $this->belongsTo(RecurringRecord::class, 'recurring_record_id');
    }

    public function supplierProduct(): BelongsTo
    {
        return $this->belongsTo(SupplierProduct::class, 'supplier_product_id');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->whereHas('recurringRecord', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        });
    }
}
