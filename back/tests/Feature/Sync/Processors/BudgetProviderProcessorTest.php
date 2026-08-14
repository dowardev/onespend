<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync\Processors;

use App\Models\Account;
use App\Models\BudgetProvider;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\User;
use App\Services\Sync\Processors\BudgetProviderProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetProviderProcessorTest extends TestCase
{
    use RefreshDatabase;

    private BudgetProviderProcessor $processor;

    private User $user;

    private Account $account;

    private string $supplierSyncId;

    private string $supplierProductSyncId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = app(BudgetProviderProcessor::class);
        $this->user = User::factory()->create();

        $this->account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-bp-1',
            'name' => 'BP Account',
            'status' => 'active',
        ]);

        $this->supplierSyncId = 'test-supplier-bp-1';
        $supplier = Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => $this->supplierSyncId,
            'name' => 'BP Supplier',
        ]);

        $this->supplierProductSyncId = 'test-sp-bp-1';
        SupplierProduct::create([
            'user_id' => $this->user->id,
            'sync_id' => $this->supplierProductSyncId,
            'supplier_id' => $this->supplierSyncId,
            'name' => 'BP Product',
            'price' => 50,
            'status' => 'active',
        ]);
    }

    public function test_process_creates_entity(): void
    {
        $syncId = 'test-bp-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Test Provider',
                'date' => '2026-06-01',
                'account_id' => (string) $this->account->sync_id,
                'estimated' => 500,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_providers', [
            'sync_id' => $syncId,
            'name' => 'Test Provider',
            'user_id' => $this->user->id,
        ]);
    }

    public function test_process_creates_entity_with_products(): void
    {
        $syncId = 'test-bp-create-prod-1';
        $productSyncId = 'test-bpp-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Provider With Products',
                'date' => '2026-06-01',
                'account_id' => (string) $this->account->sync_id,
                'estimated' => 1000,
                'status' => 'active',
                'products' => [
                    [
                        'sync_id' => $productSyncId,
                        'supplier_product_id' => (string) $this->supplierProductSyncId,
                        'product_name' => 'Provider Product',
                        'product_price' => 75,
                        'quantity' => 2,
                    ],
                ],
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_provider_products', [
            'sync_id' => $productSyncId,
            'budget_provider_id' => $syncId,
            'product_name' => 'Provider Product',
        ]);
    }

    public function test_process_updates_entity(): void
    {
        $syncId = 'test-bp-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Original',
                'date' => '2026-06-01',
                'account_id' => (string) $this->account->sync_id,
                'estimated' => 300,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Updated Provider',
                'estimated' => 999,
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_providers', [
            'sync_id' => $syncId,
            'name' => 'Updated Provider',
            'estimated' => 999,
        ]);
    }

    public function test_process_deletes_entity(): void
    {
        $syncId = 'test-bp-delete-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'To Delete',
                'date' => '2026-06-01',
                'estimated' => 100,
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->delete([$syncId], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertContains($syncId, $result);

        $provider = BudgetProvider::withTrashed()->where('sync_id', $syncId)->first();
        $this->assertNotNull($provider->deleted_at);
        $this->assertEquals('deleted', $provider->status);
    }

    public function test_process_skips_unchanged_entity(): void
    {
        $syncId = 'test-bp-skip-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Skip BP',
                'date' => '2026-06-01',
                'estimated' => 100,
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            ['id' => $syncId, 'name' => 'Skip BP'],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('budget_providers', [
            'sync_id' => $syncId,
            'name' => 'Skip BP',
        ]);
    }

    public function test_process_handles_conflict(): void
    {
        $syncId = 'test-bp-conflict-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Server BP',
                'date' => '2026-06-01',
                'estimated' => 100,
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        BudgetProvider::where('sync_id', $syncId)->update(['updated_at' => now()->addDay()]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Client BP', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals($syncId, $result['conflicts'][0]['sync_id']);
    }
}
