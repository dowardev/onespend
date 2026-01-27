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
        // Entries table indexes
        Schema::table('entries', function (Blueprint $table) {
            $table->index('account_id', 'idx_entries_account_id');
            $table->index(['user_id', 'account_id', 'date'], 'idx_entries_user_account_date');
            $table->index('payment_type', 'idx_entries_payment_type');
        });

        // Accounts table indexes
        Schema::table('accounts', function (Blueprint $table) {
            $table->index('name', 'idx_accounts_name');
        });

        // Supplier products table indexes
        Schema::table('supplier_products', function (Blueprint $table) {
            $table->index('supplier_id', 'idx_supplier_products_supplier_id');
            $table->index('name', 'idx_supplier_products_name');
            $table->index('price', 'idx_supplier_products_price');
        });

        // Budget providers table indexes
        Schema::table('budget_providers', function (Blueprint $table) {
            $table->index('_supplier_id', 'idx_budget_providers_supplier_id');
        });

        // Budget provider products table indexes
        Schema::table('budget_provider_products', function (Blueprint $table) {
            $table->index('product_name', 'idx_budget_provider_products_product_name');
        });

        // Composite index for sync operations
        Schema::table('suppliers', function (Blueprint $table) {
            $table->index(['user_id', 'status', 'updated_at'], 'idx_suppliers_user_status_updated');
        });

        Schema::table('entries', function (Blueprint $table) {
            $table->index(['user_id', 'status', 'updated_at'], 'idx_entries_user_status_updated');
        });

        Schema::table('accounts', function (Blueprint $table) {
            $table->index(['user_id', 'status', 'updated_at'], 'idx_accounts_user_status_updated');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Entries table indexes
        Schema::table('entries', function (Blueprint $table) {
            $table->dropIndex('idx_entries_account_id');
            $table->dropIndex('idx_entries_user_account_date');
            $table->dropIndex('idx_entries_payment_type');
            $table->dropIndex('idx_entries_user_status_updated');
        });

        // Accounts table indexes
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropIndex('idx_accounts_name');
            $table->dropIndex('idx_accounts_user_status_updated');
        });

        // Supplier products table indexes
        Schema::table('supplier_products', function (Blueprint $table) {
            $table->dropIndex('idx_supplier_products_supplier_id');
            $table->dropIndex('idx_supplier_products_name');
            $table->dropIndex('idx_supplier_products_price');
        });

        // Budget providers table indexes
        Schema::table('budget_providers', function (Blueprint $table) {
            $table->dropIndex('idx_budget_providers_supplier_id');
        });

        // Budget provider products table indexes
        Schema::table('budget_provider_products', function (Blueprint $table) {
            $table->dropIndex('idx_budget_provider_products_product_name');
        });

        // Suppliers table indexes
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropIndex('idx_suppliers_user_status_updated');
        });
    }
};
