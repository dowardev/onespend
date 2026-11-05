<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync;

use App\Models\Account;
use App\Models\BudgetProvider;
use App\Models\RecurringRecord;
use App\Models\Supplier;
use App\Models\SyncMetadata;
use App\Models\User;
use App\Services\Sync\SyncOrchestratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * GitLab #19: merge base coverage for Supplier, BudgetProvider, RecurringRecord.
 *
 * These three entity types did not write a merge base in their processors,
 * so every update would conflict forever. This test verifies that:
 * 1. Create through merge stores a non-empty base_data with _version.
 * 2. Update through merge stores a non-empty base_data with _version.
 * 3. A create-then-update round-trip does NOT produce a conflict.
 */
class MergeBaseCoverageTest extends TestCase
{
    use RefreshDatabase;

    private SyncOrchestratorService $orchestrator;

    private User $user;

    private Account $account;

    private string $supplierSyncId;

    private string $supplierProductSyncId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->orchestrator = app(SyncOrchestratorService::class);
        $this->user = User::factory()->create();

        $this->account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-acc-mb-1',
            'name' => 'MB Account',
            'status' => 'active',
        ]);

        $this->supplierSyncId = 'test-supplier-mb-1';
        $supplier = Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => $this->supplierSyncId,
            'name' => 'MB Supplier',
        ]);

        $this->supplierProductSyncId = 'test-sp-mb-1';
        \App\Models\SupplierProduct::create([
            'user_id' => $this->user->id,
            'sync_id' => $this->supplierProductSyncId,
            'supplier_id' => $this->supplierSyncId,
            'name' => 'MB Product',
            'price' => 50,
            'status' => 'active',
        ]);
    }

    /**
     * Supplier: create -> update round-trip must not conflict and base_data
     * must be stored with _version.
     */
    public function test_supplier_create_then_update_no_conflict_and_base_stored(): void
    {
        $supplierSyncId = 'sync-supplier-mb-1';
        $productSyncId = 'sync-sp-mb-1';

        // Create through merge.
        $created = $this->orchestrator->merge([
            'supplier' => [
                [
                    'id' => $supplierSyncId,
                    'name' => 'Test Supplier',
                    'products' => [
                        ['sync_id' => $productSyncId, 'name' => 'Product A', 'price' => 25.50],
                    ],
                ],
            ],
        ], $this->user->id);

        $this->assertArrayHasKey('supplier', $created['created']);
        $this->assertEmpty($created['conflicts']);

        // Verify base_data is stored for supplier.
        $supplierMeta = SyncMetadata::where('entity_type', 'supplier')
            ->where('entity_id', $supplierSyncId)
            ->where('user_id', $this->user->id)
            ->first();
        $this->assertNotNull($supplierMeta);
        $this->assertNotNull($supplierMeta->base_data);
        $baseData = $supplierMeta->base_data;
        $this->assertArrayHasKey('_version', $baseData);
        $this->assertEquals(1, $baseData['_version']);
        $this->assertArrayHasKey('name', $baseData);
        $this->assertEquals('Test Supplier', $baseData['name']);

        // Verify base_data is stored for supplier product.
        $productMeta = SyncMetadata::where('entity_type', 'supplier_product')
            ->where('entity_id', $productSyncId)
            ->where('user_id', $this->user->id)
            ->first();
        $this->assertNotNull($productMeta);
        $this->assertNotNull($productMeta->base_data);
        $productBaseData = $productMeta->base_data;
        $this->assertArrayHasKey('_version', $productBaseData);
        $this->assertEquals(1, $productBaseData['_version']);
        $this->assertArrayHasKey('name', $productBaseData);
        $this->assertEquals('Product A', $productBaseData['name']);

        // Update through merge (same client editing its own row).
        $updated = $this->orchestrator->merge([
            'supplier' => [
                [
                    'id' => $supplierSyncId,
                    'name' => 'Updated Supplier',
                    'products' => [
                        ['sync_id' => $productSyncId, 'name' => 'Product A Updated', 'price' => 30.00],
                    ],
                ],
            ],
        ], $this->user->id);

        $this->assertEmpty(
            $updated['conflicts'],
            'Editing a supplier created by the same client must not raise a conflict: '.json_encode($updated['conflicts'])
        );

        // Verify base_data is updated with new version.
        $supplierMeta = $supplierMeta->fresh();
        $this->assertNotNull($supplierMeta->base_data);
        $baseData = $supplierMeta->base_data;
        $this->assertArrayHasKey('_version', $baseData);
        $this->assertEquals(2, $baseData['_version']); // version incremented on update
        $this->assertEquals('Updated Supplier', $baseData['name']);
    }

    /**
     * BudgetProvider: create -> update round-trip must not conflict and base_data
     * must be stored with _version.
     */
    public function test_budget_provider_create_then_update_no_conflict_and_base_stored(): void
    {
        $providerSyncId = 'sync-bp-mb-1';
        $productSyncId = 'sync-bpp-mb-1';

        // Create through merge.
        $created = $this->orchestrator->merge([
            'budget_provider' => [
                [
                    'id' => $providerSyncId,
                    'name' => 'Test Provider',
                    'date' => '2026-06-01',
                    'account_id' => (string) $this->account->sync_id,
                    'estimated' => 500,
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
            ],
        ], $this->user->id);

        $this->assertArrayHasKey('budget_provider', $created['created']);
        $this->assertEmpty($created['conflicts']);

        // Verify base_data is stored for budget provider.
        $providerMeta = SyncMetadata::where('entity_type', 'budget_provider')
            ->where('entity_id', $providerSyncId)
            ->where('user_id', $this->user->id)
            ->first();
        $this->assertNotNull($providerMeta);
        $this->assertNotNull($providerMeta->base_data);
        $baseData = $providerMeta->base_data;
        $this->assertArrayHasKey('_version', $baseData);
        $this->assertEquals(1, $baseData['_version']);
        $this->assertArrayHasKey('name', $baseData);
        $this->assertEquals('Test Provider', $baseData['name']);

        // Verify base_data is stored for budget provider product.
        $productMeta = SyncMetadata::where('entity_type', 'budget_provider_product')
            ->where('entity_id', $productSyncId)
            ->where('user_id', $this->user->id)
            ->first();
        $this->assertNotNull($productMeta);
        $this->assertNotNull($productMeta->base_data);
        $productBaseData = $productMeta->base_data;
        $this->assertArrayHasKey('_version', $productBaseData);
        $this->assertEquals(1, $productBaseData['_version']);
        $this->assertArrayHasKey('product_name', $productBaseData);
        $this->assertEquals('Provider Product', $productBaseData['product_name']);

        // Update through merge (same client editing its own row).
        $updated = $this->orchestrator->merge([
            'budget_provider' => [
                [
                    'id' => $providerSyncId,
                    'name' => 'Updated Provider',
                    'estimated' => 999,
                    'products' => [
                        [
                            'sync_id' => $productSyncId,
                            'supplier_product_id' => (string) $this->supplierProductSyncId,
                            'product_name' => 'Provider Product Updated',
                            'product_price' => 80,
                            'quantity' => 3,
                        ],
                    ],
                ],
            ],
        ], $this->user->id);

        $this->assertEmpty(
            $updated['conflicts'],
            'Editing a budget provider created by the same client must not raise a conflict: '.json_encode($updated['conflicts'])
        );

        // Verify base_data is updated with new version.
        $providerMeta = $providerMeta->fresh();
        $this->assertNotNull($providerMeta->base_data);
        $baseData = $providerMeta->base_data;
        $this->assertArrayHasKey('_version', $baseData);
        $this->assertEquals(2, $baseData['_version']);
        $this->assertEquals('Updated Provider', $baseData['name']);
    }

    /**
     * RecurringRecord: create -> update round-trip must not conflict and base_data
     * must be stored with _version.
     */
    public function test_recurring_record_create_then_update_no_conflict_and_base_stored(): void
    {
        $recordSyncId = 'sync-rr-mb-1';
        $productSyncId = 'sync-rrp-mb-1';

        // Create through merge.
        $created = $this->orchestrator->merge([
            'recurring_record' => [
                [
                    'id' => $recordSyncId,
                    'name' => 'Monthly Bill',
                    'type' => 'cargo',
                    'entry_type' => 'egreso',
                    'amount' => 200,
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
            ],
        ], $this->user->id);

        $this->assertArrayHasKey('recurring_record', $created['created']);
        $this->assertEmpty($created['conflicts']);

        // Verify base_data is stored for recurring record.
        $recordMeta = SyncMetadata::where('entity_type', 'recurring_record')
            ->where('entity_id', $recordSyncId)
            ->where('user_id', $this->user->id)
            ->first();
        $this->assertNotNull($recordMeta);
        $this->assertNotNull($recordMeta->base_data);
        $baseData = $recordMeta->base_data;
        $this->assertArrayHasKey('_version', $baseData);
        $this->assertEquals(1, $baseData['_version']);
        $this->assertArrayHasKey('name', $baseData);
        $this->assertEquals('Monthly Bill', $baseData['name']);

        // Verify base_data is stored for recurring record product.
        $productMeta = SyncMetadata::where('entity_type', 'recurring_record_product')
            ->where('entity_id', $productSyncId)
            ->where('user_id', $this->user->id)
            ->first();
        $this->assertNotNull($productMeta);
        $this->assertNotNull($productMeta->base_data);
        $productBaseData = $productMeta->base_data;
        $this->assertArrayHasKey('_version', $productBaseData);
        $this->assertEquals(1, $productBaseData['_version']);
        $this->assertArrayHasKey('product_name', $productBaseData);
        $this->assertEquals('RR Product', $productBaseData['product_name']);

        // Update through merge (same client editing its own row).
        $updated = $this->orchestrator->merge([
            'recurring_record' => [
                [
                    'id' => $recordSyncId,
                    'name' => 'Updated Monthly Bill',
                    'amount' => 300,
                    'products' => [
                        [
                            'sync_id' => $productSyncId,
                            'supplier_product_id' => (string) $this->supplierProductSyncId,
                            'product_name' => 'RR Product Updated',
                            'product_price' => 55,
                            'quantity' => 4,
                        ],
                    ],
                ],
            ],
        ], $this->user->id);

        $this->assertEmpty(
            $updated['conflicts'],
            'Editing a recurring record created by the same client must not raise a conflict: '.json_encode($updated['conflicts'])
        );

        // Verify base_data is updated with new version.
        $recordMeta = $recordMeta->fresh();
        $this->assertNotNull($recordMeta->base_data);
        $baseData = $recordMeta->base_data;
        $this->assertArrayHasKey('_version', $baseData);
        $this->assertEquals(2, $baseData['_version']);
        $this->assertEquals('Updated Monthly Bill', $baseData['name']);
    }
}
