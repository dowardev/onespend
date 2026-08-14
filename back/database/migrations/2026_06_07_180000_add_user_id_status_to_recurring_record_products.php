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
        Schema::table('recurring_record_products', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('id');
            $table->enum('status', ['active', 'deleted'])->default('active')->after('quantity');
            $table->softDeletes()->after('status');
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('recurring_record_products', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status']);
            $table->dropSoftDeletes();
            $table->dropColumn('status');
            $table->dropColumn('user_id');
        });
    }
};
