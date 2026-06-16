<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sync_metadata', function (Blueprint $table) {
            $table->json('base_data')->nullable()->after('field_hash');
        });
    }

    public function down(): void
    {
        Schema::table('sync_metadata', function (Blueprint $table) {
            $table->dropColumn('base_data');
        });
    }
};
