<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function ($table) {
            $table->dropIndex('idx_suppliers_user_status_updated');
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function ($table) {
            $table->index(['user_id', 'updated_at'], 'idx_suppliers_user_status_updated');
        });
    }
};
