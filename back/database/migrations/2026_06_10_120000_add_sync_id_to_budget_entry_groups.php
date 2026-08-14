<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budget_entry_groups', function (Blueprint $table) {
            $table->string('sync_id')->nullable()->after('id');
        });

        DB::statement('UPDATE budget_entry_groups SET sync_id = UUID() WHERE sync_id IS NULL');

        Schema::table('budget_entry_groups', function (Blueprint $table) {
            $table->string('sync_id')->nullable(false)->change();
            $table->unique(['sync_id', 'user_id'], 'uq_budget_entry_groups_sync_id_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('budget_entry_groups', function (Blueprint $table) {
            $table->dropUnique('uq_budget_entry_groups_sync_id_user_id');
            $table->dropColumn('sync_id');
        });
    }
};
