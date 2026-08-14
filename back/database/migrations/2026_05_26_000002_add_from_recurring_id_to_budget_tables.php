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
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->string('_from_recurring_id', 100)->nullable()->after('supplier_name');
            $table->index('_from_recurring_id');
        });

        Schema::table('budget_providers', function (Blueprint $table) {
            $table->string('_from_recurring_id', 100)->nullable()->after('_supplier_name');
            $table->index('_from_recurring_id');
        });
    }

    public function down(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->dropColumn('_from_recurring_id');
        });

        Schema::table('budget_providers', function (Blueprint $table) {
            $table->dropColumn('_from_recurring_id');
        });
    }
};
