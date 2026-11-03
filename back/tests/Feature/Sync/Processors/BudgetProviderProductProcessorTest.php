<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync\Processors;

use App\Models\Account;
use App\Models\BudgetProvider;
use App\Models\BudgetProviderProduct;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\User;
use App\Services\Sync\Processors\BudgetProviderProductProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetProviderProductProcessorTest extends TestCase
{
    use RefreshDatabase;

    private BudgetProviderProductProcessor $processor;

    private User $user;

    private string $budgetProviderSyncId;

    private int $supplierProductId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = app(BudgetProviderProductProcessor::class);
        $this->user = User::factory()->create();

        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-bpp-1',
            'name' => 'BPP Account',
            'status' => 'active',
        ]);

        $this->budgetProviderSyncId = 'test-bp-bpp-1';
        BudgetProvider::create([
            'user_id' => $this->user->id,
            'sync_id' => $this->budgetProviderSyncId,
            'name' => 'BPP Provider',
            'date' => '2026-06-01',
            'account_id' => $account->id,
            'status' => 'active',
        ]);

        $supplier = Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-supplier-bpp-1',
            'name' => 'BPP Supplier',
        ]);

        $sp = SupplierProduct::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-sp-bpp-1',
            'supplier_id' => $supplier->sync_id,
            'name' => 'BPP Supplier Product',
            'price' => 45,
            'status' => 'active',
        ]);
        $this->supplierProductId = $sp->id;
    }

    public function test_process_creates_entity(): void
    {
        $syncId = 'test-bpp-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'budget_provider_id' => $this->budgetProviderSyncId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'Provider Product',
                'product_price' => 80,
                'quantity' => 3,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_provider_products', [
            'sync_id' => $syncId,
            'budget_provider_id' => $this->budgetProviderSyncId,
            'product_name' => 'Provider Product',
            'user_id' => $this->user->id,
        ]);
    }

    public function test_process_updates_entity(): void
    {
        $syncId = 'test-bpp-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'budget_provider_id' => $this->budgetProviderSyncId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'Original',
                'product_price' => 50,
                'quantity' => 1,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            [
                'id' => $syncId,
                'product_name' => 'Updated BPP',
                'product_price' => 100,
                'quantity' => 5,
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_provider_products', [
            'sync_id' => $syncId,
            'product_name' => 'Updated BPP',
            'product_price' => 100,
            'quantity' => 5,
        ]);
    }

    public function test_process_deletes_entity(): void
    {
        $syncId = 'test-bpp-delete-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'budget_provider_id' => $this->budgetProviderSyncId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'To Delete',
                'product_price' => 30,
                'quantity' => 1,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->delete([$syncId], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertContains($syncId, $result);

        $product = BudgetProviderProduct::withTrashed()->where('sync_id', $syncId)->first();
        $this->assertNotNull($product->deleted_at);
        $this->assertEquals('deleted', $product->status);
    }

    public function test_process_skips_unchanged_entity(): void
    {
        $syncId = 'test-bpp-skip-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'budget_provider_id' => $this->budgetProviderSyncId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'Skip BPP',
                'product_price' => 25,
                'quantity' => 2,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            ['id' => $syncId, 'product_name' => 'Skip BPP'],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('budget_provider_products', [
            'sync_id' => $syncId,
            'product_name' => 'Skip BPP',
        ]);
    }

    public function test_process_auto_merges_when_only_client_changed(): void
    {
        $syncId = 'test-bpp-auto-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'budget_provider_id' => $this->budgetProviderSyncId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'Original BPP',
                'product_price' => 40,
                'quantity' => 1,
                'status' => 'active',
            ],
        ], $this->user->id);

        BudgetProviderProduct::where('sync_id', $syncId)->update(['updated_at' => now()->addDay()]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'product_name' => 'Client BPP', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        // GitLab #15: the server row still holds the base values, so the
        // client's update is a plain update — not a conflict.
        $this->assertCount(0, $result['conflicts']);

        $this->processor->update([
            ['id' => $syncId, 'product_name' => 'Client BPP', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertDatabaseHas('budget_provider_products', [
            'sync_id' => $syncId,
            'product_name' => 'Client BPP',
        ]);
    }

    public function test_process_conflicts_when_both_change_same_field(): void
    {
        $syncId = 'test-bpp-semantic-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'budget_provider_id' => $this->budgetProviderSyncId,
                'supplier_product_id' => $this->supplierProductId,
                'product_name' => 'Original BPP',
                'product_price' => 40,
                'quantity' => 1,
                'status' => 'active',
            ],
        ], $this->user->id);

        BudgetProviderProduct::where('sync_id', $syncId)->update([
            'product_name' => 'Server BPP',
            'updated_at' => now()->addDay(),
        ]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'product_name' => 'Client BPP', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals($syncId, $result['conflicts'][0]['sync_id']);
        $this->assertEquals('semantic', $result['conflicts'][0]['conflict_type']);
    }
}
