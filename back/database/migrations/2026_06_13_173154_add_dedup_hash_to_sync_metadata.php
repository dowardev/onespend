<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sync_metadata', function (Blueprint $table) {
            $table->string('dedup_hash', 64)->nullable()->after('field_hash');
            $table->index('dedup_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sync_metadata', function (Blueprint $table) {
            $table->dropIndex(['dedup_hash']);
            $table->dropColumn('dedup_hash');
        });
    }
};
