<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_products', function (Blueprint $table) {
            // Drop existing foreign key
            $table->dropForeign(['supplier_id']);
            $table->dropIndex(['supplier_id']);
        });

        Schema::table('supplier_products', function (Blueprint $table) {
            // Change supplier_id from unsignedBigInteger to string (to store sync_id)
            $table->string('supplier_id', 100)->change();
            $table->index('supplier_id');
        });
    }

    public function down(): void
    {
        Schema::table('supplier_products', function (Blueprint $table) {
            $table->dropIndex(['supplier_id']);
        });

        Schema::table('supplier_products', function (Blueprint $table) {
            $table->unsignedBigInteger('supplier_id')->change();
            $table->index('supplier_id');
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
        });
    }
};
