<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE sync_metadata MODIFY sync_status ENUM('synced', 'pending', 'conflict', 'deleted', 'resolved') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE sync_metadata MODIFY sync_status ENUM('synced', 'pending', 'conflict', 'deleted') NOT NULL DEFAULT 'pending'");
    }
};
