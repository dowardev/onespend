<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_provider_products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('sync_id', 100);
            $table->unsignedBigInteger('budget_provider_id');
            $table->unsignedBigInteger('supplier_product_id')->nullable();
            $table->string('product_name', 255);
            $table->decimal('product_price', 15, 2)->default(0);
            $table->integer('quantity')->default(0);
            $table->enum('status', ['active', 'deleted'])->default('active');
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('budget_provider_id');
            $table->index('supplier_product_id');
            $table->index('sync_id');
            $table->foreign('budget_provider_id')->references('id')->on('budget_providers')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_provider_products');
    }
};
