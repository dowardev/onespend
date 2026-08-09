<?php

namespace Tests\Feature\Sync\Processors;

use App\Models\Account;
use App\Models\RecurringRecord;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\User;
use App\Services\Sync\Processors\RecurringRecordProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringRecordProcessorTest extends TestCase
{
    use RefreshDatabase;

    private RecurringRecordProcessor $processor;

    private User $user;

    private Account $account;

    private string $supplierProductSyncId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = app(RecurringRecordProcessor::class);
        $this->user = User::factory()->create();

        $this->account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-rr-1',
            'name' => 'RR Account',
            'status' => 'active',
        ]);

        $supplier = Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-supplier-rr-1',
            'name' => 'RR Supplier',
        ]);

        $this->supplierProductSyncId = 'test-sp-rr-1';
        SupplierProduct::create([
            'user_id' => $this->user->id,
            'sync_id' => $this->supplierProductSyncId,
            'supplier_id' => $supplier->sync_id,
            'name' => 'RR Supplier Product',
            'price' => 30,
            'status' => 'active',
        ]);
    }

    public function test_process_creates_entity(): void
    {
        $syncId = 'test-rr-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Monthly Bill',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 200,
                'account_id' => (string) $this->account->sync_id,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('recurring_records', [
            'sync_id' => $syncId,
            'name' => 'Monthly Bill',
            'user_id' => $this->user->id,
        ]);
    }

    public function test_process_creates_entity_with_products(): void
    {
        $syncId = 'test-rr-create-prod-1';
        $productSyncId = 'test-rrp-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Record With Products',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 500,
                'account_id' => (string) $this->account->sync_id,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
                'products' => [
                    [
                        'sync_id' => $productSyncId,
                        'supplier_product_id' => (string) $this->supplierProductSyncId,
                        'product_name' => 'RR Product',
                        'product_price' => 50,
                        'quantity' => 3,
                    ],
                ],
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('recurring_record_products', [
            'sync_id' => $productSyncId,
            'product_name' => 'RR Product',
        ]);
    }

    public function test_process_updates_entity(): void
    {
        $syncId = 'test-rr-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Original Record',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 100,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Updated Record',
                'amount' => 300,
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('recurring_records', [
            'sync_id' => $syncId,
            'name' => 'Updated Record',
            'amount' => 300,
        ]);
    }

    public function test_process_deletes_entity(): void
    {
        $syncId = 'test-rr-delete-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'To Delete',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 50,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->delete([$syncId], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertContains($syncId, $result);

        $record = RecurringRecord::withTrashed()->where('sync_id', $syncId)->first();
        $this->assertNotNull($record->deleted_at);
        $this->assertEquals('deleted', $record->status);
    }

    public function test_process_skips_unchanged_entity(): void
    {
        $syncId = 'test-rr-skip-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Skip RR',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 50,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            ['id' => $syncId, 'name' => 'Skip RR'],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('recurring_records', [
            'sync_id' => $syncId,
            'name' => 'Skip RR',
        ]);
    }

    public function test_process_handles_conflict(): void
    {
        $syncId = 'test-rr-conflict-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Server RR',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 100,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        RecurringRecord::where('sync_id', $syncId)->update(['updated_at' => now()->addDay()]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Client RR', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals($syncId, $result['conflicts'][0]['sync_id']);
    }
}
