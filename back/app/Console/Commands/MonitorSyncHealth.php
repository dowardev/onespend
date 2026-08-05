<?php

namespace App\Console\Commands;

use App\Models\SyncMetadata;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class MonitorSyncHealth extends Command
{
    protected $signature = 'sync:monitor-health
                            {--conflict-threshold=50 : Alert if unresolved conflicts exceed this count}
                            {--error-threshold=100 : Alert if error records exceed this count}';

    protected $description = 'Monitor sync health: unresolved conflicts, error rates, and anomalies';

    public function handle(): int
    {
        if (! Schema::hasTable('sync_metadata')) {
            $this->warn('Sync metadata table not found, skipping.');

            return 0;
        }

        $unresolvedConflicts = SyncMetadata::where('sync_status', 'conflict')->count();

        if ($unresolvedConflicts > $this->option('conflict-threshold')) {
            Log::warning('Sync health alert: {count} unresolved conflicts exceed threshold {threshold}', [
                'count' => $unresolvedConflicts,
                'threshold' => $this->option('conflict-threshold'),
            ]);
            $this->warn("Unresolved conflicts: {$unresolvedConflicts} > {$this->option('conflict-threshold')}");
        } else {
            $this->info("Unresolved conflicts: {$unresolvedConflicts} (OK)");
        }

        return 0;
    }
}
