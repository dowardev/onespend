<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $tables = [
        'budget_entries',
        'budget_entry_groups',
        'budget_providers',
        'budget_provider_products',
        'accounts',
        'suppliers',
        'supplier_products',
        'recurring_records',
        'recurring_record_products',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            DB::statement("ALTER TABLE {$table} MODIFY updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            DB::statement("ALTER TABLE {$table} MODIFY updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
        }
    }
};
