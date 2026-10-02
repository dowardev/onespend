<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Providers;

use App\Repositories\SyncMetadataRepository;
use App\Services\Sync\ConflictDetector;
use App\Services\Sync\ForeignKeyResolver;
use App\Services\Sync\Processors\AccountProcessor;
use App\Services\Sync\Processors\AttachmentProcessor;
use App\Services\Sync\Processors\BudgetEntryProcessor;
use App\Services\Sync\Processors\BudgetProviderProcessor;
use App\Services\Sync\Processors\BudgetProviderProductProcessor;
use App\Services\Sync\Processors\RecurringRecordProcessor;
use App\Services\Sync\Processors\RecurringRecordProductProcessor;
use App\Services\Sync\Processors\SupplierProcessor;
use App\Services\Sync\Processors\SupplierProductProcessor;
use App\Services\Sync\SyncOrchestratorService;
use App\Services\SyncIdResolver;
use Illuminate\Support\ServiceProvider;

class SyncServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SyncIdResolver::class);
        $this->app->singleton(ConflictDetector::class);
        $this->app->singleton(ForeignKeyResolver::class);
        $this->app->singleton(SyncMetadataRepository::class);

        $this->app->singleton(SyncOrchestratorService::class, function ($app) {
            $orchestrator = new SyncOrchestratorService(
                $app->make(SyncIdResolver::class),
                $app->make(ForeignKeyResolver::class),
            );

            $orchestrator->registerProcessor('account', $app->make(AccountProcessor::class));
            $orchestrator->registerProcessor('budget_entry', $app->make(BudgetEntryProcessor::class));
            $orchestrator->registerProcessor('budget_provider', $app->make(BudgetProviderProcessor::class));
            $orchestrator->registerProcessor('budget_provider_product', $app->make(BudgetProviderProductProcessor::class));
            $orchestrator->registerProcessor('supplier', $app->make(SupplierProcessor::class));
            $orchestrator->registerProcessor('supplier_product', $app->make(SupplierProductProcessor::class));
            $orchestrator->registerProcessor('recurring_record', $app->make(RecurringRecordProcessor::class));
            $orchestrator->registerProcessor('recurring_record_product', $app->make(RecurringRecordProductProcessor::class));
            // LBDS-280: routes attachment deletes through the queue. The
            // processor uses postprocessDelete to remove the file from
            // storage while the row is tombstoned (consistent with the
            // rest of the entity processors).
            $orchestrator->registerProcessor('attachment', $app->make(AttachmentProcessor::class));

            return $orchestrator;
        });
    }

    public function boot(): void {}
}
