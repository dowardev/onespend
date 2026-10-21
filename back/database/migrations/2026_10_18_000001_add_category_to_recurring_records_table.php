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
     * LBDS-273 (GitLab #13): mirror the `category` column that `budget_entries`
     * already has (migration 2026_09_01_000000). Recurring charges currently
     * have a `time` but no `category`, which means the entry that an auto-insert
     * produces has no category to inherit. The field stores a category id
     * (string, not FK) so the contract stays device-local: the Dexie
     * `entryCategories` table is the source of truth, and the sync payload
     * only carries the id. Nullable so legacy recurring rows and the "no
     * category" UX continue to work.
     */
    public function up(): void
    {
        Schema::table('recurring_records', function (Blueprint $table) {
            $table->string('category', 100)->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recurring_records', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
