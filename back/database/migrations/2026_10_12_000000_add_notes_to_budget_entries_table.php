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
     * LBDS-275: the entry form collected a free-form note per budget entry,
     * but no column existed on `budget_entries` and the sync payload never
     * carried it, so the note was lost on save. This migration adds the
     * nullable text column the processor (BudgetEntryProcessor) will store
     * once `notes` is in the model's $fillable and the push request allows it.
     */
    public function up(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->dropColumn('notes');
        });
    }
};
