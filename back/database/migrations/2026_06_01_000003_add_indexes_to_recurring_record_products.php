<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recurring_record_products', function (Blueprint $table) {
            $table->index('recurring_record_id');
            $table->unique('sync_id');
        });
    }

    public function down(): void
    {
        Schema::table('recurring_record_products', function (Blueprint $table) {
            $table->dropIndex(['recurring_record_id']);
            $table->dropUnique(['sync_id']);
        });
    }
};
