<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merge_jobs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('status', 20)->default('queued');
            $table->longText('data')->nullable();
            $table->longText('results')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
            $table->timestamp('completed_at')->nullable();

            $table->index('user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merge_jobs');
    }
};
