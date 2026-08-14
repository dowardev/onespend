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
        Schema::table('attachments', function (Blueprint $table) {
            $table->string('budget_provider_sync_id', 100)->nullable()->after('budget_entry_sync_id');
            $table->index('budget_provider_sync_id', 'idx_attachments_provider_sync_id');
        });

        DB::statement('ALTER TABLE attachments MODIFY COLUMN budget_entry_sync_id VARCHAR(100) NULL');

        DB::statement("ALTER TABLE attachments MODIFY COLUMN entity_type ENUM('entries', 'providers') NOT NULL DEFAULT 'entries'");
    }

    public function down(): void
    {
        DB::statement("UPDATE attachments SET entity_type = 'entries', budget_provider_sync_id = NULL WHERE entity_type = 'providers'");

        DB::statement("ALTER TABLE attachments MODIFY COLUMN entity_type ENUM('entries') NOT NULL DEFAULT 'entries'");

        DB::statement("UPDATE attachments SET budget_entry_sync_id = '' WHERE budget_entry_sync_id IS NULL");

        DB::statement('ALTER TABLE attachments MODIFY COLUMN budget_entry_sync_id VARCHAR(100) NOT NULL');

        Schema::table('attachments', function (Blueprint $table) {
            $table->dropIndex('idx_attachments_provider_sync_id');
            $table->dropColumn('budget_provider_sync_id');
        });
    }
};
