<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_entry_groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('budget_entry_id');
            $table->unsignedBigInteger('account_id')->nullable();
            $table->decimal('amount', 15, 2);
            $table->timestamps();

            $table->foreign('budget_entry_id')
                ->references('id')
                ->on('budget_entries')
                ->onDelete('cascade');
            $table->foreign('account_id')
                ->references('id')
                ->on('accounts')
                ->onDelete('set null');
            $table->index(['budget_entry_id', 'account_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_entry_groups');
    }
};
