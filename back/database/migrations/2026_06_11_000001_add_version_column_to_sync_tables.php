<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'accounts',
        'budget_entries',
        'budget_entry_groups',
        'budget_providers',
        'budget_provider_products',
        'recurring_records',
        'recurring_record_products',
        'suppliers',
        'supplier_products',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasColumn($table, 'version')) {
                continue;
            }
            Schema::table($table, function (Blueprint $t) {
                $t->unsignedBigInteger('version')->default(1)->after('updated_at');
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (! Schema::hasColumn($table, 'version')) {
                continue;
            }
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('version');
            });
        }
    }
};
