<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budget_providers', function (Blueprint $table) {
            $table->json('product_quantities')->nullable()->after('credito');
        });
    }

    public function down(): void
    {
        Schema::table('budget_providers', function (Blueprint $table) {
            $table->dropColumn('product_quantities');
        });
    }
};
