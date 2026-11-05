<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Console\Commands;

use App\Models\SyncMetadata;
use Illuminate\Console\Command;

class CleanupSyncMetadata extends Command
{
    protected $signature = 'syncmetadata:cleanup {--days=30 : Delete synced/resolved records older than this many days}';

    protected $description = 'Clean up the SyncMetadata of the records the user deleted';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->subDays($days);

        // GitLab #19: this table holds the merge base (base_data), so the
        // metadata of a row that still exists must survive: dropping it would
        // leave the next push of that row without a base, and the server
        // would report a conflict it cannot explain. Only the metadata of the
        // rows the user deleted is disposable.
        $deleted = SyncMetadata::where('sync_status', 'deleted')
            ->where('server_updated_at', '<', $cutoff)
            ->delete();

        $this->info("Deleted {$deleted} old SyncMetadata records (older than {$days} days).");

        return self::SUCCESS;
    }
}
