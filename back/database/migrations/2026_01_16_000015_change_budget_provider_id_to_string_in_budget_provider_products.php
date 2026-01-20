<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budget_provider_products', function (Blueprint $table) {
            // Drop existing foreign key
            $table->dropForeign(['budget_provider_id']);
            $table->dropIndex(['budget_provider_id']);
        });

        Schema::table('budget_provider_products', function (Blueprint $table) {
            // Change budget_provider_id from unsignedBigInteger to string (to store sync_id)
            $table->string('budget_provider_id', 100)->change();
            $table->index('budget_provider_id');
        });
    }

    public function down(): void
    {
        Schema::table('budget_provider_products', function (Blueprint $table) {
            $table->dropIndex(['budget_provider_id']);
        });

        Schema::table('budget_provider_products', function (Blueprint $table) {
            $table->unsignedBigInteger('budget_provider_id')->change();
            $table->index('budget_provider_id');
            $table->foreign('budget_provider_id')->references('id')->on('budget_providers')->onDelete('cascade');
        });
    }
};
