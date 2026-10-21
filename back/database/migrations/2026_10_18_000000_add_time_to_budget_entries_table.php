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
     *
     * LBDS-273 (GitLab #13): mirror the `time` column that `recurring_records`
     * already has. Entries currently store only a date; this adds an
     * optional HH:MM column so the entry form can capture the moment of the
     * transaction without changing the meaning of `date` (which is still
     * YYYY-MM-DD for every existing consumer: Historial, today badge,
     * agenda, day close, sync payload). The field is nullable so legacy
     * rows and the daily "no specific time" UX continue to work unchanged.
     */
    public function up(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->time('time')->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->dropColumn('time');
        });
    }
};
