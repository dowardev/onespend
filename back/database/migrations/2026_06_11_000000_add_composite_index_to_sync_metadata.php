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
        Schema::table('sync_metadata', function (Blueprint $table) {
            $table->index(
                ['user_id', 'entity_type', 'sync_status', 'server_updated_at'],
                'sync_metadata_user_entity_status_updated_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('sync_metadata', function (Blueprint $table) {
            $table->dropIndex('sync_metadata_user_entity_status_updated_idx');
        });
    }
};
