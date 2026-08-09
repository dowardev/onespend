<?php

namespace Tests\Feature\Sync\Processors;

use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\User;
use App\Services\Sync\Processors\SupplierProductProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierProductProcessorTest extends TestCase
{
    use RefreshDatabase;

    private SupplierProductProcessor $processor;

    private User $user;

    private string $supplierSyncId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = app(SupplierProductProcessor::class);
        $this->user = User::factory()->create();

        $this->supplierSyncId = 'test-supplier-sp-1';
        Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => $this->supplierSyncId,
            'name' => 'SP Supplier',
        ]);
    }

    public function test_process_creates_entity(): void
    {
        $syncId = 'test-sp-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'supplier_id' => $this->supplierSyncId,
                'name' => 'Test Product',
                'price' => 99.99,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('supplier_products', [
            'sync_id' => $syncId,
            'supplier_id' => $this->supplierSyncId,
            'name' => 'Test Product',
            'price' => 99.99,
            'user_id' => $this->user->id,
        ]);
    }

    public function test_process_updates_entity(): void
    {
        $syncId = 'test-sp-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'supplier_id' => $this->supplierSyncId,
                'name' => 'Original',
                'price' => 10,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Updated Product',
                'price' => 25,
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('supplier_products', [
            'sync_id' => $syncId,
            'name' => 'Updated Product',
            'price' => 25,
        ]);
    }

    public function test_process_deletes_entity(): void
    {
        $syncId = 'test-sp-delete-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'supplier_id' => $this->supplierSyncId,
                'name' => 'To Delete',
                'price' => 15,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->delete([$syncId], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertContains($syncId, $result);

        $product = SupplierProduct::withTrashed()->where('sync_id', $syncId)->first();
        $this->assertNotNull($product->deleted_at);
        $this->assertEquals('deleted', $product->status);
    }

    public function test_process_skips_unchanged_entity(): void
    {
        $syncId = 'test-sp-skip-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'supplier_id' => $this->supplierSyncId,
                'name' => 'Skip SP',
                'price' => 20,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            ['id' => $syncId, 'name' => 'Skip SP', 'price' => 20],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('supplier_products', [
            'sync_id' => $syncId,
            'name' => 'Skip SP',
        ]);
    }

    public function test_process_auto_merges_when_only_client_changed(): void
    {
        $syncId = 'test-sp-auto-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'supplier_id' => $this->supplierSyncId,
                'name' => 'Original SP',
                'price' => 30,
                'status' => 'active',
            ],
        ], $this->user->id);

        SupplierProduct::where('sync_id', $syncId)->update(['updated_at' => now()->addDay()]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Client SP', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals('concurrent_edit', $result['conflicts'][0]['conflict_type']);
        $this->assertEquals('Client SP', $result['conflicts'][0]['client_data']['name']);
        $this->assertDatabaseHas('supplier_products', [
            'sync_id' => $syncId,
            'name' => 'Original SP',
        ]);
    }

    public function test_process_conflicts_when_both_change_same_field(): void
    {
        $syncId = 'test-sp-semantic-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'supplier_id' => $this->supplierSyncId,
                'name' => 'Original SP',
                'price' => 30,
                'status' => 'active',
            ],
        ], $this->user->id);

        SupplierProduct::where('sync_id', $syncId)->update([
            'name' => 'Server SP',
            'updated_at' => now()->addDay(),
        ]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Client SP', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals($syncId, $result['conflicts'][0]['sync_id']);
        $this->assertEquals('semantic', $result['conflicts'][0]['conflict_type']);
    }
}
