<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetEntryGroup extends Model
{
    protected $table = 'budget_entry_groups';

    protected $fillable = [
        'budget_entry_id',
        'account_id',
        'amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function budgetEntry(): BelongsTo
    {
        return $this->belongsTo(BudgetEntry::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
