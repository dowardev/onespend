<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class RecurringRecordProduct extends Model
{
    use SoftDeletes;

    protected $table = 'recurring_record_products';

    protected $fillable = [
        'user_id', 'recurring_record_id', 'sync_id', 'supplier_product_id',
        'product_name', 'product_price', 'quantity', 'status',
    ];

    protected $casts = [
        'product_price' => 'decimal:2',
        'quantity' => 'integer',
        'deleted_at' => 'datetime',
    ];

    protected $hidden = ['deleted_at'];

    public function recurringRecord(): BelongsTo
    {
        return $this->belongsTo(RecurringRecord::class, 'recurring_record_id');
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
}
