<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'accounts',
            'suppliers',
            'supplier_products',
            'budget_entries',
            'budget_providers',
            'budget_provider_products',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->unique(['sync_id', 'user_id'], "uq_{$table}_sync_id_user_id");
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'accounts',
            'suppliers',
            'supplier_products',
            'budget_entries',
            'budget_providers',
            'budget_provider_products',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropUnique("uq_{$table}_sync_id_user_id");
            });
        }
    }
};
