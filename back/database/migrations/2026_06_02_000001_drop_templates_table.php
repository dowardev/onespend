<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('templates');
    }

    public function down(): void
    {
        // No recreamos la tabla - la funcionalidad de templates fue eliminada
    }
};
