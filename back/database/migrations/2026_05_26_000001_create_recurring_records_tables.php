<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('sync_id', 100)->unique();
            $table->enum('type', ['cargo', 'provedor']);
            $table->enum('entry_type', ['ingreso', 'egreso']);
            $table->string('name', 255);
            $table->decimal('amount', 15, 2)->nullable();
            $table->unsignedBigInteger('account_id')->nullable();
            $table->enum('repeat_frequency', ['day', 'week', 'month', 'year']);
            $table->integer('repeat_interval')->default(1);
            $table->json('repeat_days')->nullable();
            $table->tinyInteger('repeat_month_day')->nullable();
            $table->boolean('repeat_month_weekday_mode')->default(false);
            $table->tinyInteger('repeat_month_weekday')->nullable();
            $table->tinyInteger('repeat_month_weekday_ordinal')->nullable();
            $table->tinyInteger('repeat_year_month')->nullable();
            $table->tinyInteger('repeat_year_day')->nullable();
            $table->time('time')->nullable();
            $table->boolean('auto_insert')->default(false);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('estimated', 15, 2)->nullable();
            $table->json('items')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'paused', 'deleted'])->default('active');
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
            $table->index(['user_id', 'status']);
        });

        Schema::create('recurring_record_products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('recurring_record_id');
            $table->string('sync_id', 100);
            $table->unsignedBigInteger('supplier_product_id')->nullable();
            $table->string('product_name', 255);
            $table->decimal('product_price', 15, 2)->default(0);
            $table->integer('quantity')->default(1);
            $table->timestamps();

            $table->foreign('recurring_record_id')->references('id')->on('recurring_records')->onDelete('cascade');
            $table->foreign('supplier_product_id')->references('id')->on('supplier_products')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_record_products');
        Schema::dropIfExists('recurring_records');
    }
};
