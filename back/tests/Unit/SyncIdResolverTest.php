<?php

namespace Tests\Unit;

use App\Models\Account;
use App\Models\RecurringRecord;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Services\SyncIdResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SyncIdResolverTest extends TestCase
{
    use RefreshDatabase;

    private SyncIdResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        $this->resolver = new SyncIdResolver;
    }

    protected function tearDown(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
        $this->resolver->clear();
        parent::tearDown();
    }

    public function test_resolve_batch_returns_map_of_sync_ids_to_db_ids(): void
    {
        $account1 = Account::create(['user_id' => 1, 'sync_id' => 'acc_1', 'name' => 'Test 1', 'status' => 'active']);
        $account2 = Account::create(['user_id' => 1, 'sync_id' => 'acc_2', 'name' => 'Test 2', 'status' => 'active']);

        $result = $this->resolver->resolveBatch('account', ['acc_1', 'acc_2', 'acc_nonexistent'], 1);

        $this->assertEquals(['acc_1' => $account1->id, 'acc_2' => $account2->id], $result);
        $this->assertArrayNotHasKey('acc_nonexistent', $result);
    }

    public function test_resolve_batch_caches_results(): void
    {
        Account::create(['user_id' => 1, 'sync_id' => 'acc_cached', 'name' => 'Cached', 'status' => 'active']);

        $result1 = $this->resolver->resolveBatch('account', ['acc_cached'], 1);
        $result2 = $this->resolver->resolveBatch('account', ['acc_cached'], 1);

        $this->assertEquals($result1, $result2);
    }

    public function test_resolve_batch_with_empty_ids_returns_empty_map(): void
    {
        $result = $this->resolver->resolveBatch('account', [], 1);
        $this->assertEquals([], $result);
    }

    public function test_resolve_uses_cached_batch_results(): void
    {
        $account = Account::create(['user_id' => 1, 'sync_id' => 'acc_resolve', 'name' => 'Resolve', 'status' => 'active']);
        $this->resolver->resolveBatch('account', ['acc_resolve'], 1);

        $id = $this->resolver->resolve('account', 'acc_resolve', 1);
        $this->assertEquals($account->id, $id);
    }

    public function test_resolve_batch_works_for_suppliers(): void
    {
        $supplier = Supplier::create(['user_id' => 1, 'sync_id' => 'sup_1', 'name' => 'Supplier 1', 'status' => 'active']);

        $result = $this->resolver->resolveBatch('supplier', ['sup_1'], 1);

        $this->assertEquals(['sup_1' => $supplier->id], $result);
    }

    public function test_resolve_batch_works_for_recurring_records(): void
    {
        $record = RecurringRecord::create([
            'user_id' => 1, 'sync_id' => 'rr_1', 'name' => 'Record 1',
            'type' => 'cargo', 'entry_type' => 'egreso', 'amount' => 100, 'status' => 'active',
            'start_date' => now(),
        ]);

        $result = $this->resolver->resolveBatch('recurring_record', ['rr_1'], 1);

        $this->assertEquals(['rr_1' => $record->id], $result);
    }

    public function test_resolve_batch_works_for_supplier_products(): void
    {
        $supplier = Supplier::create(['user_id' => 1, 'sync_id' => 'sup_prod', 'name' => 'S', 'status' => 'active']);
        $product = SupplierProduct::create([
            'user_id' => 1, 'sync_id' => 'sp_1', 'name' => 'Product 1',
            'price' => 10, 'supplier_id' => $supplier->id, 'status' => 'active',
        ]);

        $result = $this->resolver->resolveBatch('supplier_product', ['sp_1'], 1);

        $this->assertEquals(['sp_1' => $product->id], $result);
    }

    public function test_resolve_batch_respects_user_filter(): void
    {
        Account::create(['user_id' => 1, 'sync_id' => 'acc_u1', 'name' => 'User 1', 'status' => 'active']);
        Account::create(['user_id' => 2, 'sync_id' => 'acc_u2', 'name' => 'User 2', 'status' => 'active']);

        $result = $this->resolver->resolveBatch('account', ['acc_u1', 'acc_u2'], 1);

        $this->assertCount(1, $result);
        $this->assertArrayHasKey('acc_u1', $result);
        $this->assertArrayNotHasKey('acc_u2', $result);
    }

    public function test_resolve_batch_with_duplicate_ids_returns_unique_map(): void
    {
        Account::create(['user_id' => 1, 'sync_id' => 'acc_1', 'name' => 'Test', 'status' => 'active']);

        $result = $this->resolver->resolveBatch('account', ['acc_1', 'acc_1', 'acc_1'], 1);

        $this->assertCount(1, $result);
    }
}
