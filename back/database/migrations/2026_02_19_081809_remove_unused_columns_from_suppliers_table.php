<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn(['contact', 'phone', 'email', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('contact', 255)->nullable()->after('name');
            $table->string('phone', 50)->nullable()->after('contact');
            $table->string('email', 255)->nullable()->after('phone');
            $table->enum('status', ['active', 'deleted'])->default('active')->after('products');
        });
    }
};
