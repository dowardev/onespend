<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Attachment extends Model
{
    use SoftDeletes;

    protected $table = 'attachments';

    public const ENTITY_TYPE_ENTRIES = 'entries';
    // Futuro: public const ENTITY_TYPE_PROVIDERS = 'providers';

    protected $fillable = [
        'user_id',
        'sync_id',
        'entity_type',
        'name',
        'path',
        'mime_type',
        'size',
        'budget_entry_sync_id',
    ];

    protected $casts = [
        'size' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $hidden = [
        'user_id',
        'path',
        'deleted_at',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function budgetEntry(): BelongsTo
    {
        return $this->belongsTo(BudgetEntry::class, 'budget_entry_sync_id', 'sync_id');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByEntry($query, $entrySyncId)
    {
        return $query->where('budget_entry_sync_id', $entrySyncId);
    }

    public function deleteFile(): void
    {
        if ($this->path && Storage::disk('local')->exists($this->path)) {
            Storage::disk('local')->delete($this->path);
        }
    }

    public function getDownloadUrl(): string
    {
        return url("/api/attachments/{$this->id}/download");
    }
}
