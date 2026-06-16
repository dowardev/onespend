<?php

namespace App\Console\Commands;

use App\Models\SyncMetadata;
use Illuminate\Console\Command;

class CleanupSyncMetadata extends Command
{
    protected $signature = 'syncmetadata:cleanup {--days=30 : Delete synced/resolved records older than this many days}';

    protected $description = 'Clean up old SyncMetadata records';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->subDays($days);

        $deleted = SyncMetadata::whereIn('sync_status', ['synced', 'resolved'])
            ->where('server_updated_at', '<', $cutoff)
            ->delete();

        $this->info("Deleted {$deleted} old SyncMetadata records (older than {$days} days).");

        return self::SUCCESS;
    }
}
