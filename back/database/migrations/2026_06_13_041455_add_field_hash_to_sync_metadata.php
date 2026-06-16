<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sync_metadata', function (Blueprint $table) {
            $table->string('field_hash', 64)->nullable()->after('conflict_data');
        });
    }

    public function down(): void
    {
        Schema::table('sync_metadata', function (Blueprint $table) {
            $table->dropColumn('field_hash');
        });
    }
};
