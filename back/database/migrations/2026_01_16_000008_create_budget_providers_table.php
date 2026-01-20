<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_providers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('sync_id', 100);
            $table->date('date');
            $table->string('name', 255);
            $table->decimal('estimated', 15, 2)->default(0);
            $table->unsignedBigInteger('account_id')->nullable();
            $table->decimal('efectivo', 15, 2)->default(0);
            $table->decimal('tarjeta', 15, 2)->default(0);
            $table->decimal('credito', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->boolean('visited')->default(false);
            $table->string('_supplier_id', 100)->nullable();
            $table->string('_supplier_name', 255)->nullable();
            $table->enum('status', ['active', 'deleted'])->default('active');
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'date']);
            $table->index('sync_id');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_providers');
    }
};
