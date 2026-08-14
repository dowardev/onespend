<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync\Processors;

use App\Models\Account;
use App\Models\RecurringRecord;
use App\Models\RecurringRecordProduct;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\User;
use App\Services\Sync\Processors\RecurringRecordProductProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringRecordProductProcessorTest extends TestCase
{
    use RefreshDatabase;

    private RecurringRecordProductProcessor $processor;

    private User $user;

    private int $recurringRecordId;

    private int $supplierProductId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = app(RecurringRecordProductProcessor::class);
        $this->user = User::factory()->create();

        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-rrp-1',
            'name' => 'RRP Account',
            'status' => 'active',
        ]);

        $rr = RecurringRecord::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-rr-rrp-1',
            'name' => 'RRP Recurring',
            'type' => 'cargo',
            'entry_type' => 'egreso',
            'amount' => 100,
            'repeat_frequency' => 'month',
            'repeat_interval' => 1,
            'start_date' => '2026-01-01',
            'account_id' => $account->id,
            'status' => 'active',
        ]);
        $this->recurringRecordId = $rr->id;

        $supplier = Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-supplier-rrp-1',
            'name' => 'RRP Supplier',
        ]);

        $sp = SupplierProduct::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-sp-rrp-1',
            'supplier_id' => $supplier->sync_id,
            'name' => 'RRP Supplier Product',
            'price' => 35,
            'status' => 'active',
        ]);
        $this->supplierProductId = $sp->id;
    }

    public function test_process_creates_entity(): void
    {
        $syncId = 'test-rrp-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'recurring_record_id' => $this->recurringRecordId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'RR Product',
                'product_price' => 60,
                'quantity' => 4,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('recurring_record_products', [
            'sync_id' => $syncId,
            'user_id' => $this->user->id,
            'product_name' => 'RR Product',
        ]);
    }

    public function test_process_updates_entity(): void
    {
        $syncId = 'test-rrp-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'recurring_record_id' => $this->recurringRecordId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'Original',
                'product_price' => 40,
                'quantity' => 2,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            [
                'id' => $syncId,
                'product_name' => 'Updated RRP',
                'product_price' => 90,
                'quantity' => 6,
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('recurring_record_products', [
            'sync_id' => $syncId,
            'product_name' => 'Updated RRP',
            'product_price' => 90,
            'quantity' => 6,
        ]);
    }

    public function test_process_deletes_entity(): void
    {
        $syncId = 'test-rrp-delete-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'recurring_record_id' => $this->recurringRecordId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'To Delete',
                'product_price' => 20,
                'quantity' => 1,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->delete([$syncId], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertContains($syncId, $result);

        $product = RecurringRecordProduct::withTrashed()->where('sync_id', $syncId)->first();
        $this->assertNotNull($product->deleted_at);
        $this->assertEquals('deleted', $product->status);
    }

    public function test_process_skips_unchanged_entity(): void
    {
        $syncId = 'test-rrp-skip-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'recurring_record_id' => $this->recurringRecordId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'Skip RRP',
                'product_price' => 30,
                'quantity' => 1,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            ['id' => $syncId, 'product_name' => 'Skip RRP'],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('recurring_record_products', [
            'sync_id' => $syncId,
            'product_name' => 'Skip RRP',
        ]);
    }

    public function test_process_auto_merges_when_only_client_changed(): void
    {
        $syncId = 'test-rrp-auto-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'recurring_record_id' => $this->recurringRecordId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'Original RRP',
                'product_price' => 50,
                'quantity' => 2,
                'status' => 'active',
            ],
        ], $this->user->id);

        RecurringRecordProduct::where('sync_id', $syncId)->update(['updated_at' => now()->addDay()]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'product_name' => 'Client RRP', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals('concurrent_edit', $result['conflicts'][0]['conflict_type']);
        $this->assertEquals('Client RRP', $result['conflicts'][0]['client_data']['product_name']);
        $this->assertDatabaseHas('recurring_record_products', [
            'sync_id' => $syncId,
            'product_name' => 'Original RRP',
        ]);
    }

    public function test_process_conflicts_when_both_change_same_field(): void
    {
        $syncId = 'test-rrp-semantic-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'recurring_record_id' => $this->recurringRecordId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'Original RRP',
                'product_price' => 50,
                'quantity' => 2,
                'status' => 'active',
            ],
        ], $this->user->id);

        RecurringRecordProduct::where('sync_id', $syncId)->update([
            'product_name' => 'Server RRP',
            'updated_at' => now()->addDay(),
        ]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'product_name' => 'Client RRP', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals($syncId, $result['conflicts'][0]['sync_id']);
        $this->assertEquals('semantic', $result['conflicts'][0]['conflict_type']);
    }
}
