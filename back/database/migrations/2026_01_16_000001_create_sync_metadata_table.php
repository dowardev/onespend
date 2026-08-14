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
        Schema::create('sync_metadata', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type', 50);
            $table->string('entity_id', 100);
            $table->enum('sync_status', ['synced', 'pending', 'conflict', 'deleted'])->default('pending');
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamp('server_updated_at')->nullable();
            $table->json('conflict_data')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->timestamps();

            $table->index(['entity_type', 'entity_id', 'user_id']);
            $table->index(['sync_status', 'user_id']);
            $table->index(['server_updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_metadata');
    }
};
