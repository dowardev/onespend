<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incomes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('sync_id', 100);
            $table->string('name', 255);
            $table->decimal('amount', 15, 2);
            $table->date('date');
            $table->enum('payment_type', ['cash', 'digital']);
            $table->enum('entry_type', ['ingreso', 'egreso']);
            $table->unsignedBigInteger('account_id')->nullable();
            $table->json('groups')->nullable();
            $table->string('_from_provider_group_id', 255)->nullable();
            $table->string('_provider_name', 255)->nullable();
            $table->enum('status', ['active', 'deleted'])->default('active');
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'date']);
            $table->index(['user_id', 'entry_type']);
            $table->index('sync_id');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incomes');
    }
};
