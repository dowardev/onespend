<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budget_provider_products', function (Blueprint $table) {
            $table->foreign('supplier_product_id')
                ->references('id')
                ->on('supplier_products')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('budget_provider_products', function (Blueprint $table) {
            $table->dropForeign(['supplier_product_id']);
        });
    }
};
