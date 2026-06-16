<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Remove duplicates keeping the most recent per (entity_type, entity_id, user_id)
        DB::statement('
            DELETE s1 FROM sync_metadata s1
            INNER JOIN sync_metadata s2
            ON s1.entity_type = s2.entity_type
               AND s1.entity_id = s2.entity_id
               AND s1.user_id = s2.user_id
               AND s1.id < s2.id
        ');

        Schema::table('sync_metadata', function (Blueprint $table) {
            $table->dropIndex(['entity_type', 'entity_id', 'user_id']);
            $table->unique(['entity_type', 'entity_id', 'user_id'], 'sync_metadata_unique_entity');
        });
    }

    public function down(): void
    {
        Schema::table('sync_metadata', function (Blueprint $table) {
            $table->dropUnique('sync_metadata_unique_entity');
            $table->index(['entity_type', 'entity_id', 'user_id']);
        });
    }
};
