<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Jobs;

use App\Models\MergeJob;
use App\Services\Sync\SyncOrchestratorService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SyncMergeJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public MergeJob $mergeJob,
    ) {}

    public function handle(SyncOrchestratorService $orchestrator): void
    {
        $this->mergeJob->update(['status' => 'processing']);

        try {
            $data = $this->mergeJob->data;
            $results = $orchestrator->merge($data, $this->mergeJob->user_id);

            foreach ($results['updated'] ?? [] as $entityType => &$items) {
                foreach ($items as &$item) {
                    unset($item['_original']);
                }
            }

            $this->mergeJob->update([
                'status' => 'completed',
                'results' => $results,
                'completed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $this->mergeJob->update([
                'status' => 'error',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
        }
    }
}
