<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync\Processors;

use App\Models\Supplier;
use App\Models\User;
use App\Services\Sync\Processors\SupplierProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierProcessorTest extends TestCase
{
    use RefreshDatabase;

    private SupplierProcessor $processor;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = app(SupplierProcessor::class);
        $this->user = User::factory()->create();
    }

    public function test_process_creates_entity(): void
    {
        $syncId = 'test-supplier-create-1';
        $productSyncId = 'test-supplier-product-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Test Supplier',
                'products' => [
                    [
                        'sync_id' => $productSyncId,
                        'name' => 'Product A',
                        'price' => 25.50,
                    ],
                ],
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('suppliers', [
            'sync_id' => $syncId,
            'name' => 'Test Supplier',
            'user_id' => $this->user->id,
        ]);
        $this->assertDatabaseHas('supplier_products', [
            'sync_id' => $productSyncId,
            'supplier_id' => $syncId,
            'name' => 'Product A',
            'price' => 25.50,
        ]);
    }

    public function test_process_updates_entity(): void
    {
        $syncId = 'test-supplier-update-1';
        $productSyncId = 'test-supplier-product-upd-1';
        $newProductSyncId = 'test-supplier-product-upd-2';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Original',
                'products' => [
                    ['sync_id' => $productSyncId, 'name' => 'Old Product', 'price' => 10],
                ],
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Updated Supplier',
                'products' => [
                    ['sync_id' => $newProductSyncId, 'name' => 'New Product', 'price' => 30],
                ],
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('suppliers', [
            'sync_id' => $syncId,
            'name' => 'Updated Supplier',
        ]);
        $this->assertDatabaseHas('supplier_products', [
            'sync_id' => $newProductSyncId,
            'name' => 'New Product',
        ]);
    }

    public function test_process_deletes_entity(): void
    {
        $syncId = 'test-supplier-delete-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'To Delete',
                'products' => [
                    ['sync_id' => 'sp-del-1', 'name' => 'Prod', 'price' => 5],
                ],
            ],
        ], $this->user->id);

        $result = $this->processor->delete([$syncId], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertContains($syncId, $result);

        $supplier = Supplier::withTrashed()->where('sync_id', $syncId)->first();
        $this->assertNotNull($supplier->deleted_at);
    }

    public function test_process_skips_unchanged_entity(): void
    {
        $syncId = 'test-supplier-skip-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Skip Test',
                'products' => [
                    ['sync_id' => 'sp-skip-1', 'name' => 'Prod', 'price' => 5],
                ],
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Skip Test',
                'products' => [
                    ['sync_id' => 'sp-skip-1', 'name' => 'Prod', 'price' => 5],
                ],
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('suppliers', [
            'sync_id' => $syncId,
            'name' => 'Skip Test',
        ]);
    }

    public function test_process_handles_conflict(): void
    {
        $syncId = 'test-supplier-conflict-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Server Version',
                'products' => [
                    ['sync_id' => 'sp-conf-1', 'name' => 'Prod', 'price' => 5],
                ],
            ],
        ], $this->user->id);

        // Server changes the name (simulating another device editing it).
        Supplier::where('sync_id', $syncId)->update(['name' => 'Server Changed', 'updated_at' => now()->addDay()]);

        // Client tries to change the same field to a different value -> semantic conflict.
        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Client Version', 'updated_at' => now()->timestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals($syncId, $result['conflicts'][0]['sync_id']);
        $this->assertEquals('semantic', $result['conflicts'][0]['conflict_type']);
        $this->assertContains('name', $result['conflicts'][0]['overlapping_fields']);
    }

    public function test_process_detects_stale_clobber_conflict(): void
    {
        $syncId = 'test-supplier-stale-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Original',
                'products' => [
                    ['sync_id' => 'sp-stale-1', 'name' => 'Prod', 'price' => 5],
                ],
            ],
        ], $this->user->id);

        // Server changes the name.
        Supplier::where('sync_id', $syncId)->update(['name' => 'Server Changed', 'updated_at' => now()->addDay()]);

        // Client does NOT change the name (keeps base value) but changes another field.
        // Note: Supplier has limited fillable fields, so we test with what we have.
        // The client pushes the base value for 'name' -> stale clobber.
        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Original', 'updated_at' => now()->timestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals('concurrent_edit', $result['conflicts'][0]['conflict_type']);
        $this->assertContains('name', $result['conflicts'][0]['changed_fields']);
    }
}
