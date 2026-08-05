<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncMetadata extends Model
{
    protected $fillable = [
        'entity_type',
        'entity_id',
        'sync_status',
        'last_synced_at',
        'server_updated_at',
        'conflict_data',
        'field_hash',
        'base_data',
        'dedup_hash',
        'user_id',
    ];

    protected $casts = [
        'last_synced_at' => 'datetime',
        'server_updated_at' => 'datetime',
        'conflict_data' => 'array',
        'base_data' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopePending($query)
    {
        return $query->where('sync_status', 'pending');
    }

    public function scopeConflicted($query)
    {
        return $query->where('sync_status', 'conflict');
    }

    public function scopeByEntity($query, $entityType, $entityId)
    {
        return $query->where('entity_type', $entityType)->where('entity_id', $entityId);
    }

    public function scopeByEntityType($query, string $entityType): void
    {
        $query->where('entity_type', $entityType);
    }

    public function scopeResolved($query): void
    {
        $query->where('sync_status', 'resolved');
    }
}
