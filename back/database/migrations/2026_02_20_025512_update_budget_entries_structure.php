<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            // Eliminar campos obsoletos
            $table->dropColumn(['_from_provider_group_id', '_provider_name']);
            
            // Agregar nueva referencia al supplier (inmutable)
            $table->string('supplier_id', 100)->nullable()->after('account_id');
            $table->string('supplier_name', 255)->nullable()->after('supplier_id');
            
            // Agregar índice para supplier_id
            $table->index('supplier_id', 'idx_budget_entries_supplier_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            // Eliminar nuevos campos
            $table->dropIndex('idx_budget_entries_supplier_id');
            $table->dropColumn(['supplier_id', 'supplier_name']);
            
            // Restaurar campos obsoletos
            $table->string('_from_provider_group_id', 255)->nullable();
            $table->string('_provider_name', 255)->nullable();
        });
    }
};
