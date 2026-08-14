<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'accounts' => 'idx_accounts_updated_at',
            'budget_entries' => 'idx_budget_entries_updated_at',
            'budget_providers' => 'idx_budget_providers_updated_at',
            'suppliers' => 'idx_suppliers_updated_at',
            'recurring_records' => 'idx_recurring_records_updated_at',
            'supplier_products' => 'idx_supplier_products_updated_at',
            'budget_provider_products' => 'idx_budget_provider_products_updated_at',
        ];
        foreach ($tables as $table => $indexName) {
            Schema::table($table, function (Blueprint $t) use ($indexName) {
                $t->index(['user_id', 'updated_at', 'sync_id'], $indexName);
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'accounts' => 'idx_accounts_updated_at',
            'budget_entries' => 'idx_budget_entries_updated_at',
            'budget_providers' => 'idx_budget_providers_updated_at',
            'suppliers' => 'idx_suppliers_updated_at',
            'recurring_records' => 'idx_recurring_records_updated_at',
            'supplier_products' => 'idx_supplier_products_updated_at',
            'budget_provider_products' => 'idx_budget_provider_products_updated_at',
        ];
        foreach ($tables as $table => $indexName) {
            Schema::table($table, function (Blueprint $t) use ($indexName) {
                $t->dropIndex($indexName);
            });
        }
    }
};
