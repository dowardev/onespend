<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::rename('entries', 'budget_entries');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::rename('budget_entries', 'entries');
    }
};
